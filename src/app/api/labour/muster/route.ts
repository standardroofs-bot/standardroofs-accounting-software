import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      periodStart,
      periodEnd,
      daysWorked = 15,
      overtimeHours = 0,
      grossWage: grossWageStr,
      advanceDeduction: advanceDeductionStr = 0,
      paymentMode = "CASH",
    } = body;

    const employee = await prisma.employeeOrLabour.findUniqueOrThrow({ where: { id: employeeId } });
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    const grossWage = toDecimal(grossWageStr || employee.baseWage);
    const advanceDeduction = toDecimal(advanceDeductionStr);
    const netPayout = grossWage.minus(advanceDeduction);

    if (netPayout.lessThan(0)) {
      return NextResponse.json({ success: false, error: "Advance deduction cannot exceed gross wage." }, { status: 400 });
    }

    // Accounts
    const labourExpenseAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5030" } }); // Labour & Workmanship Charges
    const advanceControlAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1050" } }); // Labour Advance Control A/c
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
    const bankAccount = await prisma.bankAccount.findFirst({ where: { accountNumber: "50200012345678" } });

    const payoutAccountId = paymentMode === "BANK" && bankAccount ? bankAccount.accountId : cashAccount.id;

    const voucherSeqType = paymentMode === "BANK" ? "BANK_PAYMENT" : "CASH_PAYMENT";
    const voucherInfo = await getNextVoucherNumber(fy.id, voucherSeqType);

    // Prepare Double-Entry:
    // Debit: Labour & Workmanship Charges (5030) for gross wage
    // Credit: Labour Advance Control A/c (1050) for advance deduction (recovering advance)
    // Credit: Cash in Hand (1010) or Bank for net payout
    const journalLines: any[] = [
      {
        accountId: labourExpenseAccount.id,
        debit: grossWage,
        credit: 0,
        narration: `15-day muster wages for ${employee.name} (${daysWorked} days worked)`,
      },
    ];

    if (advanceDeduction.greaterThan(0)) {
      journalLines.push({
        accountId: advanceControlAccount.id,
        debit: 0,
        credit: advanceDeduction,
        narration: `Advance recovery from 15-day wage for ${employee.name}`,
      });
    }

    if (netPayout.greaterThan(0)) {
      journalLines.push({
        accountId: payoutAccountId,
        debit: 0,
        credit: netPayout,
        narration: `Net wage payout to ${employee.name} via ${paymentMode}`,
      });
    }

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.PAYMENT,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: new Date(),
      narration: `15-Day Labour Muster Payout: ${employee.name} (${employee.employeeCode})`,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Record Muster
    const muster = await prisma.labourMuster.create({
      data: {
        employeeId: employee.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        daysWorked: toDecimal(daysWorked).toFixed(2),
        overtimeHours: toDecimal(overtimeHours).toFixed(2),
        grossWage: grossWage.toFixed(2),
        advanceDeduction: advanceDeduction.toFixed(2),
        netPayout: netPayout.toFixed(2),
        paymentMode,
        status: "PAID",
        payoutDate: new Date(),
        journalEntryId: journalEntry.id,
      },
    });

    // Update Employee advance balance
    const currentAdv = toDecimal(employee.cashAdvanceBalance);
    const newAdv = currentAdv.minus(advanceDeduction).greaterThan(0) ? currentAdv.minus(advanceDeduction) : new Decimal(0);

    await prisma.employeeOrLabour.update({
      where: { id: employee.id },
      data: {
        cashAdvanceBalance: newAdv.toFixed(2),
      },
    });

    return NextResponse.json({ success: true, muster, journalEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
