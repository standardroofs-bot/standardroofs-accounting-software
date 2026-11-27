import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  computeAttendanceBreakdownMap,
  computeGrossForCycle,
  computeHourlyOtAmount,
  computeMonthWorkingDaysInfo,
  computePreviousCycleBalanceMap,
  getCycleDateRange,
} from "../src/lib/payrollAttendanceSync";
import { recalculatePayrollRunTotals } from "../src/lib/payrollTotals";

const prisma = new PrismaClient();

function matchAdvanceAmount(empName: string, advances: Array<{ amount: any; counterpartyName: string | null; purpose: string | null }>): number {
  const firstWord = empName.toLowerCase().trim().split(/[\s.]+/)[0];
  if (firstWord.length < 3) return 0;
  const escaped = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRe = new RegExp(`\\b${escaped}\\b`, "i");
  const specificRe = new RegExp(`\\b${escaped}[^0-9]{0,6}(\\d+)`, "i");

  return advances.reduce((sum, a) => {
    const text = `${a.counterpartyName || ""} ${a.purpose || ""}`;
    if (!wordRe.test(text)) return sum;
    const spec = text.match(specificRe);
    if (spec) return sum + Number(spec[1]);
    return text.includes(",") ? sum : sum + Number(a.amount || 0);
  }, 0);
}

