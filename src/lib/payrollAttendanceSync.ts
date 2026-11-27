import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export function getTodayISTDateString(): string {
  // Format current time in Asia/Kolkata (IST, UTC+5:30) as YYYY-MM-DD
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

export function computeGrossForCycle(
  isOffice: boolean,
  rate: number,
  payableDays: number,
  totalWorkingDays: number
): number {
  if (!isOffice) {
    return Math.round(rate * payableDays);
  }
  if (totalWorkingDays <= 0) return Math.round(rate);
  if (Math.abs(payableDays - totalWorkingDays) < 0.001 || payableDays >= totalWorkingDays) {
    return Math.round(rate);
  }
  return Math.round((rate / totalWorkingDays) * payableDays);
}

export function computeHourlyOtAmount(
  isOffice: boolean,
  rate: number,
  otHours: number,
  totalWorkingDays: number
): number {
  if (!otHours || otHours <= 0 || rate <= 0) return 0;
  const hourlyRate = isOffice ? rate / (totalWorkingDays || 24) / 8 : rate / 8;
  return Math.round(otHours * hourlyRate);
}

export function getPreviousCycleInfo(month: string, halfPeriod: string): { month: string; halfPeriod: string } {
  const [yStr, mStr] = month.split("-");
  let y = Number(yStr);
  let m = Number(mStr);
  if (halfPeriod === "SECOND_HALF") return { month, halfPeriod: "FIRST_HALF" };
  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return {
    month: `${y}-${String(m).padStart(2, "0")}`,
    halfPeriod: halfPeriod === "FIRST_HALF" ? "SECOND_HALF" : "FULL",
  };
}

/**
 * Computes rounded integer unpaid (+) or overpaid (-) carry-forward balance
 * from the immediately preceding month/cycle in the same organization & cycleType.
 */
export async function computePreviousCycleBalanceMap(
  companyId: string,
  cycleType: string,
  month: string,
  halfPeriod: string
): Promise<Map<string, number>> {
  const balMap = new Map<string, number>();
  const prev = getPreviousCycleInfo(month, halfPeriod);
  const prevRun = await prisma.payrollRun.findUnique({
    where: {
      cycleType_month_halfPeriod_companyFilter_companyId: {
        cycleType,
        month: prev.month,
        halfPeriod: prev.halfPeriod,
        companyFilter: "ALL",
        companyId,
      },
    },
    include: { items: true },
  });
  if (!prevRun) return balMap;

  for (const prevItem of prevRun.items) {
    const prevPaid = (prevItem.paidCash || 0) + (prevItem.paidBankOrGpay || 0) + (prevItem.paidGpay || 0);
    const prevMonthUnpaidBalance = Math.round(prevItem.netSalary - prevPaid);
    if (prevItem.employeeId) balMap.set(prevItem.employeeId, prevMonthUnpaidBalance);
    if (prevItem.employeeCode) balMap.set(`CODE:${prevItem.employeeCode}`, prevMonthUnpaidBalance);
  }
  return balMap;
}

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
    const dayOfWeek = new Date(Date.UTC(year, mon - 1, d)).getUTCDay();
    if (dayOfWeek !== 0) workingDays++;
  }
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon - 1, lastDay)),
    defaultWorkingDays: workingDays,
  };
}

export interface MonthWorkingDaysInfo {
  totalDaysInMonth: number;
  sundaysCount: number;
  paidHolidaysCount: number;
  unpaidShutdownCount: number;
  scheduledWorkingDays: number;
  unpaidShutdownDateSet: Set<string>;
  scheduledDateStrings: string[];
  remainingDateStrings: string[];
  todayISO: string;
}

/**
 * Exact Office Working Days Denominator Formula:
 * scheduledWorkingDays = totalDaysInMonth - sundaysCount - companyUnpaidShutdownDays
 * Never subtracts Paid Holidays (PL) from the denominator.
 */
