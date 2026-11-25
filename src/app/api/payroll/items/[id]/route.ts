import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
      return NextResponse.json(
        { success: false, error: "Payroll item not found" },
        { status: 404 }
      );
    }

    const totalWorkingDays = body.totalWorkingDays !== undefined ? Number(body.totalWorkingDays) : existing.totalWorkingDays;
    const daysPresent = body.daysPresent !== undefined ? Number(body.daysPresent) : existing.daysPresent;
    const baseRate = body.baseRate !== undefined ? Number(body.baseRate) : existing.baseRate;

    let grossSalary = existing.grossSalary;
    if (body.grossSalary !== undefined) {
      grossSalary = Number(body.grossSalary);
    } else if (body.daysPresent !== undefined || body.baseRate !== undefined || body.totalWorkingDays !== undefined) {
      grossSalary =
        existing.category === "OFFICE"
          ? Math.round((baseRate / (totalWorkingDays || 26)) * daysPresent)
          : Math.round(baseRate * daysPresent);
    }

    const otAndIncentive = body.otAndIncentive !== undefined ? Number(body.otAndIncentive) : existing.otAndIncentive;
    const nightDutyAmount = body.nightDutyAmount !== undefined ? Number(body.nightDutyAmount) : existing.nightDutyAmount;
    const lastMonthBalance = body.lastMonthBalance !== undefined ? Number(body.lastMonthBalance) : existing.lastMonthBalance;
    const advanceDeduction = body.advanceDeduction !== undefined ? Number(body.advanceDeduction) : existing.advanceDeduction;
    const expenseBalanceDeduction =
      body.expenseBalanceDeduction !== undefined
        ? Number(body.expenseBalanceDeduction)
        : existing.expenseBalanceDeduction;

    const netSalary = Math.round(
      grossSalary + otAndIncentive + nightDutyAmount + lastMonthBalance - advanceDeduction - expenseBalanceDeduction
    );

    const paidCash = body.paidCash !== undefined ? Number(body.paidCash) : existing.paidCash;
    const paidBankOrGpay = body.paidBankOrGpay !== undefined ? Number(body.paidBankOrGpay) : existing.paidBankOrGpay;
    const carryForwardBalance = Math.round((netSalary - (paidCash + paidBankOrGpay)) * 100) / 100;
    const paymentChannel = body.paymentChannel !== undefined ? String(body.paymentChannel) : existing.paymentChannel;
    const isCleared =
      body.isCleared !== undefined
        ? Boolean(body.isCleared)
        : paidCash + paidBankOrGpay > 0 && Math.abs(carryForwardBalance) < 1;
    const notes = body.notes !== undefined ? (body.notes ? String(body.notes) : null) : existing.notes;

    const updatedItem = await prisma.payrollItem.update({
      where: { id },
      data: {
        totalWorkingDays,
        daysPresent,
        baseRate,
        grossSalary,
        otAndIncentive,
        nightDutyAmount,
        lastMonthBalance,
        advanceDeduction,
        expenseBalanceDeduction,
        netSalary,
        paidCash,
        paidBankOrGpay,
        paymentChannel,
        carryForwardBalance,
        isCleared,
        notes,
      },
    });

    // Recalculate parent PayrollRun totals
    const allItems = await prisma.payrollItem.findMany({
      where: { payrollRunId: existing.payrollRunId },
    });

    const runTotals = {
      totalGross: Math.round(allItems.reduce((s, it) => s + it.grossSalary, 0) * 100) / 100,
      totalDeductions:
        Math.round(allItems.reduce((s, it) => s + it.advanceDeduction + it.expenseBalanceDeduction, 0) * 100) / 100,
      totalNet: Math.round(allItems.reduce((s, it) => s + it.netSalary, 0) * 100) / 100,
      paidCash: Math.round(allItems.reduce((s, it) => s + it.paidCash, 0) * 100) / 100,
      paidBank: Math.round(allItems.reduce((s, it) => s + it.paidBankOrGpay, 0) * 100) / 100,
    };

    const updatedRun = await prisma.payrollRun.update({
      where: { id: existing.payrollRunId },
      data: runTotals,
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[PATCH /api/payroll/items/[id]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update payroll item" },
      { status: 500 }
    );
  }
}
