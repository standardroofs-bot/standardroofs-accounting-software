import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextVoucherNumber, postDoubleEntryTransaction } from "@/lib/accounting";
import { requireAuthorizedSession } from "@/lib/rbac";
import { VoucherType, CashFlowType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthorizedSession("labour", "APPROVE");
    if (auth.error) return auth.error;

    const body = await req.json();
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json(
        { success: false, error: "payrollRunId is required" },
        { status: 400 }
      );
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { items: true },
    });

    if (!run) {
      return NextResponse.json(
        { success: false, error: "Payroll run not found" },
        { status: 404 }
      );
    }

    const session = auth.session;
    const approvedByName = session.name || "Prabhakaran T";

    // Sum paid cash and paid bank + GPay
    const totalCash = Math.round(run.items.reduce((s, it) => s + it.paidCash, 0) * 100) / 100;
    const totalBank = Math.round(run.items.reduce((s, it) => s + it.paidBankOrGpay + (it.paidGpay || 0), 0) * 100) / 100;
    const totalDisbursed = totalCash + totalBank > 0 ? totalCash + totalBank : run.totalNet;

    // Attempt double-entry & CashBook posting if FinancialYear & Accounts exist
    let postedVoucher: string | null = null;
    try {
      const fy = await prisma.financialYear.findFirst({
        where: { isCurrent: true },
      }) || await prisma.financialYear.findFirst();

      const adminUser =
        (session?.userId ? await prisma.user.findUnique({ where: { id: session.userId } }) : null) ||
        (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })) ||
        (await prisma.user.findFirst());

      if (fy && adminUser && totalDisbursed > 0) {
        const isOffice = run.cycleType === "MONTHLY_OFFICE";
        const expenseCategory = isOffice ? "Employee Salary" : "Labour Wages";

        // Find expense account + cash/bank accounts
        const expenseAcc =
          (await prisma.account.findFirst({
            where: {
              name: { contains: isOffice ? "Salary" : "Wages", mode: "insensitive" },
              type: "EXPENSE",
            },
          })) ||
          (await prisma.account.findFirst({ where: { type: "EXPENSE" } }));

        const cashAcc = await prisma.account.findFirst({
          where: { subType: "CASH" },
        });
        const bankAcc = await prisma.account.findFirst({
          where: { subType: "BANK" },
        });

        const cashAmount = totalCash > 0 ? totalCash : totalBank === 0 ? totalDisbursed : 0;
        const bankAmount = totalBank;

        if (expenseAcc && (cashAcc || bankAcc)) {
          const lines: any[] = [
            {
              accountId: expenseAcc.id,
              debit: cashAmount + bankAmount,
              credit: 0,
              narration: `${expenseCategory} for ${run.month} (${run.halfPeriod})`,
            },
          ];

          if (cashAmount > 0 && cashAcc) {
            lines.push({
              accountId: cashAcc.id,
              debit: 0,
              credit: cashAmount,
              narration: `Cash payout - ${expenseCategory}`,
            });
          } else if (cashAmount > 0 && bankAcc) {
            lines.push({
              accountId: bankAcc.id,
              debit: 0,
              credit: cashAmount,
              narration: `Payout - ${expenseCategory}`,
            });
          }

          if (bankAmount > 0 && bankAcc) {
            lines.push({
              accountId: bankAcc.id,
              debit: 0,
              credit: bankAmount,
              narration: `ICICI/GPay payout - ${expenseCategory}`,
            });
          } else if (bankAmount > 0 && cashAcc) {
            lines.push({
              accountId: cashAcc.id,
              debit: 0,
              credit: bankAmount,
              narration: `Payout - ${expenseCategory}`,
            });
          }

          const je = await postDoubleEntryTransaction({
            voucherType: VoucherType.STAFF_PAYROLL,
            financialYearId: fy.id,
            date: new Date(),
            narration: `${expenseCategory} Payroll Run (${run.cycleType} • ${run.month} • ${run.halfPeriod})`,
            referenceNumber: `PAY-${run.month}-${run.halfPeriod}`,
            createdById: adminUser.id,
            lines,
          });
          postedVoucher = je.entryNumber;

          // Record CashBookEntry for Cash portion
          if (cashAmount > 0) {
            const { voucherNumber } = await getNextVoucherNumber(fy.id, "CASH_PAYMENT");
            await prisma.cashBookEntry.create({
              data: {
                voucherNumber,
                date: new Date(),
                type: CashFlowType.CASH_OUTFLOW,
                amount: cashAmount,
                purpose: `${expenseCategory} (${run.month} ${run.halfPeriod})`,
                category: expenseCategory,
                counterpartyName: `${run.items.length} Staff/Labours`,
                isOfficeExpense: isOffice,
                financialYearId: fy.id,
                createdById: adminUser.id,
              },
            });
          }
        }
      }
    } catch (ledgerErr) {
      console.warn("[Payroll Approve] Ledger posting skipped/warn:", ledgerErr);
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: "PAID",
        approvedBy: approvedByName,
        approvedAt: new Date(),
        paidCash: totalCash,
        paidBank: totalBank,
      },
      include: {
        items: { orderBy: { employeeName: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      run: updatedRun,
      postedVoucher,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/approve]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve payroll" },
      { status: 500 }
    );
  }
}
