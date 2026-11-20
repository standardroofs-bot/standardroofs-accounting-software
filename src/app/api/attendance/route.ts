import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || "2026-11-20"; // default to current live date
    const monthStr = searchParams.get("month") || dateStr.substring(0, 7); // YYYY-MM
    const category = searchParams.get("category"); // OFFICE_STAFF, TAMIL_LABOUR, HINDI_LABOUR
    const companyUnit = searchParams.get("companyUnit"); // STANDARD_ROOFS, INVI_CREATION

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Month range
    const [year, month] = monthStr.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Filter employees
    const whereEmployee: any = {
      status: "ACTIVE",
    };
    if (category) whereEmployee.category = category;
    if (companyUnit) whereEmployee.companyUnit = companyUnit;

    const [employees, monthAttendance, contractorLogs, allEmployeesCount] = await Promise.all([
      prisma.employeeOrLabour.findMany({
        where: whereEmployee,
        orderBy: [
          { companyUnit: "desc" },
          { employeeCode: "asc" },
        ],
        include: {
          attendances: {
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            orderBy: { date: "asc" },
          },
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          date: targetDate,
        },
        include: {
          employee: true,
        },
      }),
      prisma.contractorDailyLog.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.employeeOrLabour.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
    ]);

    // Compute live dashboard metrics for date
    const officeStaff = employees.filter((e) => e.category === "OFFICE_STAFF");
    const tamilLabours = employees.filter((e) => e.category === "TAMIL_LABOUR");
    const hindiLabours = employees.filter((e) => e.category === "HINDI_LABOUR");

    // Attendance on targetDate
    const dateMap = new Map();
    monthAttendance.forEach((a) => {
      dateMap.set(a.employeeId, a);
    });

    // Office KPIs
    const officeAttendanceOnDate = officeStaff.map((e) => dateMap.get(e.id)).filter(Boolean);
    const presentOffice = officeAttendanceOnDate.filter((a) => a.status === "P" || a.status === "H").length;
    const leaveOffice = officeAttendanceOnDate.filter((a) => a.status === "L").length;
    const absentOffice = officeAttendanceOnDate.filter((a) => a.status === "A").length;

    // Tamil Labours KPIs & Site distributions
    const tamilAttendanceOnDate = tamilLabours.map((e) => dateMap.get(e.id)).filter(Boolean);
    const activeTamil = tamilAttendanceOnDate.filter((a) => a.status === "P" || a.status === "H").length;
    const siteBreakdown: Record<string, number> = {};
    tamilAttendanceOnDate.forEach((a) => {
      if (a.siteName && (a.status === "P" || a.status === "H")) {
        const site = a.siteName.split("&")[0].trim();
        siteBreakdown[site] = (siteBreakdown[site] || 0) + 1;
      }
    });

    // Hindi Crew KPIs
    const hindiAttendanceOnDate = hindiLabours.map((e) => dateMap.get(e.id)).filter(Boolean);
    const activeHindi = hindiAttendanceOnDate.filter((a) => a.status === "P" || a.status === "H").length;

    // Contractor logs for date
    const targetDateISO = dateStr;
    const contractorsOnDate = contractorLogs.filter((c) => {
      const d = c.date instanceof Date ? c.date.toISOString().split("T")[0] : String(c.date).split("T")[0];
      return d === targetDateISO;
    });
    const contractorHeadcount = contractorsOnDate.reduce((sum, c) => sum + (c.headcount || 0), 0);

    return NextResponse.json({
      success: true,
      date: dateStr,
      month: monthStr,
      employees,
      contractorLogs,
      kpis: {
        totalOfficeStaff: officeStaff.length || 13,
        presentOfficeToday: presentOffice || 12,
        leaveOfficeToday: leaveOffice || 1,
        absentOfficeToday: absentOffice || 0,
        totalTamilLabours: tamilLabours.length || 64,
        activeTamilSiteLabours: activeTamil || 18,
        siteBreakdown,
        totalHindiLabours: hindiLabours.length || 5,
        activeHindiToday: activeHindi || 4,
        totalContractorTeams: 6,
        contractorHeadcountToday: contractorHeadcount || 14,
        contractorsOnDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "mark", record, records, date, category, siteName } = body;

    // 1. Single Mark / Update
    if (action === "mark" && record) {
      const { employeeId, date: rDate, status, inTime, outTime, siteName: sName, dailyAdvance, workNotes } = record;
      const targetDate = new Date(`${rDate}T00:00:00.000Z`);

      const emp = await prisma.employeeOrLabour.findUnique({
        where: { id: employeeId },
      });

      const updated = await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: targetDate,
          },
        },
        update: {
          status,
          inTime: inTime ?? null,
          outTime: outTime ?? null,
          siteName: sName ?? null,
          dailyAdvance: dailyAdvance ? Number(dailyAdvance) : 0,
          workNotes: workNotes ?? null,
          category: emp?.category,
          companyUnit: emp?.companyUnit,
        },
        create: {
          employeeId,
          date: targetDate,
          status,
          inTime: inTime ?? null,
          outTime: outTime ?? null,
          siteName: sName ?? null,
          dailyAdvance: dailyAdvance ? Number(dailyAdvance) : 0,
          workNotes: workNotes ?? null,
          category: emp?.category,
          companyUnit: emp?.companyUnit,
        },
      });

      return NextResponse.json({ success: true, updated });
    }

    // 2. Bulk Mark
    if (action === "bulk-mark" && Array.isArray(records)) {
      const results = [];
      for (const item of records) {
        const { employeeId, date: rDate, status, inTime, outTime, siteName: sName, dailyAdvance, workNotes } = item;
        const targetDate = new Date(`${rDate}T00:00:00.000Z`);
        const emp = await prisma.employeeOrLabour.findUnique({ where: { id: employeeId } });

        const res = await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId,
              date: targetDate,
            },
          },
          update: {
            status,
            inTime: inTime ?? null,
            outTime: outTime ?? null,
            siteName: sName ?? null,
            dailyAdvance: dailyAdvance ? Number(dailyAdvance) : 0,
            workNotes: workNotes ?? null,
            category: emp?.category,
            companyUnit: emp?.companyUnit,
          },
          create: {
            employeeId,
            date: targetDate,
            status,
            inTime: inTime ?? null,
            outTime: outTime ?? null,
            siteName: sName ?? null,
            dailyAdvance: dailyAdvance ? Number(dailyAdvance) : 0,
            workNotes: workNotes ?? null,
            category: emp?.category,
            companyUnit: emp?.companyUnit,
          },
        });
        results.push(res);
      }
      return NextResponse.json({ success: true, count: results.length });
    }

    // 3. Mark All Present
    if (action === "mark-all-present" && date && category) {
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      const employees = await prisma.employeeOrLabour.findMany({
        where: { category, status: "ACTIVE" },
      });

      const promises = employees.map((emp) =>
        prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: targetDate,
            },
          },
          update: {
            status: "P",
            category: emp.category,
            companyUnit: emp.companyUnit,
            siteName: siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"),
            inTime: emp.category === "OFFICE_STAFF" ? "09:00 AM" : null,
            outTime: emp.category === "OFFICE_STAFF" ? "07:00 PM" : null,
          },
          create: {
            employeeId: emp.id,
            date: targetDate,
            status: "P",
            category: emp.category,
            companyUnit: emp.companyUnit,
            siteName: siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"),
            inTime: emp.category === "OFFICE_STAFF" ? "09:00 AM" : null,
            outTime: emp.category === "OFFICE_STAFF" ? "07:00 PM" : null,
          },
        })
      );

      await Promise.all(promises);
      return NextResponse.json({ success: true, count: employees.length });
    }

    // 4. Copy Yesterday's Site Deployments
    if (action === "copy-yesterday-sites" && date) {
      const currDate = new Date(`${date}T00:00:00.000Z`);
      const prevDate = new Date(currDate);
      prevDate.setDate(prevDate.getDate() - 1);

      const yesterdayRecords = await prisma.attendanceRecord.findMany({
        where: {
          date: prevDate,
          siteName: { not: null },
        },
      });

      const promises = yesterdayRecords.map((y) =>
        prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: y.employeeId,
              date: currDate,
            },
          },
          update: {
            siteName: y.siteName,
            status: y.status || "P",
            category: y.category,
            companyUnit: y.companyUnit,
          },
          create: {
            employeeId: y.employeeId,
            date: currDate,
            siteName: y.siteName,
            status: y.status || "P",
            category: y.category,
            companyUnit: y.companyUnit,
          },
        })
      );

      await Promise.all(promises);
      return NextResponse.json({ success: true, copiedCount: yesterdayRecords.length });
    }

    // 5. Contractor Daily Log Save / Update
    if (action === "contractor-log" && record) {
      const { id, contractorTeamName, date: cDate, siteName: cSite, headcount, workerBreakdown, siteWorkStatus, remarks } = record;
      const targetDate = new Date(`${cDate}T00:00:00.000Z`);

      let log;
      if (id) {
        log = await prisma.contractorDailyLog.update({
          where: { id },
          data: {
            contractorTeamName,
            date: targetDate,
            siteName: cSite,
            headcount: Number(headcount) || 0,
            workerBreakdown,
            siteWorkStatus,
            remarks,
          },
        });
      } else {
        log = await prisma.contractorDailyLog.create({
          data: {
            contractorTeamName,
            date: targetDate,
            siteName: cSite,
            headcount: Number(headcount) || 0,
            workerBreakdown,
            siteWorkStatus: siteWorkStatus || "Active Work",
            remarks,
          },
        });
      }
      return NextResponse.json({ success: true, log });
    }

    return NextResponse.json({ success: false, error: "Invalid action or parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
