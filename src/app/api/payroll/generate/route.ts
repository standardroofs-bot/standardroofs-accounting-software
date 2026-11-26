import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeAttendanceBreakdownMap,
  computeMonthWorkingDaysInfo,
  getCycleDateRange,
  syncLinkedCashBookForPaidRun,
} from "@/lib/payrollAttendanceSync";

function getPreviousCycle(month: string, halfPeriod: string): { month: string; halfPeriod: string } {
  const [yStr, mStr] = month.split("-");
  let y = Number(yStr);
  let m = Number(mStr);

  if (halfPeriod === "SECOND_HALF") {
    return { month, halfPeriod: "FIRST_HALF" };
  }
  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  const prevMonth = `${y}-${String(m).padStart(2, "0")}`;
  return {
    month: prevMonth,
    halfPeriod: halfPeriod === "FIRST_HALF" ? "SECOND_HALF" : "FULL",
  };
}

function fmtJoining(d: Date | null | undefined): string | null {
  if (!d) return null;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cycleType = body.cycleType || "MONTHLY_OFFICE";
    const month = body.month || "2026-11";
    const halfPeriod = body.halfPeriod || (cycleType === "MONTHLY_OFFICE" ? "FULL" : "FIRST_HALF");
    const customWorkingDays = body.workingDays ? Number(body.workingDays) : null;
    const defaultFullDaysIfNoAttendance = body.defaultFullDaysIfNoAttendance !== false;

    const empCategory =
      cycleType === "MONTHLY_OFFICE"
        ? "OFFICE_STAFF"
        : cycleType === "BI_MONTHLY_TAMIL"
        ? "TAMIL_LABOUR"
        : "HINDI_LABOUR";

    const itemCategory =
      cycleType === "MONTHLY_OFFICE"
        ? "OFFICE"
        : cycleType === "BI_MONTHLY_TAMIL"
        ? "TAMIL_LABOUR"
        : "HINDI_CREW";

    const { start, end, defaultWorkingDays } = getCycleDateRange(month, halfPeriod);
    const monthInfo =
      cycleType === "MONTHLY_OFFICE"
        ? await computeMonthWorkingDaysInfo(month, halfPeriod)
        : null;
    const effectiveDefaultWorkingDays =
      customWorkingDays || monthInfo?.scheduledWorkingDays || defaultWorkingDays;

    const employees = await prisma.employeeOrLabour.findMany({
      where: {
        active: true,
        status: "ACTIVE",
        category: empCategory,
      },
      orderBy: { name: "asc" },
    });

    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    const attByEmp = new Map<string, typeof attendance>();
    for (const rec of attendance) {
      const list = attByEmp.get(rec.employeeId) || [];
      list.push(rec);
      attByEmp.set(rec.employeeId, list);
    }

    const prev = getPreviousCycle(month, halfPeriod);
    const prevRun = await prisma.payrollRun.findUnique({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType,
          month: prev.month,
          halfPeriod: prev.halfPeriod,
          companyFilter: "ALL",
        },
      },
      include: { items: true },
    });

    const prevBalanceMap = new Map<string, number>();
    if (prevRun) {
      for (const it of prevRun.items) {
        if (it.carryForwardBalance !== 0) {
          prevBalanceMap.set(it.employeeId, it.carryForwardBalance);
          prevBalanceMap.set(it.employeeName.toLowerCase().trim(), it.carryForwardBalance);
        }
      }
    }

    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType,
          month,
          halfPeriod,
          companyFilter: "ALL",
        },
      },
      include: { items: true },
    });

    const existingByEmp = new Map(existingRun?.items.map((it) => [it.employeeId, it]) || []);
    const attBreakdownMap = await computeAttendanceBreakdownMap(
      employees.map((e) => e.id),
      month,
      halfPeriod
    );

    const newItems = employees.map((emp) => {
      const recs = attByEmp.get(emp.id) || [];
      const summary = attBreakdownMap.get(emp.id);
      let daysPresent =
        cycleType === "MONTHLY_OFFICE"
          ? summary?.projectedPayableDays ?? 0
          : summary?.markedPayableSoFar ?? 0;
      const dailyAdvSum = summary?.dailyAdvanceSum ?? 0;
      const totalOtHours = summary?.otHours ?? 0;

      const prevIt = existingByEmp.get(emp.id);
      const totalWorkingDays =
        customWorkingDays ||
        (cycleType === "MONTHLY_OFFICE" ? monthInfo?.scheduledWorkingDays : undefined) ||
        prevIt?.totalWorkingDays ||
        effectiveDefaultWorkingDays;

      // For future/unmarked cycles with 0 attendance records, allow full-days planning default
      if (recs.length === 0 && defaultFullDaysIfNoAttendance && !prevIt) {
        daysPresent = totalWorkingDays;
      } else if (recs.length === 0 && prevIt) {
        daysPresent = prevIt.daysPresent;
      }

      const leaveDays = Math.max(0, Math.round((totalWorkingDays - daysPresent) * 100) / 100);

      const baseRate =
        cycleType === "MONTHLY_OFFICE"
          ? Number(emp.monthlySalary || emp.baseWage || 0)
          : Number(emp.dailyWage || emp.baseWage || 0);

      const grossSalary =
        cycleType === "MONTHLY_OFFICE"
          ? baseRate <= 2500
            ? Math.round(baseRate * daysPresent)
            : Math.round((baseRate / (totalWorkingDays || 24)) * daysPresent)
          : Math.round(baseRate * daysPresent);

      const otRatePerHr = cycleType === "MONTHLY_OFFICE" ? Math.round(baseRate / ((totalWorkingDays || 26) * 8)) : Math.round(baseRate / 8);
      const otAndIncentive = prevIt ? prevIt.otAndIncentive : Math.round(totalOtHours * otRatePerHr);
      const nightDutyAmount = prevIt?.nightDutyAmount || 0;
      const vehicleAllowance = prevIt ? prevIt.vehicleAllowance : (emp.defaultVehicleAllowance || 0);
      const lastMonthBalance =
        prevIt?.lastMonthBalance ??
        (prevBalanceMap.get(emp.id) ?? prevBalanceMap.get(emp.name.toLowerCase().trim()) ?? 0);
      const advanceDeduction = prevIt ? prevIt.advanceDeduction : Math.round(dailyAdvSum);
      const expenseBalanceDeduction = prevIt?.expenseBalanceDeduction || 0;

      const netSalary = Math.round(
        grossSalary + otAndIncentive + nightDutyAmount + vehicleAllowance + lastMonthBalance - advanceDeduction - expenseBalanceDeduction
      );

      const paidCash = prevIt?.paidCash || 0;
      const paidBankOrGpay = prevIt?.paidBankOrGpay || 0;
      const carryForwardBalance = Math.round(netSalary - (paidCash + paidBankOrGpay));

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        category: itemCategory,
        company: emp.companyUnit === "INVI_CREATION" ? "INVI_CREATION" : "STANDARD_ROOFS",
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
        paymentChannel: prevIt?.paymentChannel || "CASH",
        carryForwardBalance,
        isCleared: prevIt?.isCleared || false,
        notes: prevIt?.notes || (recs.length > 0 ? `Synced from ${recs.length} attendance records` : "Planned / Default Working Days"),
        designation: emp.designation || emp.role || null,
        joiningDate: fmtJoining(emp.dateOfJoining),
        location: emp.location || "ERODE",
        state: emp.state || "TAMIL NADU",
        mobileNo: emp.phone || null,
        aadhaarNo: emp.aadhaarNumber || null,
        bankName: emp.bankName || null,
        accountNo: emp.bankAccountNo || emp.bankAccountNumber || null,
      };
    });

    const totalGross = newItems.reduce((s, x) => s + x.grossSalary, 0);
    const totalDeductions = newItems.reduce((s, x) => s + x.advanceDeduction + x.expenseBalanceDeduction, 0);
    const totalNet = newItems.reduce((s, x) => s + x.netSalary, 0);
    const paidCash = newItems.reduce((s, x) => s + x.paidCash, 0);
    const paidBank = newItems.reduce((s, x) => s + x.paidBankOrGpay, 0);

    const run = await prisma.payrollRun.upsert({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType,
          month,
          halfPeriod,
          companyFilter: "ALL",
        },
      },
      update: {
        totalGross,
        totalDeductions,
        totalNet,
        paidCash,
        paidBank,
      },
      create: {
        cycleType,
        month,
        halfPeriod,
        companyFilter: "ALL",
        status: "DRAFT",
        totalGross,
        totalDeductions,
        totalNet,
        paidCash,
        paidBank,
      },
    });

    await prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });
    if (newItems.length > 0) {
      await prisma.payrollItem.createMany({
        data: newItems.map((it) => ({ ...it, payrollRunId: run.id })),
      });
    }

    const updated = await prisma.payrollRun.findUnique({
      where: { id: run.id },
      include: { items: { orderBy: { employeeName: "asc" } } },
    });

    if (updated?.status === "PAID") {
      await syncLinkedCashBookForPaidRun(updated.id);
    }

    const empIds = updated ? Array.from(new Set(updated.items.map((it) => it.employeeId).filter(Boolean))) : [];
    const attMap = updated ? await computeAttendanceBreakdownMap(empIds, updated.month, updated.halfPeriod) : new Map();

    return NextResponse.json({
      success: true,
      run: updated
        ? {
            ...updated,
            items: updated.items.map((it) => ({
              ...it,
              attendanceSummary: attMap.get(it.employeeId) || {
                presentCount: 0,
                halfDayCount: 0,
                paidLeaveCount: 0,
                absentCount: 0,
                otHours: 0,
                payableDays: 0,
                dailyAdvanceSum: 0,
                totalRecords: 0,
              },
            })),
          }
        : updated,
      syncedEmployees: newItems.length,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/generate]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate payroll" },
      { status: 500 }
    );
  }
}
