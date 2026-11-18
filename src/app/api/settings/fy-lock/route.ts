import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { AccountType, VoucherType } from "@prisma/client";

export async function GET() {
  try {
    const financialYears = await prisma.financialYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        voucherSequences: true,
      },
    });

    return NextResponse.json({ success: true, financialYears });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, isLocked } = body;

    if (action === "TOGGLE_LOCK") {
      if (!id) {
        return NextResponse.json({ success: false, error: "Financial Year ID is required." }, { status: 400 });
      }

      const updated = await prisma.financialYear.update({
        where: { id },
        data: { isLocked: Boolean(isLocked) },
      });

      return NextResponse.json({
        success: true,
        message: `Financial Year ${updated.name} is now ${updated.isLocked ? "LOCKED" : "UNLOCKED"}.`,
        financialYear: updated,
      });
    }

    if (action === "CLOSE_YEAR") {
      if (!id) {
        return NextResponse.json({ success: false, error: "Active Financial Year ID is required." }, { status: 400 });
      }

      const currentFy = await prisma.financialYear.findUniqueOrThrow({
        where: { id },
      });

      if (currentFy.isClosed) {
        return NextResponse.json(
          { success: false, error: `Financial Year ${currentFy.name} is already closed.` },
          { status: 400 }
        );
      }

      const defaultUser = await prisma.user.findFirstOrThrow();

      // Calculate total Income and total Expense
      const incomeAccounts = await prisma.account.findMany({ where: { type: AccountType.INCOME } });
      const expenseAccounts = await prisma.account.findMany({ where: { type: AccountType.EXPENSE } });

      let totalIncome = new Decimal(0);
      for (const a of incomeAccounts) {
        totalIncome = totalIncome.plus(toDecimal(a.currentBalance));
      }

      let totalExpense = new Decimal(0);
      for (const a of expenseAccounts) {
        totalExpense = totalExpense.plus(toDecimal(a.currentBalance));
      }

      const netSurplus = totalIncome.minus(totalExpense);

      // Retained Earnings Account (code 3020)
      const retainedEarnings = await prisma.account.findUnique({
        where: { code: "3020" },
      });

      // Close current year
      await prisma.financialYear.update({
        where: { id: currentFy.id },
        data: {
          isClosed: true,
          isLocked: true,
          isCurrent: false,
        },
      });

      // Transfer Net Profit/Loss to Retained Earnings if non-zero
      if (retainedEarnings && !netSurplus.isZero()) {
        const curBal = toDecimal(retainedEarnings.currentBalance);
        await prisma.account.update({
          where: { id: retainedEarnings.id },
          data: {
            currentBalance: curBal.plus(netSurplus).toFixed(2),
          },
        });
      }

      // Next Financial Year
      const nextFyName = "2027-28";
      let nextFy = await prisma.financialYear.findUnique({
        where: { name: nextFyName },
      });

      if (!nextFy) {
        nextFy = await prisma.financialYear.create({
          data: {
            name: nextFyName,
            startDate: new Date("2027-04-01T00:00:00.000Z"),
            endDate: new Date("2028-03-31T23:59:59.999Z"),
            isCurrent: true,
            isLocked: false,
            isClosed: false,
          },
        });

        // Initialize sequences for next year
        const seqTypes = [
          { type: "INVOICE", prefix: "SR/27-28/", next: 1 },
          { type: "RECEIPT", prefix: "REC/27-28/", next: 1 },
          { type: "PAYMENT", prefix: "PAY/27-28/", next: 1 },
          { type: "JOURNAL_VOUCHER", prefix: "JV/27-28/", next: 1 },
          { type: "EXPENSE", prefix: "EXP/27-28/", next: 1 },
          { type: "CREDIT_NOTE", prefix: "CN/27-28/", next: 1 },
          { type: "DEBIT_NOTE", prefix: "DN/27-28/", next: 1 },
        ];

        for (const s of seqTypes) {
          await prisma.voucherSequence.create({
            data: {
              financialYearId: nextFy.id,
              voucherType: s.type,
              prefix: s.prefix,
              nextNumber: s.next,
              paddingLength: 4,
            },
          });
        }
      } else {
        await prisma.financialYear.update({
          where: { id: nextFy.id },
          data: { isCurrent: true },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Financial Year ${currentFy.name} closed successfully. Active year is now ${nextFyName}.`,
        closedYear: currentFy.name,
        activeYear: nextFyName,
        netSurplusTransferred: netSurplus.toFixed(2),
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
