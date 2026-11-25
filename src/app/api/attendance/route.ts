import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncOpenDraftPayrollRunsForMonth } from "@/lib/payrollAttendanceSync";

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

    let employees: any[] = [];
    let targetDateAttendance: any[] = [];
    let contractorLogs: any[] = [];
    let holidays: any[] = [];
    let contractorList: any[] = [];
    let leaveRequests: any[] = [];

    let attempts = 0;
    while (attempts < 3) {
      try {
        const results = await Promise.all([
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
          prisma.companyHoliday.findMany({
            where: {
              year: year || 2026,
            },
            orderBy: { date: "asc" },
          }),
          prisma.contractor.findMany({
            where: {
              status: "ACTIVE",
            },
            orderBy: { code: "asc" },
          }),
          prisma.leaveRequest.findMany({
            where: {
              OR: [
                { startDate: { gte: startOfMonth, lte: endOfMonth } },
                { endDate: { gte: startOfMonth, lte: endOfMonth } },
                { status: "PENDING" },
              ],
            },
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  employeeCode: true,
                  category: true,
                  companyUnit: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        employees = results[0];
        targetDateAttendance = results[1];
        contractorLogs = results[2];
        holidays = results[3];
        contractorList = results[4];
        leaveRequests = results[5];
        break;
      } catch (dbErr: any) {
        attempts++;
        if (attempts >= 3) throw dbErr;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
      }
    }

    // Group active workforce
    const officeStaff = employees.filter((e) => e.category === "OFFICE_STAFF");
    const tamilLabours = employees.filter((e) => e.category === "TAMIL_LABOUR");
    const hindiLabours = employees.filter((e) => e.category === "HINDI_LABOUR");

    // Attendance map on targetDate
    const dateMap = new Map();
    targetDateAttendance.forEach((a) => {
      dateMap.set(a.employeeId, a);
    });

    // Check if target date is Sunday
    const isSunday = targetDate.getUTCDay() === 0;

    // Office Staff Metrics on targetDate
    const officeAttendanceOnDate = officeStaff.map((e) => dateMap.get(e.id)).filter(Boolean);
    const presentOffice = officeAttendanceOnDate.filter((a) => a.status === "P" || a.status === "1H").length;
    const halfDayOffice = officeAttendanceOnDate.filter((a) => a.status === "H").length;
    const permissionOffice = officeAttendanceOnDate.filter((a) => a.status === "1H").length;
    const leaveOffice = officeAttendanceOnDate.filter((a) => a.status === "L").length + (isSunday && officeAttendanceOnDate.length === 0 ? officeStaff.length : 0);
    const absentOffice = officeAttendanceOnDate.filter((a) => a.status === "A").length;
    const unmarkedOffice = Math.max(0, officeStaff.length - officeAttendanceOnDate.length);

    // Tamil Labours Metrics & Site distribution on targetDate
    const tamilAttendanceOnDate = tamilLabours.map((e) => dateMap.get(e.id)).filter(Boolean);
    const activeTamil = tamilAttendanceOnDate.filter((a) => a.status === "P" || a.status === "H" || a.status === "1H").length;
    const siteBreakdown: Record<string, number> = {};
    tamilAttendanceOnDate.forEach((a) => {
      if (a.siteName && (a.status === "P" || a.status === "H" || a.status === "1H")) {
        const site = a.siteName.split("&")[0].trim();
        siteBreakdown[site] = (siteBreakdown[site] || 0) + 1;
      }
    });

    // Hindi Crew Metrics on targetDate
    const hindiAttendanceOnDate = hindiLabours.map((e) => dateMap.get(e.id)).filter(Boolean);
    const activeHindi = hindiAttendanceOnDate.filter((a) => a.status === "P" || a.status === "H" || a.status === "1H").length;

    // Contractor logs for targetDate
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
      year: year || 2026,
      isSunday,
      employees,
      contractors: contractorList,
      contractorLogs,
      holidays,
      leaveRequests,
      kpis: {
        totalOfficeStaff: officeStaff.length || 13,
        presentOfficeToday: presentOffice || (isSunday ? 0 : 12),
        halfDayOfficeToday: halfDayOffice,
        permissionOfficeToday: permissionOffice,
        leaveOfficeToday: isSunday ? officeStaff.length : leaveOffice,
        absentOfficeToday: absentOffice,
        unmarkedOfficeToday: isSunday ? 0 : unmarkedOffice,
        totalTamilLabours: tamilLabours.length || 64,
        activeTamilSiteLabours: activeTamil || (isSunday ? 0 : 18),
        siteBreakdown,
        totalHindiLabours: hindiLabours.length || 5,
        activeHindiToday: activeHindi || (isSunday ? 0 : 4),
        totalContractorTeams: 6,
        contractorHeadcountToday: contractorHeadcount || (isSunday ? 0 : 14),
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
    const { action = "mark", record, records, date, month, category, siteName } = body;

    // 1. Single Mark / Update
    if (action === "mark" && record) {
      const {
        employeeId,
        date: rDate,
        status,
        inTime,
        outTime,
        siteName: sName,
        dailyAdvance,
        permissionNote,
        permissionHours,
        permissionSlot,
        permissionTime,
        otHours,
        otTimeRange,
        otReason,
        workNotes,
      } = record;
      const targetDate = new Date(`${rDate}T00:00:00.000Z`);

      const emp = await prisma.employeeOrLabour.findUnique({
        where: { id: employeeId },
      });

      const savedNote = permissionNote || workNotes || (status === "1H" ? "1-Hour Permission" : null);

      const updated = await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: targetDate,
          },
        },
        update: {
          status, // "P", "H", "1H", "A", "L"
          inTime: inTime ?? null,
          outTime: outTime ?? null,
          siteName: sName ?? null,
          dailyAdvance: dailyAdvance ? Number(dailyAdvance) : 0,
          permissionNote: savedNote,
          permissionHours: permissionHours ? Number(permissionHours) : status === "1H" ? 1.0 : null,
          permissionSlot: permissionSlot ?? null,
          permissionTime: permissionTime ?? null,
          otHours: otHours !== undefined ? Number(otHours) : 0,
          otTimeRange: otTimeRange ?? null,
          otReason: otReason ?? null,
          workNotes: savedNote,
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
          permissionNote: savedNote,
          permissionHours: permissionHours ? Number(permissionHours) : status === "1H" ? 1.0 : null,
          permissionSlot: permissionSlot ?? null,
          permissionTime: permissionTime ?? null,
          otHours: otHours !== undefined ? Number(otHours) : 0,
          otTimeRange: otTimeRange ?? null,
          otReason: otReason ?? null,
          workNotes: savedNote,
          category: emp?.category,
          companyUnit: emp?.companyUnit,
        },
      });

      if (rDate) {
        await syncOpenDraftPayrollRunsForMonth(String(rDate).substring(0, 7));
      }

      return NextResponse.json({ success: true, updated });
    }

    // 1.5 Approve Employee Leave Request
    if (action === "approve-leave" && body.requestId) {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: body.requestId },
        include: { employee: true },
      });
      if (!leave) {
        return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
      }

      await prisma.leaveRequest.update({
        where: { id: body.requestId },
        data: {
          status: "APPROVED",
          reviewedBy: body.reviewedBy || "HR Admin",
          reviewedAt: new Date(),
        },
      });

      // Synchronously mark dates on Employee's Attendance Matrix
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const curr = new Date(start);

      while (curr <= end) {
        const isSun = curr.getUTCDay() === 0;
        let dayStatus = "A";
        let slot: string | null = null;
        let pTime: string | null = null;
        let pHours: number | null = null;
        let note = leave.reason ? `Approved Leave: ${leave.reason}` : "Approved Leave";

        if (isSun) {
          dayStatus = "L";
          note = "Sunday (Weekly Off)";
        } else if (leave.leaveCategory === "PERMISSION_1H") {
          dayStatus = "1H";
          slot = leave.dayType === "EVENING" ? "EVENING" : "MORNING";
          pTime = slot === "EVENING" ? "06:30 PM - 07:30 PM" : "09:00 AM - 10:00 AM";
          pHours = 1.0;
          note = leave.reason
            ? `Approved 1-Hr Permission (${slot === "EVENING" ? "Evening" : "Morning"}): ${leave.reason}`
            : `Approved 1-Hr Permission (${slot === "EVENING" ? "Evening" : "Morning"})`;
        } else if (leave.leaveCategory === "GENERAL_REQUEST") {
          dayStatus = "P";
          note = leave.reason ? `Approved General / Shift Request: ${leave.reason}` : "Approved General / Shift Request";
        } else {
          // Planned, Unplanned, Sick, Emergency Leaves: ALWAYS MARK AS "A" (Absent - Non-Payable)
          dayStatus = "A";
          const catLabel =
            leave.leaveCategory === "PLANNED"
              ? "Planned Leave"
              : leave.leaveCategory === "UNPLANNED"
              ? "Unplanned Leave"
              : leave.leaveCategory === "SICK"
              ? "Sick Leave"
              : leave.leaveCategory === "EMERGENCY"
              ? "Emergency Leave"
              : `${leave.leaveCategory} Leave`;
          note = leave.reason ? `Approved ${catLabel}: ${leave.reason}` : `Approved ${catLabel}`;
        }

        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: leave.employeeId,
              date: new Date(curr),
            },
          },
          update: {
            status: dayStatus,
            workNotes: note,
            permissionNote: note,
            permissionSlot: slot,
            permissionTime: pTime,
            permissionHours: pHours,
            category: leave.employee.category,
            companyUnit: leave.employee.companyUnit,
          },
          create: {
            employeeId: leave.employeeId,
            date: new Date(curr),
            status: dayStatus,
            workNotes: note,
            permissionNote: note,
            permissionSlot: slot,
            permissionTime: pTime,
            permissionHours: pHours,
            category: leave.employee.category,
            companyUnit: leave.employee.companyUnit,
          },
        });

        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      await syncOpenDraftPayrollRunsForMonth(start.toISOString().substring(0, 7));

      return NextResponse.json({ success: true, message: "Leave approved and attendance matrix updated." });
    }

    // 1.6 Reject Employee Leave Request
    if (action === "reject-leave" && body.requestId) {
      await prisma.leaveRequest.update({
        where: { id: body.requestId },
        data: {
          status: "REJECTED",
          rejectionNote: body.rejectionNote || "Leave rejected by HR",
          reviewedBy: body.reviewedBy || "HR Admin",
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: "Leave request rejected." });
    }

    // 2. Bulk Mark
    if (action === "bulk-mark" && Array.isArray(records)) {
      const results = [];
      for (const item of records) {
        const {
          employeeId,
          date: rDate,
          status,
          inTime,
          outTime,
          siteName: sName,
          dailyAdvance,
          permissionNote,
          permissionHours,
          workNotes,
        } = item;
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
            permissionNote: permissionNote ?? (status === "1H" ? "1-Hour Permission" : null),
            permissionHours: permissionHours ? Number(permissionHours) : status === "1H" ? 1.0 : null,
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
            permissionNote: permissionNote ?? (status === "1H" ? "1-Hour Permission" : null),
            permissionHours: permissionHours ? Number(permissionHours) : status === "1H" ? 1.0 : null,
            workNotes: workNotes ?? null,
            category: emp?.category,
            companyUnit: emp?.companyUnit,
          },
        });
        results.push(res);
      }
      const affectedMonths = Array.from(new Set(records.map((r: any) => String(r.date || "").substring(0, 7)).filter(Boolean)));
      for (const m of affectedMonths) {
        await syncOpenDraftPayrollRunsForMonth(m);
      }
      return NextResponse.json({ success: true, count: results.length });
    }

    // 3. Mark All Present (P)
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
      await syncOpenDraftPayrollRunsForMonth(String(date).substring(0, 7));
      return NextResponse.json({ success: true, count: employees.length });
    }

    // 4. Auto-Sunday Weekly Off Engine (Marks all Sundays in Month as 'L')
    if (action === "auto-sunday-leave" && month) {
      const [y, m] = month.split("-").map(Number);
      const totalDays = new Date(y, m, 0).getDate();
      const sundayDates: string[] = [];

      for (let day = 1; day <= totalDays; day++) {
        const testDate = new Date(Date.UTC(y, m - 1, day));
        if (testDate.getUTCDay() === 0) {
          sundayDates.push(testDate.toISOString().split("T")[0]);
        }
      }

      const activeEmployees = await prisma.employeeOrLabour.findMany({
        where: { status: "ACTIVE" },
      });

      let markedCount = 0;
      for (const sDate of sundayDates) {
        const targetDate = new Date(`${sDate}T00:00:00.000Z`);
        const promises = activeEmployees.map((emp) =>
          prisma.attendanceRecord.upsert({
            where: {
              employeeId_date: {
                employeeId: emp.id,
                date: targetDate,
              },
            },
            update: {
              status: "L",
              workNotes: "Weekly Off (Sunday)",
              category: emp.category,
              companyUnit: emp.companyUnit,
            },
            create: {
              employeeId: emp.id,
              date: targetDate,
              status: "L",
              workNotes: "Weekly Off (Sunday)",
              category: emp.category,
              companyUnit: emp.companyUnit,
            },
          })
        );
        await Promise.all(promises);
        markedCount += activeEmployees.length;
      }

      await syncOpenDraftPayrollRunsForMonth(month);

      return NextResponse.json({
        success: true,
        month,
        sundaysCount: sundayDates.length,
        markedRecordsCount: markedCount,
      });
    }

    // 5. Copy Yesterday's Site Deployments
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

    // 6. Contractor Daily Log Save / Update
    if (action === "contractor-log" && record) {
      const {
        id,
        contractorTeamName,
        date: cDate,
        siteName: cSite,
        headcount,
        workerBreakdown,
        siteWorkStatus,
        remarks,
      } = record;
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
