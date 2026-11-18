import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contractorId,
      projectId,
      milestoneType, // STAGE_10_ADVANCE, STAGE_40_PROGRESS, STAGE_75_STRUCTURE, STAGE_100_COMPLETION
      milestonePercentage,
      milestoneAmount: amountStr,
      tdsRate = 1.00, // 1% Individual/HUF, 2% Company/Firm u/s 194C
      workStageDescription,
      certifiedBy,
      autoApprove = true,
    } = body;

    if (!contractorId || !projectId || !milestoneType || !amountStr || !workStageDescription) {
      return NextResponse.json(
        { success: false, error: "Contractor, Project, Milestone Stage, Amount and Description are required." },
        { status: 400 }
      );
    }

    const contractor = await prisma.contractor.findUniqueOrThrow({ where: { id: contractorId } });
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    const grossAmount = toDecimal(amountStr);
    const rate = toDecimal(tdsRate);
    const tdsAmount = grossAmount.times(rate).dividedBy(100).toDecimalPlaces(2);
    const netPayable = grossAmount.minus(tdsAmount);

    let journalEntryId: string | null = null;

    if (autoApprove) {
      // Accounts
      const labourExpenseAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5030" } }); // Labour & Workmanship
      const tdsPayableAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2040" } }); // TDS Payable
      const contractorRetentionAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2020" } }); // Contractor Withholding / Retention

      const voucherInfo = await getNextVoucherNumber(fy.id, "JOURNAL_VOUCHER");

      // Prepare Double-Entry:
      // Debit: Labour & Workmanship Charges (5030) for gross amount
      // Credit: TDS Payable (2040) for TDS u/s 194C
      // Credit: Contractor Retention / Payable (2020) for net payable
      const journalLines: any[] = [
        {
          accountId: labourExpenseAccount.id,
          debit: grossAmount,
          credit: 0,
          narration: `Contractor Milestone (${milestoneType}): ${contractor.name} on ${project.code}`,
          contractorId: contractor.id,
          projectId: project.id,
        },
      ];

      if (tdsAmount.greaterThan(0)) {
        journalLines.push({
          accountId: tdsPayableAccount.id,
          debit: 0,
          credit: tdsAmount,
          narration: `TDS @ ${tdsRate}% u/s 194C on ${contractor.name} Milestone`,
          contractorId: contractor.id,
          projectId: project.id,
        });
      }

      journalLines.push({
        accountId: contractorRetentionAccount.id,
        debit: 0,
        credit: netPayable,
        narration: `Net payable to contractor ${contractor.name} for ${milestoneType}`,
        contractorId: contractor.id,
        projectId: project.id,
      });

      const journalEntry = await postDoubleEntryTransaction({
        voucherType: VoucherType.JOURNAL_VOUCHER,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Contractor Work Stage Bill: ${contractor.name} on ${project.name} (${milestoneType})`,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      journalEntryId = journalEntry.id;
    }

    const milestone = await prisma.contractorMilestone.create({
      data: {
        contractorId,
        projectId,
        milestoneType,
        milestonePercentage: toDecimal(milestonePercentage || 10).toFixed(2),
        milestoneAmount: grossAmount.toFixed(2),
        tdsRate: rate.toFixed(2),
        tdsAmount: tdsAmount.toFixed(2),
        netPayable: netPayable.toFixed(2),
        status: autoApprove ? "APPROVED" : "PENDING",
        workStageDescription,
        certifiedBy: certifiedBy || defaultUser.name,
        approvedDate: autoApprove ? new Date() : null,
        journalEntryId,
      },
      include: { contractor: true, project: true },
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