export async function computeMonthWorkingDaysInfo(
  month: string,
  halfPeriod: string = "FULL",
  companyId?: string
): Promise<MonthWorkingDaysInfo> {
  const { start, end } = getCycleDateRange(month, halfPeriod);
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const mon = Number(mStr);
  const totalDaysInMonth = new Date(year, mon, 0).getDate();
  const todayISO = getTodayISTDateString();

  const [holidays, activeOfficeCount, upRecords] = await Promise.all([
    prisma.companyHoliday.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(companyId ? { OR: [{ companyId: "ALL" }, { companyId }] } : {}),
      },
      select: { date: true, holidayType: true },
    }),
    prisma.employeeOrLabour.count({
      where: {
        active: true,
        status: "ACTIVE",
        category: "OFFICE_STAFF",
        ...(companyId ? { companyId } : {}),
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "UP",
        employee: { category: "OFFICE_STAFF", ...(companyId ? { companyId } : {}) },
      },
      select: { date: true },
    }),
  ]);

  const paidHolidayDateSet = new Set<string>();
  const unpaidShutdownDateSet = new Set<string>();

  for (const h of holidays) {
    const iso = h.date.toISOString().slice(0, 10);
    if ((h.holidayType || "PL").toUpperCase() === "UP") {
      unpaidShutdownDateSet.add(iso);
    } else {
      paidHolidayDateSet.add(iso);
    }
  }

  // Also detect any non-Sunday date where >= 50% of active office staff were marked UP (company-wide shutdown)
  if (activeOfficeCount > 0) {
    const upCounts = new Map<string, number>();
    for (const r of upRecords) {
      const iso = r.date.toISOString().slice(0, 10);
      upCounts.set(iso, (upCounts.get(iso) || 0) + 1);
    }
    const threshold = Math.max(2, Math.ceil(activeOfficeCount * 0.5));
    for (const [iso, cnt] of upCounts.entries()) {
      if (cnt >= threshold) {
        unpaidShutdownDateSet.add(iso);
      }
    }
  }

  const startDay = halfPeriod === "SECOND_HALF" ? 16 : 1;
  const endDay = halfPeriod === "FIRST_HALF" ? 15 : totalDaysInMonth;

  let sundaysCount = 0;
  let paidHolidaysCount = 0;
  let unpaidShutdownCount = 0;
  const scheduledDateStrings: string[] = [];
  const remainingDateStrings: string[] = [];

  for (let d = startDay; d <= endDay; d++) {
    const iso = `${yStr}-${mStr.padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(year, mon - 1, d)).getUTCDay();
    if (dow === 0) {
      sundaysCount++;
      continue;
    }
    if (unpaidShutdownDateSet.has(iso)) {
      unpaidShutdownCount++;
      continue;
    }
    if (paidHolidayDateSet.has(iso)) {
      paidHolidaysCount++;
    }
    scheduledDateStrings.push(iso);
    if (iso > todayISO) {
      remainingDateStrings.push(iso);
    }
  }

  const scheduledWorkingDays = scheduledDateStrings.length;

  return {
    totalDaysInMonth: endDay - startDay + 1,
    sundaysCount,
    paidHolidaysCount,
    unpaidShutdownCount,
    scheduledWorkingDays,
    unpaidShutdownDateSet,
    scheduledDateStrings,
    remainingDateStrings,
    todayISO,
  };
}

export interface AttendanceSummary {
  presentCount: number;
  halfDayCount: number;
  paidLeaveCount: number;
  absentCount: number;
  otHours: number;
  payableDays: number;
  markedPayableSoFar: number;
  remainingScheduledDays: number;
  projectedPayableDays: number;
  scheduledWorkingDays: number;
  dailyAdvanceSum: number;
  totalRecords: number;
}

export async function computeAttendanceBreakdownMap(
  employeeIds: string[],
  month: string,
  halfPeriod: string,
  companyId?: string
): Promise<Map<string, AttendanceSummary>> {
  const map = new Map<string, AttendanceSummary>();
  if (employeeIds.length === 0) return map;

  const { start, end } = getCycleDateRange(month, halfPeriod);
  const [records, monthInfo] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        employeeId: { in: employeeIds },
      },
      select: {
        employeeId: true,
        date: true,
        status: true,
        otHours: true,
        permissionHours: true,
        workNotes: true,
        dailyAdvance: true,
      },
    }),
    computeMonthWorkingDaysInfo(month, halfPeriod, companyId),
  ]);

  const markedDatesByEmp = new Map<string, Set<string>>();

  for (const r of records) {
    const cur = map.get(r.employeeId) || {
      presentCount: 0,
      halfDayCount: 0,
      paidLeaveCount: 0,
      absentCount: 0,
      otHours: 0,
      payableDays: 0,
      markedPayableSoFar: 0,
      remainingScheduledDays: 0,
      projectedPayableDays: 0,
      scheduledWorkingDays: monthInfo.scheduledWorkingDays,
      dailyAdvanceSum: 0,
      totalRecords: 0,
    };

    const iso = r.date.toISOString().slice(0, 10);
    const empDates = markedDatesByEmp.get(r.employeeId) || new Set<string>();
    empDates.add(iso);
    markedDatesByEmp.set(r.employeeId, empDates);

    const isUpToToday = iso <= monthInfo.todayISO;
    const st = (r.status || "").toUpperCase();
    if (st === "P" || st === "1H" || st === "1H_MORNING" || st === "1H_EVENING") {
      if (isUpToToday) {
        cur.presentCount += 1;
        cur.payableDays += 1.0;
      }
    } else if (st === "PL") {
      const isHalf = Number(r.permissionHours) === 0.5 || (r.workNotes && r.workNotes.includes("HALF_PAID"));
      if (isUpToToday) {
        if (isHalf) {
          cur.paidLeaveCount += 0.5;
          cur.payableDays += 0.5;
        } else {
          cur.paidLeaveCount += 1;
          cur.payableDays += 1.0;
        }
      }
    } else if (st === "H") {
      if (isUpToToday) {
        cur.halfDayCount += 1;
        cur.payableDays += 0.5;
      }
    } else if (st === "A" || st === "UP") {
      if (isUpToToday) {
        cur.absentCount += 1;
      }
    }
    cur.otHours += Number(r.otHours || 0);
    cur.dailyAdvanceSum += Number(r.dailyAdvance || 0);
    cur.totalRecords += 1;
    map.set(r.employeeId, cur);
  }

  for (const empId of employeeIds) {
    const cur = map.get(empId) || {
      presentCount: 0,
      halfDayCount: 0,
      paidLeaveCount: 0,
      absentCount: 0,
      otHours: 0,
      payableDays: 0,
      markedPayableSoFar: 0,
      remainingScheduledDays: 0,
      projectedPayableDays: 0,
      scheduledWorkingDays: monthInfo.scheduledWorkingDays,
      dailyAdvanceSum: 0,
      totalRecords: 0,
    };
    const empDates = markedDatesByEmp.get(empId) || new Set<string>();
    const isFullOfficeMonth = halfPeriod === "FULL";
    const remaining = isFullOfficeMonth
      ? monthInfo.remainingDateStrings.filter((d) => !empDates.has(d)).length
      : 0;
    cur.markedPayableSoFar = Math.round(cur.payableDays * 100) / 100;
    cur.remainingScheduledDays = Math.max(
      0,
      Math.min(remaining, Math.max(0, monthInfo.scheduledWorkingDays - cur.markedPayableSoFar))
    );
    cur.projectedPayableDays = isFullOfficeMonth
      ? Math.min(monthInfo.scheduledWorkingDays, Math.round((cur.markedPayableSoFar + remaining) * 100) / 100)
      : cur.markedPayableSoFar;
    cur.scheduledWorkingDays = monthInfo.scheduledWorkingDays;
    map.set(empId, cur);
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

export async function syncOpenDraftPayrollRunsForMonth(month: string, targetCompanyId?: string) {
  try {
    // Protect historical / closed months (e.g. Oct 2026) from being overwritten by sparse attendance records
    const currentMonthIST = getTodayISTDateString().slice(0, 7);
    if (month < currentMonthIST) return;

    const draftRuns = await prisma.payrollRun.findMany({
      where: {
        month,
        status: "DRAFT",
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      },
      include: { items: true },
    });
    if (draftRuns.length === 0) return;

    for (const run of draftRuns) {
      const empIds = Array.from(new Set(run.items.map((it) => it.employeeId).filter(Boolean)));
      const isOfficeCycle = run.cycleType === "MONTHLY_OFFICE";
      const [attMap, monthInfo, prevBalMap] = await Promise.all([
        computeAttendanceBreakdownMap(empIds, run.month, run.halfPeriod, run.companyId),
        isOfficeCycle ? computeMonthWorkingDaysInfo(run.month, run.halfPeriod, run.companyId) : Promise.resolve(null),
        computePreviousCycleBalanceMap(run.companyId, run.cycleType, run.month, run.halfPeriod),
      ]);

      for (const item of run.items) {
        const summary = attMap.get(item.employeeId);
        const hasRecords = Boolean(summary && summary.totalRecords > 0);
        if (!hasRecords && !isOfficeCycle) continue;

        const totalWorkingDays = isOfficeCycle
          ? (summary?.scheduledWorkingDays ?? monthInfo?.scheduledWorkingDays ?? item.totalWorkingDays)
          : item.totalWorkingDays;
        const daysPresent = hasRecords
          ? isOfficeCycle
            ? summary!.projectedPayableDays
            : summary!.markedPayableSoFar
          : Math.min(totalWorkingDays, item.daysPresent || totalWorkingDays);
        const leaveDays = Math.max(0, Math.round((totalWorkingDays - daysPresent) * 100) / 100);
        const grossSalary = computeGrossForCycle(isOfficeCycle, item.baseRate, daysPresent, totalWorkingDays);
        const otAndIncentive = hasRecords
          ? computeHourlyOtAmount(isOfficeCycle, item.baseRate, summary!.otHours, totalWorkingDays)
          : item.otAndIncentive;
        const lastMonthBalance =
          prevBalMap.get(item.employeeId) ??
          (item.employeeCode ? prevBalMap.get(`CODE:${item.employeeCode}`) : undefined) ??
          item.lastMonthBalance;

        const netSalary = Math.round(
          grossSalary +
            otAndIncentive +
            (item.performanceIncentive || 0) +
            item.nightDutyAmount +
            (item.vehicleAllowance || 0) +
            lastMonthBalance -
            item.advanceDeduction -
            item.expenseBalanceDeduction
        );
        const totalPaid = (item.paidCash || 0) + (item.paidBankOrGpay || 0) + (item.paidGpay || 0);
        const carryForwardBalance = Math.round((netSalary - totalPaid) * 100) / 100;
        const paymentStatus =
          item.paymentStatus === "HOLD"
            ? "HOLD"
            : totalPaid >= netSalary && (netSalary > 0 || totalPaid > 0)
            ? "PAID"
            : totalPaid > 0
            ? "PARTIAL"
            : "UNPAID";

        await prisma.payrollItem.update({
          where: { id: item.id },
          data: {
            totalWorkingDays,
            daysPresent,
            leaveDays,
            grossSalary,
            otAndIncentive,
            lastMonthBalance,
            netSalary,
            carryForwardBalance,
            paymentStatus,
            isCleared: paymentStatus === "PAID",
          },
        });
      }

      await recalculatePayrollRunTotals(run.id, prisma as any);
    }
  } catch (err) {
    console.warn("[syncOpenDraftPayrollRunsForMonth] warn:", err);
  }
}

/**
 * Propagates employee additions, salary/rate updates, restores, or archives
 * from Standard People (/labour) into open DRAFT PayrollRuns (>= current month).
 */
export async function syncEmployeeToOpenDraftRuns(targetCompanyId?: string) {
  try {
    const currentMonthIST = getTodayISTDateString().slice(0, 7);
    const draftRuns = await prisma.payrollRun.findMany({
      where: {
        status: "DRAFT",
        month: { gte: currentMonthIST },
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      },
      include: { items: true },
    });
    if (draftRuns.length === 0) return;

    for (const run of draftRuns) {
      const runCompanyId = run.companyId || "standard-roofs";
      const empCategory =
        run.cycleType === "MONTHLY_OFFICE"
          ? "OFFICE_STAFF"
          : run.cycleType === "BI_MONTHLY_TAMIL"
          ? "TAMIL_LABOUR"
          : "HINDI_LABOUR";
      const itemCategory =
        run.cycleType === "MONTHLY_OFFICE"
          ? "OFFICE"
          : run.cycleType === "BI_MONTHLY_TAMIL"
          ? "TAMIL_LABOUR"
          : "HINDI_CREW";

      const isOfficeCycle = run.cycleType === "MONTHLY_OFFICE";
      const { defaultWorkingDays } = getCycleDateRange(run.month, run.halfPeriod);
      const [employees, monthInfo] = await Promise.all([
        prisma.employeeOrLabour.findMany({
          where: {
            active: true,
            status: "ACTIVE",
            category: empCategory,
            companyId: runCompanyId,
          },
          orderBy: { name: "asc" },
        }),
        isOfficeCycle ? computeMonthWorkingDaysInfo(run.month, run.halfPeriod, runCompanyId) : Promise.resolve(null),
      ]);

      const [attMap, prevBalMap] = await Promise.all([
        computeAttendanceBreakdownMap(
          employees.map((e) => e.id),
          run.month,
          run.halfPeriod,
          runCompanyId
        ),
        computePreviousCycleBalanceMap(runCompanyId, run.cycleType, run.month, run.halfPeriod),
      ]);
      const existingByEmp = new Map(run.items.map((it) => [it.employeeId, it]));
      const activeEmpIds = new Set(employees.map((e) => e.id));

      // Remove archived/inactive unpaid non-adhoc items from open DRAFT runs
      const staleUnpaidIds = run.items
        .filter(
          (it) =>
            !activeEmpIds.has(it.employeeId) &&
            !it.employeeId.startsWith("ADHOC_") &&
            (it.paidCash || 0) + (it.paidBankOrGpay || 0) + (it.paidGpay || 0) === 0
        )
        .map((it) => it.id);
      if (staleUnpaidIds.length > 0) {
        await prisma.payrollItem.deleteMany({ where: { id: { in: staleUnpaidIds } } });
      }

      for (const emp of employees) {
        const summary = attMap.get(emp.id);
        const prevIt = existingByEmp.get(emp.id);
        const totalWorkingDays = isOfficeCycle
          ? (summary?.scheduledWorkingDays ?? monthInfo?.scheduledWorkingDays ?? defaultWorkingDays)
          : (prevIt?.totalWorkingDays || defaultWorkingDays);

        const daysPresent =
          summary && summary.totalRecords > 0
            ? isOfficeCycle
              ? summary.projectedPayableDays
              : summary.markedPayableSoFar
            : prevIt
            ? prevIt.daysPresent
            : totalWorkingDays;

        const leaveDays = Math.max(0, Math.round((totalWorkingDays - daysPresent) * 100) / 100);
        const baseRate = isOfficeCycle
          ? Number(emp.monthlySalary || emp.baseWage || 0)
          : Number(emp.dailyWage || emp.baseWage || 0);

        const grossSalary = computeGrossForCycle(isOfficeCycle, baseRate, daysPresent, totalWorkingDays);

        const otAndIncentive =
          summary && summary.totalRecords > 0
            ? computeHourlyOtAmount(isOfficeCycle, baseRate, summary.otHours, totalWorkingDays)
            : (prevIt?.otAndIncentive ?? 0);
        const performanceIncentive = prevIt?.performanceIncentive ?? 0;
        const nightDutyAmount = prevIt?.nightDutyAmount ?? 0;
        const isDriver = (emp.designation || emp.role || "").toLowerCase().includes("driver");
        const vehicleAllowance =
          isDriver || Number(emp.defaultVehicleAllowance || 0) > 0
            ? (prevIt && prevIt.vehicleAllowance > 0 ? prevIt.vehicleAllowance : Number(emp.defaultVehicleAllowance || 0))
            : 0;
        const lastMonthBalance =
          prevBalMap.get(emp.id) ??
          (emp.employeeCode ? prevBalMap.get(`CODE:${emp.employeeCode}`) : undefined) ??
          prevIt?.lastMonthBalance ??
          0;
        const advanceDeduction = prevIt?.advanceDeduction ?? Math.round(summary?.dailyAdvanceSum || 0);
        const expenseBalanceDeduction = prevIt?.expenseBalanceDeduction ?? 0;

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

        const paidCash = prevIt?.paidCash || 0;
        const paidBankOrGpay = prevIt?.paidBankOrGpay || 0;
        const paidGpay = prevIt?.paidGpay || 0;
        const totalPaid = paidCash + paidBankOrGpay + paidGpay;
        const carryForwardBalance = Math.round((netSalary - totalPaid) * 100) / 100;
        const paymentStatus =
          prevIt?.paymentStatus === "HOLD"
            ? "HOLD"
            : totalPaid >= netSalary && (netSalary > 0 || totalPaid > 0)
            ? "PAID"
            : totalPaid > 0
            ? "PARTIAL"
            : "UNPAID";

        const commonData = {
          employeeName: emp.name,
          employeeCode: emp.employeeCode,
          category: itemCategory,
          company: runCompanyId === "invi-creation" ? "INVI_CREATION" : "STANDARD_ROOFS",
          totalWorkingDays,
          daysPresent,
          leaveDays,
          baseRate,
          grossSalary,
          vehicleAllowance,
          lastMonthBalance,
          netSalary,
          carryForwardBalance,
          paymentStatus,
          isCleared: paymentStatus === "PAID",
          designation: emp.designation || emp.role || null,
          location: emp.location || "ERODE",
          state: emp.state || "TAMIL NADU",
          mobileNo: emp.phone || null,
          aadhaarNo: emp.aadhaarNumber || null,
          bankName: emp.bankName || null,
          accountNo: emp.bankAccountNo || emp.bankAccountNumber || null,
        };

        if (prevIt) {
          await prisma.payrollItem.update({
            where: { id: prevIt.id },
            data: commonData,
          });
        } else {
          await prisma.payrollItem.create({
            data: {
              ...commonData,
              payrollRunId: run.id,
              employeeId: emp.id,
              otAndIncentive,
              performanceIncentive,
              nightDutyAmount,
              lastMonthBalance,
              advanceDeduction,
              expenseBalanceDeduction,
              paidCash: 0,
              paidBankOrGpay: 0,
              paidGpay: 0,
              paymentChannel: "CASH",
              notes:
                summary && summary.totalRecords > 0
                  ? `Synced from ${summary.totalRecords} attendance records`
                  : "Planned / Default Working Days",
            },
          });
        }
      }

      await recalculatePayrollRunTotals(run.id, prisma as any);
    }
  } catch (err) {
    console.warn("[syncEmployeeToOpenDraftRuns] warn:", err);
  }
}
