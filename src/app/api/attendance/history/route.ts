import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const contractorTeamName = searchParams.get("contractorTeamName");
    const requestedYear = searchParams.get("year");

    // Case 1: Contractor Team History
    if (contractorTeamName) {
      const logs = await prisma.contractorDailyLog.findMany({
        where: { contractorTeamName, companyId: tenant.companyId },
        orderBy: { date: "asc" },
      });

      const yearlyMap: Record<string, any> = {};
      const sitesWorkedSet = new Set<string>();
      let lifetimeHeadcount = 0;
      let totalLogs = logs.length;
      let lifetimeOtHours = 0;
      const overtimeLog: any[] = [];

      logs.forEach((log) => {
        const d = new Date(log.date);
        const year = d.getUTCFullYear().toString();
        const month = d.getUTCMonth();

        if (log.siteName) sitesWorkedSet.add(log.siteName.trim());
        lifetimeHeadcount += log.headcount;

        const ot = (log as any).otHours ? Number((log as any).otHours) : 0;
        lifetimeOtHours += ot;

        if (ot > 0) {
          overtimeLog.push({
            date: log.date.toISOString().split("T")[0],
            otHours: ot,
            otTimeRange: (log as any).otTimeRange || null,
            otReason: (log as any).otReason || null,
          });
        }

        if (!yearlyMap[year]) {
          yearlyMap[year] = {
            year,
            totals: { headcount: 0, logsCount: 0, otHours: 0, sites: [] },
            months: Array.from({ length: 12 }, (_, i) => ({
              monthIndex: i,
              monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
              headcount: 0,
              logsCount: 0,
              otHours: 0,
              sites: new Set<string>(),
              records: [] as any[],
            })),
          };
        }

        const yData = yearlyMap[year];
        const mData = yData.months[month];
        yData.totals.headcount += log.headcount;
        yData.totals.logsCount++;
        yData.totals.otHours = (yData.totals.otHours || 0) + ot;
        mData.headcount += log.headcount;
        mData.logsCount++;
        mData.otHours = (mData.otHours || 0) + ot;
        if (log.siteName) mData.sites.add(log.siteName.trim());
        mData.records.push(log);
      });

      const yearsList = ["2025", "2026", "2027", "2028", "2029", "2030"];
      yearsList.forEach((y) => {
        if (!yearlyMap[y]) {
          yearlyMap[y] = {
            year: y,
            totals: { headcount: 0, logsCount: 0, otHours: 0, sites: [] },
            months: Array.from({ length: 12 }, (_, i) => ({
              monthIndex: i,
              monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
              headcount: 0,
              logsCount: 0,
              otHours: 0,
              sites: [],
              records: [],
            })),
          };
        } else {
          yearlyMap[y].months = yearlyMap[y].months.map((m: any) => ({
            ...m,
            sites: Array.from(m.sites || []),
          }));
        }
      });

      return NextResponse.json({
        success: true,
        isContractor: true,
        contractorTeamName,
        yearsList,
        yearlyData: yearlyMap,
        overtimeLog,
        lifetimeSummary: {
          totalLogs,
          lifetimeHeadcount,
          lifetimeOtHours,
          sitesWorked: Array.from(sitesWorkedSet),
        },
      });
    }

    // Case 2: Employee History
    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Employee ID or contractorTeamName required." }, { status: 400 });
    }

    const employee = await prisma.employeeOrLabour.findFirst({
      where: { id: employeeId, companyId: tenant.companyId },
      include: {
        attendances: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    const isOffice = employee.category === "OFFICE_STAFF";
    const yearlyMap: Record<string, any> = {};
    const sitesWorkedSet = new Set<string>();

    let lifetimePresent = 0;
    let lifetimeHalfDay = 0;
    let lifetimePermission = 0;
    let lifetimePermissionMorning = 0;
    let lifetimePermissionEvening = 0;
    let lifetimePaidLeave = 0;
    let lifetimeHalfPaidHoliday = 0;
    let lifetimeUnpaidLeave = 0;
    let lifetimeAbsent = 0;
    let lifetimeLeave = 0;
    let lifetimeAdvance = 0;
    let lifetimeOtHours = 0;
    const permissionsLog: any[] = [];
    const overtimeLog: any[] = [];

    const supportedYears = ["2025", "2026", "2027", "2028", "2029", "2030"];
    supportedYears.forEach((y) => {
      yearlyMap[y] = {
        year: y,
        totals: {
          present: 0,
          halfDay: 0,
          permission: 0,
          permissionMorning: 0,
          permissionEvening: 0,
          paidLeave: 0,
          halfPaidHoliday: 0,
          unpaidLeave: 0,
          absent: 0,
          leave: 0,
          otHours: 0,
          payableDays: 0,
          advances: 0,
        },
        months: Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
          present: 0,
          halfDay: 0,
          permission: 0,
          permissionMorning: 0,
          permissionEvening: 0,
          paidLeave: 0,
          halfPaidHoliday: 0,
          unpaidLeave: 0,
          absent: 0,
          leave: 0,
          otHours: 0,
          payableDays: 0,
          advances: 0,
          sites: new Set<string>(),
          dailyRecords: [] as any[],
        })),
      };
    });

    employee.attendances.forEach((att) => {
      const d = new Date(att.date);
      const year = d.getUTCFullYear().toString();
      const month = d.getUTCMonth();

      if (att.siteName) {
        sitesWorkedSet.add(att.siteName.trim());
      }

      if (!yearlyMap[year]) {
        yearlyMap[year] = {
          year,
          totals: {
            present: 0,
            halfDay: 0,
            permission: 0,
            permissionMorning: 0,
            permissionEvening: 0,
            paidLeave: 0,
            halfPaidHoliday: 0,
            unpaidLeave: 0,
            absent: 0,
            leave: 0,
            otHours: 0,
            payableDays: 0,
            advances: 0,
          },
          months: Array.from({ length: 12 }, (_, i) => ({
            monthIndex: i,
            monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
            present: 0,
            halfDay: 0,
            permission: 0,
            permissionMorning: 0,
            permissionEvening: 0,
            paidLeave: 0,
            halfPaidHoliday: 0,
            unpaidLeave: 0,
            absent: 0,
            leave: 0,
            otHours: 0,
            payableDays: 0,
            advances: 0,
            sites: new Set<string>(),
            dailyRecords: [] as any[],
          })),
        };
      }

      const yData = yearlyMap[year];
      const mData = yData.months[month];
      const advance = att.dailyAdvance ? Number(att.dailyAdvance) : 0;
      const ot = att.otHours ? Number(att.otHours) : 0;

      lifetimeAdvance += advance;
      lifetimeOtHours += ot;
      yData.totals.advances += advance;
      yData.totals.otHours = (yData.totals.otHours || 0) + ot;
      mData.advances += advance;
      mData.otHours = (mData.otHours || 0) + ot;

      if (att.siteName) {
        mData.sites.add(att.siteName.trim());
      }

      const dateStr = att.date.toISOString().split("T")[0];
      mData.dailyRecords.push({
        date: dateStr,
        status: att.status,
        inTime: att.inTime,
        outTime: att.outTime,
        siteName: att.siteName,
        dailyAdvance: advance,
        permissionNote: att.permissionNote,
        permissionSlot: att.permissionSlot,
        permissionTime: att.permissionTime,
        otHours: ot,
        otTimeRange: att.otTimeRange,
        otReason: att.otReason,
        workNotes: att.workNotes,
      });

      if (ot > 0) {
        overtimeLog.push({
          date: dateStr,
          otHours: ot,
          otTimeRange: att.otTimeRange || null,
          otReason: att.otReason || null,
        });
      }

      if (att.status === "P") {
        lifetimePresent++;
        yData.totals.present++;
        mData.present++;
      } else if (att.status === "H") {
        lifetimeHalfDay++;
        yData.totals.halfDay++;
        mData.halfDay++;
      } else if (att.status === "1H") {
        lifetimePermission++;
        yData.totals.permission++;
        mData.permission++;
        const isEve = att.permissionSlot === "EVENING";
        if (isEve) {
          lifetimePermissionEvening++;
          yData.totals.permissionEvening = (yData.totals.permissionEvening || 0) + 1;
          mData.permissionEvening = (mData.permissionEvening || 0) + 1;
        } else {
          lifetimePermissionMorning++;
          yData.totals.permissionMorning = (yData.totals.permissionMorning || 0) + 1;
          mData.permissionMorning = (mData.permissionMorning || 0) + 1;
        }
        permissionsLog.push({
          date: dateStr,
          inTime: att.inTime,
          outTime: att.outTime,
          slot: att.permissionSlot || "MORNING",
          time: att.permissionTime || null,
          note: att.permissionNote || att.workNotes || "1-Hour Permission",
        });
      } else if (att.status === "PL") {
        const isHalfPaid = Number(att.permissionHours) === 0.5 || (att.workNotes && att.workNotes.includes("HALF_PAID"));
        if (isHalfPaid) {
          lifetimeHalfPaidHoliday++;
          yData.totals.halfPaidHoliday++;
          mData.halfPaidHoliday++;
        } else {
          lifetimePaidLeave++;
          yData.totals.paidLeave++;
          mData.paidLeave++;
        }
      } else if (att.status === "UP") {
        lifetimeUnpaidLeave++;
        yData.totals.unpaidLeave++;
        mData.unpaidLeave++;
      } else if (att.status === "A") {
        lifetimeAbsent++;
        yData.totals.absent++;
        mData.absent++;
      } else if (att.status === "L") {
        lifetimeLeave++;
        yData.totals.leave++;
        mData.leave++;
      }
    });

    // Compute Net Payable Days per exact accounting rules
    supportedYears.forEach((y) => {
      const yData = yearlyMap[y];
      if (isOffice) {
        // Office Net Payable Days = P(1.0) + 1H(1.0) + PL(1.0) + (H * 0.5) + (Half-Day Paid Holiday * 0.5)
        yData.totals.payableDays =
          yData.totals.present +
          yData.totals.permission +
          yData.totals.paidLeave +
          yData.totals.halfDay * 0.5 +
          yData.totals.halfPaidHoliday * 0.5;

        yData.months = yData.months.map((m: any) => ({
          ...m,
          payableDays:
            m.present +
            m.permission +
            m.paidLeave +
            m.halfDay * 0.5 +
            m.halfPaidHoliday * 0.5,
          sites: Array.from(m.sites || []),
        }));
      } else {
        // Labour Net Payable Days = P(1.0) + 1H(1.0) + (H * 0.5) (Work = Paid, No work = No pay)
        yData.totals.payableDays =
          yData.totals.present +
          yData.totals.permission +
          yData.totals.halfDay * 0.5;

        yData.months = yData.months.map((m: any) => ({
          ...m,
          payableDays: m.present + m.permission + m.halfDay * 0.5,
          sites: Array.from(m.sites || []),
        }));
      }
    });

    const lifetimePayableDays = isOffice
      ? lifetimePresent +
        lifetimePermission +
        lifetimePaidLeave +
        lifetimeHalfDay * 0.5 +
        lifetimeHalfPaidHoliday * 0.5
      : lifetimePresent + lifetimePermission + lifetimeHalfDay * 0.5;

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        empCode: employee.empCode,
        fatherName: employee.fatherName,
        phone: employee.phone,
        address: employee.address,
        aadhaarNumber: employee.aadhaarNumber,
        panNumber: employee.panNumber,
        bankName: employee.bankName,
        bankAccountNo: employee.bankAccountNo,
        bankIfsc: employee.bankIfsc,
        designation: employee.designation,
        role: employee.role,
        category: employee.category,
        companyUnit: employee.companyUnit,
        dateOfJoining: employee.dateOfJoining || employee.createdAt,
        dailyWage: employee.dailyWage ? Number(employee.dailyWage) : null,
        monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : null,
        status: employee.status,
      },
      yearsList: supportedYears,
      yearlyData: yearlyMap,
      permissionsLog,
      overtimeLog,
      lifetimeSummary: {
        totalRecords: employee.attendances.length,
        present: lifetimePresent,
        halfDay: lifetimeHalfDay,
        permission: lifetimePermission,
        permissionMorning: lifetimePermissionMorning,
        permissionEvening: lifetimePermissionEvening,
        paidLeave: lifetimePaidLeave,
        halfPaidHoliday: lifetimeHalfPaidHoliday,
        unpaidLeave: lifetimeUnpaidLeave,
        absent: lifetimeAbsent,
        leave: lifetimeLeave,
        otHours: lifetimeOtHours,
        payableDays: lifetimePayableDays,
        advances: lifetimeAdvance,
        sitesWorked: Array.from(sitesWorkedSet),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
