import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeCashBookWalletName,
  recalculatePayrollRunTotals,
  removePayrollItemCashBookLegs,
  syncPayrollItemCashBookLegs,
} from "@/lib/payrollTotals";
import { computeGrossForCycle, syncLinkedCashBookForPaidRun } from "@/lib/payrollAttendanceSync";
import { getActiveTenantContext } from "@/lib/tenant";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollRun: true },
    });

    if (!existing || existing.payrollRun.companyId !== tenant.companyId) {
      return NextResponse.json({ success: false, error: "Payroll item not found in active organization" }, { status: 404 });
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
      grossSalary = computeGrossForCycle(
        existing.category === "OFFICE",
        baseRate,
        daysPresent,
        totalWorkingDays
      );
    }

    const otAndIncentive = body.otAndIncentive !== undefined ? Number(body.otAndIncentive) : existing.otAndIncentive;
    const performanceIncentive =
      body.performanceIncentive !== undefined
        ? Number(body.performanceIncentive)
        : (existing.performanceIncentive || 0);
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
        performanceIncentive +
        nightDutyAmount +
        vehicleAllowance +
        lastMonthBalance -
        advanceDeduction -
        expenseBalanceDeduction
    );

    const paidCash = body.paidCash !== undefined ? (Number(body.paidCash) || 0) : existing.paidCash;
    const paidBankOrGpay = body.paidBankOrGpay !== undefined ? (Number(body.paidBankOrGpay) || 0) : existing.paidBankOrGpay;
    const paidGpay = body.paidGpay !== undefined ? (Number(body.paidGpay) || 0) : (existing.paidGpay || 0);
    const gpayWallet =
      body.gpayWallet !== undefined
        ? normalizeCashBookWalletName(body.gpayWallet)
        : existing.gpayWallet;
    const totalPaid = Math.round((paidCash + paidBankOrGpay + paidGpay) * 100) / 100;
    const carryForwardBalance = Math.round((netSalary - totalPaid) * 100) / 100;

    const derivedChannel =
      paidBankOrGpay > 0 && paidCash === 0 && paidGpay === 0
        ? existing.paymentChannel === "RBL"
          ? "RBL"
          : "ICICI"
        : paidGpay > 0 && paidCash === 0 && paidBankOrGpay === 0
        ? "OFFICE_GPAY"
        : paidCash > 0 && paidBankOrGpay === 0 && paidGpay === 0
        ? "CASH"
        : existing.paymentChannel;

    const paymentChannel = body.paymentChannel !== undefined ? String(body.paymentChannel) : derivedChannel;
    const paymentReason = body.paymentReason !== undefined ? (body.paymentReason ? String(body.paymentReason) : null) : existing.paymentReason;
    const paymentRef = body.paymentRef !== undefined ? (body.paymentRef ? String(body.paymentRef).trim() : null) : existing.paymentRef;

    const paymentFieldsTouched =
      body.paidCash !== undefined ||
      body.paidBankOrGpay !== undefined ||
      body.paidGpay !== undefined ||
      body.gpayWallet !== undefined ||
      body.paymentChannel !== undefined ||
      body.paymentRef !== undefined ||
      body.paidDate !== undefined;

    const paidDate =
      body.paidDate !== undefined
        ? body.paidDate
          ? new Date(body.paidDate)
          : null
        : paymentFieldsTouched && totalPaid > 0
        ? existing.paidDate || new Date()
        : existing.paidDate;

    const computedStatus =
      totalPaid >= netSalary && (netSalary > 0 || totalPaid > 0)
        ? "PAID"
        : totalPaid > 0
        ? "PARTIAL"
        : "UNPAID";

    const paymentStatus =
      body.paymentStatus === "HOLD"
        ? "HOLD"
        : paymentFieldsTouched
        ? computedStatus
        : body.paymentStatus !== undefined
        ? String(body.paymentStatus)
        : computedStatus;

    const isCleared =
      body.isCleared !== undefined && !paymentFieldsTouched
        ? Boolean(body.isCleared)
        : paymentStatus === "PAID";
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
        performanceIncentive,
        nightDutyAmount,
        vehicleAllowance,
        lastMonthBalance,
        advanceDeduction,
        expenseBalanceDeduction,
        netSalary,
        paidCash,
        paidBankOrGpay,
        paidGpay,
        gpayWallet,
        paymentChannel,
        paymentStatus,
        paymentReason,
        paymentRef,
        paidDate,
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

    if (paymentFieldsTouched || existing.payrollRun.status === "PAID") {
      await syncPayrollItemCashBookLegs(prisma as any, updatedItem, existing.payrollRun, {
        bankWallet: body.bankWallet,
        gpayWallet,
        syncToCashBook: body.syncToCashBook !== false,
      });
    }

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
    const tenant = await getActiveTenantContext();
    const { id } = await context.params;
    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollRun: true },
    });

    if (!existing || existing.payrollRun.companyId !== tenant.companyId) {
      return NextResponse.json({ success: false, error: "Payroll item not found in active organization" }, { status: 404 });
    }

    await removePayrollItemCashBookLegs(prisma as any, existing.payrollRun.month, existing.id);
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
