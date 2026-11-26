import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollRun: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Payroll item not found" }, { status: 404 });
    }

    const paidCash = body.paidCash !== undefined ? Number(body.paidCash) : existing.paidCash;
    const paidBankOrGpay = body.paidBankOrGpay !== undefined ? Number(body.paidBankOrGpay) : existing.paidBankOrGpay;
    const paidGpay = body.paidGpay !== undefined ? Number(body.paidGpay) : (existing.paidGpay || 0);
    const gpayWallet = body.gpayWallet || existing.gpayWallet || "Office Gpay";
    const paymentRef = body.paymentRef !== undefined ? (body.paymentRef ? String(body.paymentRef).trim() : null) : existing.paymentRef;
    const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();
    const paymentReason =
      body.paymentReason !== undefined
        ? body.paymentReason
          ? String(body.paymentReason).trim()
          : null
        : existing.paymentReason;

    const totalPaid = Math.round((paidCash + paidBankOrGpay + paidGpay) * 100) / 100;
    const carryForwardBalance = Math.round((existing.netSalary - totalPaid) * 100) / 100;

    const paymentStatus =
      totalPaid >= existing.netSalary && existing.netSalary > 0
        ? "PAID"
        : totalPaid > 0
        ? "PARTIAL"
        : "UNPAID";

    const paymentChannel =
      paidBankOrGpay > 0 && paidCash === 0 && paidGpay === 0
        ? "ICICI"
        : paidGpay > 0 && paidCash === 0 && paidBankOrGpay === 0
        ? "OFFICE_GPAY"
        : paidCash > 0 && paidBankOrGpay === 0 && paidGpay === 0
        ? "CASH"
        : existing.paymentChannel;

    const updatedItem = await prisma.payrollItem.update({
      where: { id },
      data: {
        paidCash,
        paidBankOrGpay,
        paidGpay,
        gpayWallet,
        paymentRef,
        paidDate,
        paymentReason,
        paymentChannel,
        carryForwardBalance,
        paymentStatus,
        isCleared: paymentStatus === "PAID",
      },
    });

    // Post or update CashBookEntry for each funded wallet so Bank Statement & Cash Book match 1:1
    const fy = await prisma.financialYear.findFirst({ orderBy: { startDate: "desc" } });
    const sysUser =
      (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })) ||
      (await prisma.user.findFirst());

    if (fy && sysUser) {
      const isOffice = existing.category === "OFFICE" || existing.payrollRun.cycleType === "MONTHLY_OFFICE";
      const category = isOffice ? "Employee Salary" : "Labour Wages";
      const refSuffix = paymentRef ? ` [Ref: ${paymentRef}]` : "";
      const legs: Array<{ wallet: string; amount: number; tag: string }> = [
        { wallet: "Office Cash", amount: paidCash, tag: "CASH" },
        { wallet: "ICICI", amount: paidBankOrGpay, tag: "BANK" },
        { wallet: gpayWallet, amount: paidGpay, tag: "GPAY" },
      ];

      for (const leg of legs) {
        if (leg.amount <= 0) continue;
        const voucherNumber = `CP/PAY/${existing.payrollRun.month.replace("-", "")}/${existing.id.slice(-5).toUpperCase()}-${leg.tag}`;
        const purpose = `${category} - ${existing.employeeName} (${existing.payrollRun.month})${refSuffix}`;

        await prisma.cashBookEntry.upsert({
          where: { voucherNumber },
          update: {
            date: paidDate,
            amount: leg.amount,
            purpose,
            walletName: leg.wallet,
            counterpartyName: existing.employeeName,
          },
          create: {
            voucherNumber,
            date: paidDate,
            type: "CASH_OUTFLOW",
            amount: leg.amount,
            purpose,
            category,
            walletName: leg.wallet,
            counterpartyName: existing.employeeName,
            isOfficeExpense: isOffice,
            financialYearId: fy.id,
            createdById: sysUser.id,
          },
        });
      }
    }

    const updatedRun = await recalculatePayrollRunTotals(existing.payrollRunId, prisma as any);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/items/[id]/mark-paid]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark payroll item as paid" },
      { status: 500 }
    );
  }
}
