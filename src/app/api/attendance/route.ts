import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";
import { computeMonthWorkingDaysInfo, getTodayISTDateString, syncOpenDraftPayrollRunsForMonth } from "@/lib/payrollAttendanceSync";
import { getActiveTenantContext } from "@/lib/tenant";

function resolveSessionEmpCode(session: { email?: string | null; name?: string | null; role?: string | null } | null): string | null {
  if (!session) return null;
  const email = (session.email || "").toLowerCase();
  const match = email.match(/^(sr\d{3}|invi\d{3})@/i);
  if (match) return match[1].toUpperCase();
  const name = (session.name || "").toLowerCase();
  if (name.includes("manikandan")) return "SR006";
  if (name.includes("gowri")) return "SR009";
  if (name.includes("monika")) return "SR002";
  return null;
}

function isHrOrSuperAdmin(session: { email?: string | null; name?: string | null; role?: string | null } | null): boolean {
  if (!session) return true; // internal/non-auth fallback
  const role = String(session.role || "").toUpperCase();
  if (role === "SUPER_ADMIN" || role === "HR" || role === "ADMIN") return true;
  const email = (session.email || "").toLowerCase();
  if (email.startsWith("hr@") || email.startsWith("sr002@")) return true;
  return false;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || getTodayISTDateString(); // live auto-today default
    const monthStr = searchParams.get("month") || dateStr.substring(0, 7); // YYYY-MM
    const category = searchParams.get("category"); // OFFICE_STAFF, TAMIL_LABOUR, HINDI_LABOUR
    const companyUnit = searchParams.get("companyUnit"); // STANDARD_ROOFS, INVI_CREATION

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Month range
    const [year, month] = monthStr.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Strictly isolate active employees by tenant.companyId
    const whereEmployee: any = {
      status: "ACTIVE",
      companyId: tenant.companyId,
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
              employee: { companyId: tenant.companyId },
            },
            include: {
              employee: true,
            },
          }),
          prisma.contractorDailyLog.findMany({
            where: {
              companyId: tenant.companyId,
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
              OR: [{ companyId: "ALL" }, { companyId: tenant.companyId }],
            },
            orderBy: { date: "asc" },
          }),
          prisma.contractor.findMany({
            where: {
              status: "ACTIVE",
              companyId: tenant.companyId,
            },
            orderBy: { code: "asc" },
          }),
          prisma.leaveRequest.findMany({
            where: {
              companyId: tenant.companyId,
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
                  reportingManagerCode: true,
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
        const allLeaves = results[5];
        const session = await getCurrentUserSession();
        const myCode = resolveSessionEmpCode(session);
        if (!isHrOrSuperAdmin(session) && (myCode === "SR006" || myCode === "SR009")) {
          leaveRequests = allLeaves.filter((lr: any) => {
            const approver = lr.assignedApproverCode || lr.employee?.reportingManagerCode || "SR009";
            return approver === myCode;
          });
        } else {
          leaveRequests = allLeaves;
        }
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

    const monthInfo = await computeMonthWorkingDaysInfo(monthStr, "FULL", tenant.companyId);

    const safeEmployees = tenant.isSuperAdmin
      ? employees
      : employees.map((e) => ({
          ...e,
          monthlySalary: null,
          dailyWage: null,
          baseWage: null,
          defaultVehicleAllowance: 0,
          salaryMasked: true,
        }));

    return NextResponse.json({
      success: true,
      date: dateStr,
      month: monthStr,
      year: year || 2026,
      isSunday,
      activeCompany: {
        id: tenant.companyId,
        code: tenant.companyCode,
        name: tenant.companyName,
        tagline: tenant.companyTagline,
      },
      employees: safeEmployees,
      contractors: contractorList,
      contractorLogs,
      holidays,
      leaveRequests,
      monthSummary: {
        totalDaysInMonth: monthInfo.totalDaysInMonth,
        sundaysCount: monthInfo.sundaysCount,
        paidHolidaysCount: monthInfo.paidHolidaysCount,
        unpaidShutdownCount: monthInfo.unpaidShutdownCount,
        scheduledWorkingDays: monthInfo.scheduledWorkingDays,
        todayISO: monthInfo.todayISO,
      },
      kpis: {
        totalOfficeStaff: officeStaff.length,
        presentOfficeToday: presentOffice,
        halfDayOfficeToday: halfDayOffice,
        permissionOfficeToday: permissionOffice,
        leaveOfficeToday: isSunday ? officeStaff.length : leaveOffice,
        absentOfficeToday: absentOffice,
        unmarkedOfficeToday: isSunday ? 0 : unmarkedOffice,
        totalTamilLabours: tamilLabours.length,
        activeTamilSiteLabours: activeTamil,
        siteBreakdown,
        totalHindiLabours: hindiLabours.length,
        activeHindiToday: activeHindi,
        totalContractorTeams: contractorList.length,
        contractorHeadcountToday: contractorHeadcount,
        contractorsOnDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
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
        permissionMinutes,
        permissionStatus,
        permissionSlot,
        permissionTime,
        otHours,
        otApprovalStatus,
        otTimeRange,
        otReason,
        workNotes,
      } = record;
      const targetDate = new Date(`${rDate}T00:00:00.000Z`);

      const emp = await prisma.employeeOrLabour.findFirst({
        where: { id: employeeId, companyId: tenant.companyId },
      });
      if (!emp) {
        return NextResponse.json({ success: false, error: "Employee not found in active organization." }, { status: 404 });
      }

      const savedNote = permissionNote || workNotes || (status === "1H" ? "1-Hour Permission" : null);
      const parsedPermMins = permissionMinutes !== undefined ? Number(permissionMinutes) : status === "1H" ? 60 : 0;
      const parsedPermHours =
        permissionHours !== undefined && permissionHours !== null
          ? Number(permissionHours)
          : parsedPermMins > 0
          ? Math.round((parsedPermMins / 60) * 100) / 100
          : status === "1H"
          ? 1.0
          : null;

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
          permissionHours: parsedPermHours,
          permissionMinutes: parsedPermMins,
          permissionStatus: permissionStatus ?? null,
          permissionSlot: permissionSlot ?? null,
          permissionTime: permissionTime ?? null,
          otHours: otHours !== undefined ? Number(otHours) : 0,
          otApprovalStatus: otApprovalStatus ?? null,
          otTimeRange: otTimeRange ?? null,
          otReason: otReason ?? null,
          workNotes: savedNote,
          category: emp.category,
          companyUnit: emp.companyUnit,
          companyId: tenant.companyId,
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
          permissionHours: parsedPermHours,
          permissionMinutes: parsedPermMins,
          permissionStatus: permissionStatus ?? null,
          permissionSlot: permissionSlot ?? null,
          permissionTime: permissionTime ?? null,
          otHours: otHours !== undefined ? Number(otHours) : 0,
          otApprovalStatus: otApprovalStatus ?? null,
          otTimeRange: otTimeRange ?? null,
          otReason: otReason ?? null,
          workNotes: savedNote,
          category: emp.category,
          companyUnit: emp.companyUnit,
          companyId: tenant.companyId,
        },
      });

      // Log into Team Lead -> HR approval queue when Permission (15m-3h) or OT is flagged PENDING
      const needsPermQueue = parsedPermMins > 0 && permissionStatus === "PENDING";
      const needsOtQueue = Number(otHours || 0) > 0 && otApprovalStatus === "PENDING";
      if ((needsPermQueue || needsOtQueue) && emp) {
        const empCodeUpper = (emp.employeeCode || "").toUpperCase();
        const approverCode =
          emp.reportingManagerCode ||
          (["SR004", "SR007", "SR008"].includes(empCodeUpper) ? "SR006" : "SR009");
        const approverLabel = approverCode === "SR006" ? "Sri Manikandan (SR006)" : "Gowri (SR009)";
        if (needsPermQueue) {
          await prisma.leaveRequest.create({
            data: {
              employeeId,
              companyId: emp.companyId,
              leaveCategory: "PERMISSION_1H",
              dayType: parsedPermMins >= 60 ? "PERMISSION" : `${parsedPermMins}M`,
              startDate: targetDate,
              endDate: targetDate,
              totalDays: Math.round((parsedPermMins / 480) * 100) / 100 || 0.1,
              reason: savedNote || `Permission (${parsedPermMins}m) · In ${inTime || "—"}`,
              assignedTeamLead: approverLabel,
              assignedApproverCode: approverCode,
              teamLeadStatus: "PENDING",
              hrStatus: "PENDING",
              status: "PENDING_TEAM_LEAD",
            },
          });
        }
        if (needsOtQueue) {
          await prisma.leaveRequest.create({
            data: {
              employeeId,
              companyId: emp.companyId,
              leaveCategory: "GENERAL_REQUEST",
              dayType: "OT",
              startDate: targetDate,
              endDate: targetDate,
              totalDays: Math.round((Number(otHours || 0) / 8) * 100) / 100 || 0.1,
              reason: otReason || `Overtime +${otHours}h (${inTime || "09:00"} – ${outTime || "19:30"})`,
              assignedTeamLead: approverLabel,
              assignedApproverCode: approverCode,
              teamLeadStatus: "PENDING",
              hrStatus: "PENDING",
              status: "PENDING_TEAM_LEAD",
            },
          });
        }
      }

      if (rDate) {
        await syncOpenDraftPayrollRunsForMonth(String(rDate).substring(0, 7), tenant.companyId);
      }

      return NextResponse.json({ success: true, updated });
    }

    // 1.4 Submit Leave Request (Stage 1: PENDING_TEAM_LEAD)
    if (action === "submit-leave" && body.employeeId) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate || body.startDate);
      const days = Math.max(
        0.5,
        body.dayType === "HALF_DAY" ? 0.5 : Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      );
      const emp = await prisma.employeeOrLabour.findFirst({
        where: { id: body.employeeId, companyId: tenant.companyId },
        select: { employeeCode: true, reportingManagerCode: true, companyId: true },
      });
      if (!emp) {
        return NextResponse.json({ success: false, error: "Employee not found in active organization" }, { status: 404 });
      }
      const empCodeUpper = (emp.employeeCode || "").toUpperCase();
      const approverCode =
        emp.reportingManagerCode ||
        (["SR004", "SR007", "SR008"].includes(empCodeUpper) ? "SR006" : "SR009");
      const approverLabel =
        approverCode === "SR006" ? "Sri Manikandan (SR006)" : "Gowri (SR009)";

      const created = await prisma.leaveRequest.create({
        data: {
          employeeId: body.employeeId,
          companyId: emp.companyId,
          leaveCategory: body.leaveCategory || "PLANNED",
          dayType: body.dayType || "FULL_DAY",
          startDate: start,
          endDate: end,
          totalDays: days,
          reason: body.reason || "Personal / Medical Leave",
          assignedTeamLead: body.assignedTeamLead || approverLabel,
          assignedApproverCode: approverCode,
          teamLeadStatus: "PENDING",
          hrStatus: "PENDING",
          status: "PENDING_TEAM_LEAD",
        },
      });
      return NextResponse.json({ success: true, leaveRequest: created });
    }

    // 1.45 Stage 1 Team Lead Approve / Reject
    if (action === "team-lead-approve" && body.requestId) {
      const session = await getCurrentUserSession();
      const myCode = resolveSessionEmpCode(session);
      const existingLeave = await prisma.leaveRequest.findFirst({
        where: { id: body.requestId, companyId: tenant.companyId },
        include: { employee: { select: { reportingManagerCode: true } } },
      });
      if (!existingLeave) {
        return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
      }
      const assignedCode =
        existingLeave.assignedApproverCode || existingLeave.employee?.reportingManagerCode || "SR009";
      if (!isHrOrSuperAdmin(session) && myCode && assignedCode !== myCode) {
        return NextResponse.json(
          { success: false, error: `Only assigned Team Lead (${assignedCode}) or HR can approve Stage 1.` },
          { status: 403 }
        );
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: body.requestId },
        data: {
          teamLeadStatus: "APPROVED",
          teamLeadBy: body.reviewedBy || existingLeave.assignedTeamLead || "Team Lead",
          teamLeadAt: new Date(),
          teamLeadRemarks: body.remarks || "Approved by Team Lead",
          status: "PENDING_HR",
        },
      });
      return NextResponse.json({ success: true, leaveRequest: updated, message: "Stage 1 approved. Routed to HR." });
    }

    if (action === "team-lead-reject" && body.requestId) {
      const session = await getCurrentUserSession();
      const myCode = resolveSessionEmpCode(session);
      const existingLeave = await prisma.leaveRequest.findFirst({
        where: { id: body.requestId, companyId: tenant.companyId },
        include: { employee: { select: { reportingManagerCode: true } } },
      });
      if (!existingLeave) {
        return NextResponse.json({ success: false, error: "Leave request not found" }, { status: 404 });
      }
      const assignedCode =
        existingLeave.assignedApproverCode || existingLeave.employee?.reportingManagerCode || "SR009";
      if (!isHrOrSuperAdmin(session) && myCode && assignedCode !== myCode) {
        return NextResponse.json(
          { success: false, error: `Only assigned Team Lead (${assignedCode}) or HR can reject Stage 1.` },
          { status: 403 }
        );
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: body.requestId },
        data: {
          teamLeadStatus: "REJECTED",
          teamLeadBy: body.reviewedBy || existingLeave.assignedTeamLead || "Team Lead",
          teamLeadAt: new Date(),
          teamLeadRemarks: body.remarks || "Rejected by Team Lead",
          rejectionNote: body.remarks || "Rejected by Team Lead",
          status: "REJECTED",
        },
      });
      return NextResponse.json({ success: true, leaveRequest: updated, message: "Rejected by Team Lead." });
    }

    // 1.5 Approve Employee Leave Request (Stage 2 HR Final Approval)
    if (action === "approve-leave" && body.requestId) {
      const leave = await prisma.leaveRequest.findFirst({
        where: { id: body.requestId, companyId: tenant.companyId },
        include: { employee: true },
      });
      if (!leave) {
        return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
      }

      await prisma.leaveRequest.update({
        where: { id: body.requestId },
        data: {
          hrStatus: "APPROVED",
          hrBy: body.reviewedBy || "HR Admin (Monika R)",
          hrAt: new Date(),
          hrRemarks: body.remarks || "Final HR approval",
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

      const startMonth = start.toISOString().substring(0, 7);
      const endMonth = end.toISOString().substring(0, 7);
      await syncOpenDraftPayrollRunsForMonth(startMonth, tenant.companyId);
      if (endMonth !== startMonth) {
        await syncOpenDraftPayrollRunsForMonth(endMonth, tenant.companyId);
      }

      return NextResponse.json({ success: true, message: "Leave approved and attendance matrix updated." });
    }

    // 1.6 Reject Employee Leave Request
    if (action === "reject-leave" && body.requestId) {
      const targetLeave = await prisma.leaveRequest.findFirst({
        where: { id: body.requestId, companyId: tenant.companyId },
      });
      if (!targetLeave) {
        return NextResponse.json({ success: false, error: "Leave request not found in active organization." }, { status: 404 });
      }
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
          permissionMinutes,
          permissionStatus,
          otHours,
          otApprovalStatus,
          workNotes,
        } = item;
        const targetDate = new Date(`${rDate}T00:00:00.000Z`);
        const emp = await prisma.employeeOrLabour.findFirst({ where: { id: employeeId, companyId: tenant.companyId } });
        if (!emp) continue;

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
            permissionMinutes: permissionMinutes !== undefined ? Number(permissionMinutes) : status === "1H" ? 60 : 0,
            permissionStatus: permissionStatus ?? null,
            otHours: otHours !== undefined ? Number(otHours) : 0,
            otApprovalStatus: otApprovalStatus ?? null,
            workNotes: workNotes ?? null,
            category: emp.category,
            companyUnit: emp.companyUnit,
            companyId: tenant.companyId,
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
            permissionMinutes: permissionMinutes !== undefined ? Number(permissionMinutes) : status === "1H" ? 60 : 0,
            permissionStatus: permissionStatus ?? null,
            otHours: otHours !== undefined ? Number(otHours) : 0,
            otApprovalStatus: otApprovalStatus ?? null,
            workNotes: workNotes ?? null,
            category: emp.category,
            companyUnit: emp.companyUnit,
            companyId: tenant.companyId,
          },
        });
        results.push(res);
      }
      const affectedMonths = Array.from(new Set(records.map((r: any) => String(r.date || "").substring(0, 7)).filter(Boolean)));
      for (const m of affectedMonths) {
        await syncOpenDraftPayrollRunsForMonth(m, tenant.companyId);
      }
      return NextResponse.json({ success: true, count: results.length });
    }

    // 3. Mark All Present (P)
    if (action === "mark-all-present" && date && category) {
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      const employees = await prisma.employeeOrLabour.findMany({
        where: { category, status: "ACTIVE", companyId: tenant.companyId },
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
            companyId: tenant.companyId,
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
            companyId: tenant.companyId,
            siteName: siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"),
            inTime: emp.category === "OFFICE_STAFF" ? "09:00 AM" : null,
            outTime: emp.category === "OFFICE_STAFF" ? "07:00 PM" : null,
          },
        })
      );

      await Promise.all(promises);
      await syncOpenDraftPayrollRunsForMonth(String(date).substring(0, 7), tenant.companyId);
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
        where: { status: "ACTIVE", companyId: tenant.companyId },
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
              companyId: tenant.companyId,
            },
            create: {
              employeeId: emp.id,
              date: targetDate,
              status: "L",
              workNotes: "Weekly Off (Sunday)",
              category: emp.category,
              companyUnit: emp.companyUnit,
              companyId: tenant.companyId,
            },
          })
        );
        await Promise.all(promises);
        markedCount += activeEmployees.length;
      }

      await syncOpenDraftPayrollRunsForMonth(month, tenant.companyId);

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
          companyId: tenant.companyId,
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
            companyId: tenant.companyId,
          },
          create: {
            employeeId: y.employeeId,
            date: currDate,
            siteName: y.siteName,
            status: y.status || "P",
            category: y.category,
            companyUnit: y.companyUnit,
            companyId: tenant.companyId,
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
        const existingLog = await prisma.contractorDailyLog.findFirst({ where: { id, companyId: tenant.companyId } });
        if (!existingLog) {
          return NextResponse.json({ success: false, error: "Log not found in active organization" }, { status: 404 });
        }
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
            companyId: tenant.companyId,
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