async function main() {
  console.log("=== 1. AUDITING & FIXING MASTER RATES IN EmployeeOrLabour ===");
  const OFFICE_SALARY_OVERRIDES: Record<string, string> = {
    SR009: "26000.00",
    Invi001: "9100.00",
    Invi002: "10400.00",
    Invi003: "10000.00",
  };

  const officeEmps = await prisma.employeeOrLabour.findMany({
    where: { status: "ACTIVE", category: "OFFICE_STAFF" },
    orderBy: [{ companyId: "asc" }, { employeeCode: "asc" }],
  });

  for (const emp of officeEmps) {
    const correctedSalary = OFFICE_SALARY_OVERRIDES[emp.employeeCode];
    await prisma.employeeOrLabour.update({
      where: { id: emp.id },
      data: {
        roleType: "PERMANENT_STAFF",
        payCycle: "MONTHLY",
        dailyWage: "0.00",
        baseWage: "0.00",
        ...(correctedSalary ? { monthlySalary: correctedSalary } : {}),
      },
    });
  }

  // Ensure non-office daily wage workers have monthlySalary = 0 & DAILY_LABOUR
  await prisma.employeeOrLabour.updateMany({
    where: { status: "ACTIVE", category: { in: ["TAMIL_LABOUR", "HINDI_LABOUR"] } },
    data: { roleType: "DAILY_LABOUR", payCycle: "FIFTEEN_DAYS", monthlySalary: "0.00" },
  });

  const nonOfficeCheck = await prisma.employeeOrLabour.findMany({
    where: { status: "ACTIVE", category: { in: ["TAMIL_LABOUR", "HINDI_LABOUR"] } },
    select: { employeeCode: true, category: true, dailyWage: true, monthlySalary: true },
  });
  const badNonOffice = nonOfficeCheck.filter((w) => Number(w.dailyWage || 0) <= 0 || Number(w.monthlySalary || 0) > 0);
  if (badNonOffice.length > 0) {
    throw new Error(`Found non-office rate anomalies: ${JSON.stringify(badNonOffice)}`);
  }
  console.log(`✓ Fixed ${officeEmps.length} OFFICE_STAFF (MONTHLY / dailyWage=0) & verified ${nonOfficeCheck.length} TAMIL/HINDI daily-wage workers.`);

  console.log("\n=== 2. CLEANING STRAY OCT DECIMALS & RECALCULATING NOV 2026 OFFICE RUNS ===");
  const novOfficeRuns = await prisma.payrollRun.findMany({
    where: { month: "2026-11", cycleType: "MONTHLY_OFFICE", status: "DRAFT" },
    include: { items: true },
  });

  const { start, end } = getCycleDateRange("2026-11", "FULL");

  for (const run of novOfficeRuns) {
    const emps = await prisma.employeeOrLabour.findMany({
      where: { active: true, status: "ACTIVE", category: "OFFICE_STAFF", companyId: run.companyId },
      orderBy: { employeeCode: "asc" },
    });
    const empById = new Map(emps.map((e) => [e.id, e]));
    const [attMap, monthInfo, prevBalMap, cbAdvances] = await Promise.all([
      computeAttendanceBreakdownMap(emps.map((e) => e.id), "2026-11", "FULL", run.companyId),
      computeMonthWorkingDaysInfo("2026-11", "FULL", run.companyId),
      computePreviousCycleBalanceMap(run.companyId, "MONTHLY_OFFICE", "2026-11", "FULL"),
      prisma.cashBookEntry.findMany({
        where: {
          companyId: run.companyId,
          date: { gte: start, lte: new Date(end.getTime() + 86399999) },
          category: "Employee Advance",
        },
        select: { amount: true, counterpartyName: true, purpose: true },
      }),
    ]);

    for (const item of run.items) {
      const emp = empById.get(item.employeeId);
      if (!emp) continue;

      const summary = attMap.get(emp.id);
      const totalWorkingDays = monthInfo.scheduledWorkingDays;
      const daysPresent = summary && summary.totalRecords > 0 ? summary.projectedPayableDays : totalWorkingDays;
      const leaveDays = Math.max(0, Math.round((totalWorkingDays - daysPresent) * 100) / 100);
      const baseRate = Number(emp.monthlySalary || 0);
      const grossSalary = computeGrossForCycle(true, baseRate, daysPresent, totalWorkingDays);
      const otAndIncentive = computeHourlyOtAmount(true, baseRate, summary?.otHours || 0, totalWorkingDays);
      const isDriver = (emp.designation || emp.role || "").toLowerCase().includes("driver");
      const vehicleAllowance = isDriver ? Number(emp.defaultVehicleAllowance || 0) : 0;
      const performanceIncentive = item.performanceIncentive || 0;
      const nightDutyAmount = 0;
      const lastMonthBalance =
        prevBalMap.get(emp.id) ??
        (emp.employeeCode ? prevBalMap.get(`CODE:${emp.employeeCode}`) : undefined) ??
        0;
      const advanceDeduction = Math.round((summary?.dailyAdvanceSum || 0) + matchAdvanceAmount(emp.name, cbAdvances));
      const expenseBalanceDeduction = 0;

      const netSalary = Math.round(
        grossSalary + otAndIncentive + performanceIncentive + nightDutyAmount + vehicleAllowance + lastMonthBalance - advanceDeduction - expenseBalanceDeduction
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
          employeeName: emp.name,
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
          carryForwardBalance,
          paymentStatus,
          isCleared: paymentStatus === "PAID",
          notes:
            otAndIncentive > 0
              ? `Synced ${summary?.totalRecords || 0} att. records · ${summary?.otHours || 0}h OT`
              : `Synced ${summary?.totalRecords || 0} attendance records`,
        },
      });
    }

    await recalculatePayrollRunTotals(run.id, prisma as any);
  }

  console.log("\n=== 3. FULL NOVEMBER 2026 PAYROLL VERIFICATION MATRIX ===");
  const freshRuns = await prisma.payrollRun.findMany({
    where: { month: "2026-11", cycleType: "MONTHLY_OFFICE" },
    include: { items: { orderBy: { employeeCode: "asc" } } },
    orderBy: { companyId: "asc" },
  });

  for (const r of freshRuns) {
    const empIds = r.items.map((i) => i.employeeId);
    const attMap = await computeAttendanceBreakdownMap(empIds, "2026-11", "FULL", r.companyId);
    console.log(`\n[OFFICE - ${r.companyId.toUpperCase()}] Run Status: ${r.status} | Total Net: ₹${r.totalNet.toLocaleString("en-IN")}`);
    console.table(
      r.items.map((it) => {
        const att = attMap.get(it.employeeId);
        const marked = Math.min(it.totalWorkingDays, att?.markedPayableSoFar ?? it.daysPresent);
        const left = Math.max(0, Math.min(att?.remainingScheduledDays ?? 0, it.totalWorkingDays - marked));
        const earnedToday = computeGrossForCycle(true, it.baseRate, marked, it.totalWorkingDays);
        return {
          Code: it.employeeCode,
          Name: it.employeeName,
          MonthlySalary: it.baseRate,
          Marked_Days: `${marked}/${it.totalWorkingDays}d (+${left} left)`,
          Earned_Till_Today: earnedToday,
          Projected_Gross: it.grossSalary,
          OT_Amt: it.otAndIncentive,
          Advance: it.advanceDeduction,
          PrevBal: it.lastMonthBalance,
          Payday_Net: it.netSalary,
        };
      })
    );
  }

  // Verify Tamil 1-15 (PAID) & preview Tamil 16-30 & Hindi 1-15 / 16-30 actual-worked calculation
  const tamil1 = await prisma.payrollRun.findFirst({
    where: { companyId: "standard-roofs", month: "2026-11", cycleType: "BI_MONTHLY_TAMIL", halfPeriod: "FIRST_HALF" },
    include: { items: { orderBy: { employeeCode: "asc" } } },
  });
  if (tamil1) {
    console.log(`\n[TAMIL LABOURS - Nov 1–15 (${tamil1.status})] Total Gross: ₹${tamil1.totalGross.toLocaleString("en-IN")} | Total Net: ₹${tamil1.totalNet.toLocaleString("en-IN")}`);
    console.table(
      tamil1.items.map((it) => ({
        Code: it.employeeCode,
        Name: it.employeeName,
        DailyRate: it.baseRate,
        Worked: `${it.daysPresent}d`,
        Earned_Gross: it.grossSalary,
        OT: it.otAndIncentive,
        Advance: it.advanceDeduction,
        Net_Payable: it.netSalary,
        Paid: it.paidCash + it.paidBankOrGpay + (it.paidGpay || 0),
      }))
    );
  }

  for (const [label, cat, half] of [
    ["TAMIL LABOURS - Nov 16–30 (Live Actual)", "TAMIL_LABOUR", "SECOND_HALF"],
    ["HINDI CREW - Nov 1–15 (Live Actual)", "HINDI_LABOUR", "FIRST_HALF"],
    ["HINDI CREW - Nov 16–30 (Live Actual)", "HINDI_LABOUR", "SECOND_HALF"],
  ] as const) {
    const emps = await prisma.employeeOrLabour.findMany({
      where: { companyId: "standard-roofs", status: "ACTIVE", category: cat },
      orderBy: { employeeCode: "asc" },
    });
    const attMap = await computeAttendanceBreakdownMap(emps.map((e) => e.id), "2026-11", half, "standard-roofs");
    const activeRows = emps
      .map((e) => {
        const s = attMap.get(e.id);
        const worked = s?.markedPayableSoFar || 0;
        const rate = Number(e.dailyWage || 0);
        const gross = computeGrossForCycle(false, rate, worked, 15);
        const ot = computeHourlyOtAmount(false, rate, s?.otHours || 0, 15);
        return { Code: e.employeeCode, Name: e.name, DailyRate: rate, Worked: `${worked}d`, Earned_Gross: gross, OT: ot, Records: s?.totalRecords || 0 };
      })
      .filter((r) => r.Records > 0 && r.Worked !== "0d");
    console.log(`\n[${label}] Active Worked Rows: ${activeRows.length}`);
    if (activeRows.length > 0) console.table(activeRows);
  }

  // Sub-Contractors audit
  const subs = await prisma.subContractor.findMany({ include: { entries: true }, orderBy: { name: "asc" } });
  console.log(`\n[SUB-CONTRACTORS - Site Milestone Ledgers (${subs.length} Teams)]`);
  console.table(
    subs.map((s) => {
      const workVal = Math.round(s.entries.reduce((a, e) => a + e.amountToGive, 0) * 100) / 100;
      const paid = Math.round(s.entries.reduce((a, e) => a + (e.givenAmount || 0), 0) * 100) / 100;
      const expected = Math.round((s.openingBalance + workVal - paid) * 100) / 100;
      return {
        Team: s.name,
        Opening: s.openingBalance,
        Net_Work_Billed: workVal,
        Total_Paid: paid,
        Expected_Bal: expected,
        Stored_Bal: s.currentBalance,
        Exact_Match: Math.abs(expected - s.currentBalance) < 0.01,
      };
    })
  );

  // Confirm Oct 2026 runs were untouched
  const octRuns = await prisma.payrollRun.findMany({
    where: { month: "2026-10" },
    select: { companyId: true, cycleType: true, halfPeriod: true, status: true, totalNet: true },
    orderBy: [{ companyId: "asc" }, { cycleType: "asc" }],
  });
  console.log("\n[HISTORICAL OCT 2026 PROTECTION CHECK]");
  console.table(octRuns);
}

main()
  .catch((err) => {
    console.error("[AUDIT ERROR]:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
