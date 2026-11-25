import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";
import { syncLinkedCashBookForPaidRun } from "@/lib/payrollAttendanceSync";

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
      return NextResponse.json({ success: false, error: "Payroll item not found" }, { status: 404 });
    }

    const employeeName = body.employeeName !== undefined ? String(body.employeeName).trim() : existing.employeeName;
    const totalWorkingDays = body.totalWorkingDays !== undefined ? Number(body.totalWorkingDays) : existing.totalWorkingDays;
    const daysPresent = body.daysPresent !== undefined ? Number(body.daysPresent) : existing.daysPresent;
    const leaveDays =
      body.leaveDays !== undefined
        ? Number(body.leaveDays)
        : Math.max(0, Math.round((totalWorkingDays - daysPresent) * 100) / 100);
    const baseRate = body.baseRate !== undefined ? Number(body.baseRate) : existing.baseRate;

    let grossSalary = existing.grossSalary;
    if (body.grossSalary !== undefined) {
      grossSalary = Number(body.grossSalary);
    } else if (body.daysPresent !== undefined || body.baseRate !== undefined || body.totalWorkingDays !== undefined) {
      grossSalary =
        existing.category === "OFFICE"
          ? baseRate <= 2500
            ? Math.round(baseRate * daysPresent)
            : Math.round((baseRate / (totalWorkingDays || 26)) * daysPresent)
          : Math.round(baseRate * daysPresent);
    }

    const otAndIncentive = body.otAndIncentive !== undefined ? Number(body.otAndIncentive) : existing.otAndIncentive;
    const nightDutyAmount = body.nightDutyAmount !== undefined ? Number(body.nightDutyAmount) : existing.nightDutyAmount;
    const vehicleAllowance = body.vehicleAllowance !== undefined ? Number(body.vehicleAllowance) : existing.vehicleAllowance;
    const lastMonthBalance = body.lastMonthBalance !== undefined ? Number(body.lastMonthBalance) : existing.lastMonthBalance;
    const advanceDeduction = body.advanceDeduction !== undefined ? Number(body.advanceDeduction) : existing.advanceDeduction;
    const expenseBalanceDeduction =
      body.expenseBalanceDeduction !== undefined
        ? Number(body.expenseBalanceDeduction)
        : existing.expenseBalanceDeduction;

    const netSalary = Math.round(
      grossSalary +
        otAndIncentive +
        nightDutyAmount +
        vehicleAllowance +
        lastMonthBalance -
        advanceDeduction -
        expenseBalanceDeduction
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
        employeeName,
        totalWorkingDays,
        daysPresent,
        leaveDays,
        baseRate,
        grossSalary,
        otAndIncentive,
        nightDutyAmount,
        vehicleAllowance,
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
        designation: body.designation !== undefined ? body.designation : existing.designation,
        joiningDate: body.joiningDate !== undefined ? body.joiningDate : existing.joiningDate,
        location: body.location !== undefined ? body.location : existing.location,
        state: body.state !== undefined ? body.state : existing.state,
        mobileNo: body.mobileNo !== undefined ? body.mobileNo : existing.mobileNo,
        aadhaarNo: body.aadhaarNo !== undefined ? body.aadhaarNo : existing.aadhaarNo,
        bankName: body.bankName !== undefined ? body.bankName : existing.bankName,
        accountNo: body.accountNo !== undefined ? body.accountNo : existing.accountNo,
      },
    });

    const updatedRun = await recalculatePayrollRunTotals(existing.payrollRunId, prisma as any);
    if (existing.payrollRun.status === "PAID") {
      await syncLinkedCashBookForPaidRun(existing.payrollRunId);
    }

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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollRun: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Payroll item not found" }, { status: 404 });
    }

    await prisma.payrollItem.delete({ where: { id } });
    const updatedRun = await recalculatePayrollRunTotals(existing.payrollRunId, prisma as any);
    if (existing.payrollRun.status === "PAID") {
      await syncLinkedCashBookForPaidRun(existing.payrollRunId);
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[DELETE /api/payroll/items/[id]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete payroll item" },
      { status: 500 }
    );
  }
}
