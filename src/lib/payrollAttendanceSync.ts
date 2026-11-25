import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export function getCycleDateRange(month: string, halfPeriod: string) {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const mon = Number(mStr);
  const lastDay = new Date(year, mon, 0).getDate();

  if (halfPeriod === "FIRST_HALF") {
    return {
      start: new Date(Date.UTC(year, mon - 1, 1)),
      end: new Date(Date.UTC(year, mon - 1, 15)),
      defaultWorkingDays: 15,
    };
  }
  if (halfPeriod === "SECOND_HALF") {
    return {
      start: new Date(Date.UTC(year, mon - 1, 16)),
      end: new Date(Date.UTC(year, mon - 1, lastDay)),
      defaultWorkingDays: lastDay - 15,
    };
  }
  let workingDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dayOfWeek = new Date(year, mon - 1, d).getDay();
    if (dayOfWeek !== 0) workingDays++;
  }
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon - 1, lastDay)),
    defaultWorkingDays: workingDays,
  };
}

export interface AttendanceSummary {
  presentCount: number;
  halfDayCount: number;
  paidLeaveCount: number;
  absentCount: number;
  otHours: number;
  payableDays: number;
  dailyAdvanceSum: number;
  totalRecords: number;
}

export async function computeAttendanceBreakdownMap(
  employeeIds: string[],
  month: string,
  halfPeriod: string
): Promise<Map<string, AttendanceSummary>> {
  const map = new Map<string, AttendanceSummary>();
  if (employeeIds.length === 0) return map;

  const { start, end } = getCycleDateRange(month, halfPeriod);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: start, lte: end },
      employeeId: { in: employeeIds },
    },
    select: {
      employeeId: true,
      status: true,
      otHours: true,
      dailyAdvance: true,
    },
  });

  for (const r of records) {
    const cur = map.get(r.employeeId) || {
      presentCount: 0,
      halfDayCount: 0,
      paidLeaveCount: 0,
      absentCount: 0,
      otHours: 0,
      payableDays: 0,
      dailyAdvanceSum: 0,
      totalRecords: 0,
    };
    const st = (r.status || "").toUpperCase();
    if (st === "P" || st === "1H" || st === "1H_MORNING" || st === "1H_EVENING") {
      cur.presentCount += 1;
      cur.payableDays += 1.0;
    } else if (st === "PL") {
      cur.paidLeaveCount += 1;
      cur.payableDays += 1.0;
    } else if (st === "H") {
      cur.halfDayCount += 1;
      cur.payableDays += 0.5;
    } else if (st === "A" || st === "UP") {
      cur.absentCount += 1;
    }
    cur.otHours += Number(r.otHours || 0);
    cur.dailyAdvanceSum += Number(r.dailyAdvance || 0);
    cur.totalRecords += 1;
    map.set(r.employeeId, cur);
  }

  return map;
}

export async function syncLinkedCashBookForPaidRun(payrollRunId: string) {
  try {
    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { items: true },
    });
    if (!run || run.status !== "PAID") return;

    const isOffice = run.cycleType === "MONTHLY_OFFICE";
    const expenseCategory = isOffice ? "Employee Salary" : "Labour Wages";
    const purposeTag = `${expenseCategory} (${run.month} ${run.halfPeriod})`;
    const totalCash = Math.round(run.items.reduce((s, it) => s + it.paidCash, 0) * 100) / 100;

    if (totalCash > 0) {
      const existingEntry = await prisma.cashBookEntry.findFirst({
        where: {
          category: expenseCategory,
          purpose: purposeTag,
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingEntry) {
        await prisma.cashBookEntry.update({
          where: { id: existingEntry.id },
          data: {
            amount: totalCash,
            counterpartyName: `${run.items.length} Staff/Labours`,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[syncLinkedCashBookForPaidRun] skipped:", err);
  }
}

export async function syncOpenDraftPayrollRunsForMonth(month: string) {
  try {
    const draftRuns = await prisma.payrollRun.findMany({
      where: { month, status: "DRAFT" },
      include: { items: true },
    });
    if (draftRuns.length === 0) return;

    for (const run of draftRuns) {
      const empIds = Array.from(new Set(run.items.map((it) => it.employeeId).filter(Boolean)));
      const attMap = await computeAttendanceBreakdownMap(empIds, run.month, run.halfPeriod);

      for (const item of run.items) {
        const summary = attMap.get(item.employeeId);
        if (!summary || summary.totalRecords === 0) continue;

        const daysPresent = summary.payableDays;
        const leaveDays = Math.max(0, Math.round((item.totalWorkingDays - daysPresent) * 100) / 100);
        const grossSalary =
          item.category === "OFFICE"
            ? item.baseRate <= 2500
              ? Math.round(item.baseRate * daysPresent)
              : Math.round((item.baseRate / (item.totalWorkingDays || 26)) * daysPresent)
            : Math.round(item.baseRate * daysPresent);

        const netSalary = Math.round(
          grossSalary +
            item.otAndIncentive +
            item.nightDutyAmount +
            (item.vehicleAllowance || 0) +
            item.lastMonthBalance -
            item.advanceDeduction -
            item.expenseBalanceDeduction
        );
        const carryForwardBalance = Math.round((netSalary - (item.paidCash + item.paidBankOrGpay)) * 100) / 100;

        await prisma.payrollItem.update({
          where: { id: item.id },
          data: {
            daysPresent,
            leaveDays,
            grossSalary,
            netSalary,
            carryForwardBalance,
          },
        });
      }

      await recalculatePayrollRunTotals(run.id, prisma as any);
    }
  } catch (err) {
    console.warn("[syncOpenDraftPayrollRunsForMonth] warn:", err);
  }
}
