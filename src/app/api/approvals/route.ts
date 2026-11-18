import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber, reverseJournalEntry } from "@/lib/accounting";
import { toDecimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET() {
  try {
    const [pendingExpenses, pendingMilestones, pendingReversals] = await Promise.all([
      prisma.expenseClaim.findMany({
        where: { status: "PENDING" },
        include: {
          account: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
          employee: { select: { id: true, name: true, employeeCode: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contractorMilestone.findMany({
        where: { status: "PENDING" },
        include: {
          contractor: { select: { id: true, name: true, specialty: true } },
          project: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.journalEntry.findMany({
        where: { status: "DRAFT" },
        include: {
          lines: {
            include: {
              account: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pendingExpenses,
      pendingMilestones,
      pendingReversals,
      totalPending: pendingExpenses.length + pendingMilestones.length + pendingReversals.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, id, action, rejectionReason } = body;

    if (!type || !id || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (type, id, action)." },
        { status: 400 }
      );
    }

    const defaultUser = await prisma.user.findFirstOrThrow();
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    if (type === "EXPENSE") {
      const claim = await prisma.expenseClaim.findUniqueOrThrow({
        where: { id },
        include: { account: true },
      });

      if (claim.status !== "PENDING") {
        return NextResponse.json(
          { success: false, error: `Expense claim is already ${claim.status}.` },
          { status: 400 }
        );
      }

      if (action === "REJECT") {
        await prisma.expenseClaim.update({
          where: { id },
          data: { status: "REJECTED" },
        });
        return NextResponse.json({ success: true, message: "Expense claim rejected successfully." });
      }

      // Action is APPROVE -> Post double-entry voucher
      const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
      let creditAccountId = cashAccount.id;

      if (claim.paymentMode === "BANK" && claim.bankAccountId) {
        const bank = await prisma.bankAccount.findUnique({ where: { id: claim.bankAccountId } });
        if (bank) creditAccountId = bank.accountId;
      }

      const voucherInfo = await getNextVoucherNumber(fy.id, "EXPENSE");
      const journalEntry = await postDoubleEntryTransaction({
        voucherType: VoucherType.EXPENSE,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Approved Expense [${claim.account.name}]: ${claim.purpose} (Paid via ${claim.paymentMode})`,
        createdById: defaultUser.id,
        lines: [
          {
            accountId: claim.accountId,
            debit: claim.amount,
            credit: 0,
            narration: claim.purpose,
            projectId: claim.projectId || undefined,
            supplierId: claim.supplierId || undefined,
          },
          {
            accountId: creditAccountId,
            debit: 0,
            credit: claim.amount,
            narration: `Fund payout for ${claim.purpose}`,
            projectId: claim.projectId || undefined,
            supplierId: claim.supplierId || undefined,
          },
        ],
      });

      await prisma.expenseClaim.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: defaultUser.id,
          approvedAt: new Date(),
          journalEntryId: journalEntry.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Expense claim approved and journal entry posted successfully.",
        journalEntryId: journalEntry.id,
      });
    }

    if (type === "MILESTONE") {
      const milestone = await prisma.contractorMilestone.findUniqueOrThrow({
        where: { id },
        include: { contractor: true, project: true },
      });

      if (milestone.status !== "PENDING") {
        return NextResponse.json(
          { success: false, error: `Milestone is already ${milestone.status}.` },
          { status: 400 }
        );
      }

      if (action === "REJECT") {
        await prisma.contractorMilestone.update({
          where: { id },
          data: { status: "REJECTED" },
        });
        return NextResponse.json({ success: true, message: "Milestone rejected successfully." });
      }

      // Action is APPROVE -> Post double-entry voucher
      const labourExpenseAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5030" } });
      const tdsPayableAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2040" } });
      const contractorRetentionAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2020" } });

      const voucherInfo = await getNextVoucherNumber(fy.id, "JOURNAL_VOUCHER");

      const journalLines: any[] = [
        {
          accountId: labourExpenseAccount.id,
          debit: milestone.milestoneAmount,
          credit: 0,
          narration: `Contractor Milestone (${milestone.milestoneType}): ${milestone.contractor.name} on ${milestone.project.code}`,
          contractorId: milestone.contractorId,
          projectId: milestone.projectId,
        },
      ];

      if (toDecimal(milestone.tdsAmount).greaterThan(0)) {
        journalLines.push({
          accountId: tdsPayableAccount.id,
          debit: 0,
          credit: milestone.tdsAmount,
          narration: `TDS @ ${milestone.tdsRate}% u/s 194C on ${milestone.contractor.name} Milestone`,
          contractorId: milestone.contractorId,
          projectId: milestone.projectId,
        });
      }

      journalLines.push({
        accountId: contractorRetentionAccount.id,
        debit: 0,
        credit: milestone.netPayable,
        narration: `Net payable to contractor ${milestone.contractor.name} for ${milestone.milestoneType}`,
        contractorId: milestone.contractorId,
        projectId: milestone.projectId,
      });

      const journalEntry = await postDoubleEntryTransaction({
        voucherType: VoucherType.JOURNAL_VOUCHER,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Approved Contractor Work Stage: ${milestone.contractor.name} on ${milestone.project.name} (${milestone.milestoneType})`,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      await prisma.contractorMilestone.update({
        where: { id },
        data: {
          status: "APPROVED",
          certifiedBy: defaultUser.name,
          approvedDate: new Date(),
          journalEntryId: journalEntry.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Contractor milestone approved and posted successfully.",
        journalEntryId: journalEntry.id,
      });
    }

    if (type === "REVERSAL") {
      if (action === "REJECT") {
        await prisma.journalEntry.update({
          where: { id },
          data: { status: "REVERSED" }, // or keep as draft
        });
        return NextResponse.json({ success: true, message: "Reversal draft rejected." });
      }

      // Execute reversal
      const reversed = await reverseJournalEntry(
        id,
        defaultUser.id,
        rejectionReason || "Approved by Managing Director"
      );

      return NextResponse.json({
        success: true,
        message: "Journal reversal posted successfully.",
        entryNumber: reversed.entryNumber,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid type specified." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
