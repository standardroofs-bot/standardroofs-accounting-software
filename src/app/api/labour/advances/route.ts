import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";
import { getActiveTenantContext } from "@/lib/tenant";

export async function POST(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const body = await request.json();
    const { employeeId, amount: amountStr, purpose, date } = body;

    const amount = toDecimal(amountStr);
    if (!employeeId || amount.lessThanOrEqualTo(0) || !purpose) {
      return NextResponse.json(
        { success: false, error: "Employee, Amount, and Purpose are required." },
        { status: 400 }
      );
    }

    const employee = await prisma.employeeOrLabour.findFirst({
      where: { id: employeeId, companyId: tenant.companyId },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found in active organization." }, { status: 404 });
    }
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    // Accounts
    const advanceControlAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1050" } }); // Labour Advance Control A/c
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } }); // Cash in Hand

    const voucherInfo = await getNextVoucherNumber(fy.id, "CASH_PAYMENT");

    // Double-Entry:
    // Debit: Labour Advance Control A/c (1050)
    // Credit: Cash in Hand (1010)
    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.PAYMENT,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: date ? new Date(date) : new Date(),
      narration: `Cash Advance to Labourer: ${employee.name} (${employee.employeeCode}) - ${purpose}`,
      createdById: tenant.userId,
      lines: [
        {
          accountId: advanceControlAccount.id,
          debit: amount,
          credit: 0,
          narration: `Cash advance: ${purpose}`,
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: amount,
          narration: `Cash payout to ${employee.name}`,
        },
      ],
    });

    const advance = await prisma.labourAdvance.create({
      data: {
        employeeId: employee.id,
        date: date ? new Date(date) : new Date(),
        amount: amount.toFixed(2),
        purpose,
        status: "OUTSTANDING",
        journalEntryId: journalEntry.id,
      },
    });

    // Update Employee advance balance
    await prisma.employeeOrLabour.update({
      where: { id: employee.id },
      data: {
        cashAdvanceBalance: toDecimal(employee.cashAdvanceBalance).plus(amount).toFixed(2),
      },
    });

    return NextResponse.json({ success: true, advance, journalEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
