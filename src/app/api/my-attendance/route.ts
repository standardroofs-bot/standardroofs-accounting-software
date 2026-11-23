import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month") || "2026-11"; // YYYY-MM
    const requestedYear = searchParams.get("year") || monthStr.split("-")[0] || "2026";

    // Determine employeeId
    let employeeId = session.employeeId;
    if (!employeeId) {
      const u = await prisma.user.findUnique({ where: { id: session.userId } });
      employeeId = u?.employeeId || undefined;
    }

    // If still no employeeId, check if requested via param for HR/Admin preview
    if (!employeeId && (session.role === "SUPER_ADMIN" || session.role === "HR_MANAGER")) {
      employeeId = searchParams.get("employeeId") || undefined;
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "No employee profile found." }, { status: 404 });
    }

    const [year, month] = monthStr.split("-").map(Number);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Parallel fetch employee, attendances, company holidays, leave requests
    const [employee, attendances, holidays, leaveRequests] = await Promise.all([
      prisma.employeeOrLabour.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          employeeCode: true,
          empCode: true,
          name: true,
          designation: true,
          role: true,
          category: true,
          companyUnit: true,
          phone: true,
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          employeeId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.companyHoliday.findMany({
        where: {
          year: year || 2026,
        },
        orderBy: { date: "asc" },
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee record not found." }, { status: 404 });
    }

    if (employee.companyUnit !== "STANDARD_ROOFS") {
      return NextResponse.json(
        { success: false, error: "Access Denied: ESS Portal is restricted to Standard Roofs employees (SR001–SR010)." },
        { status: 403 }
      );
    }

    // Days in Month
    const daysInMonthCount = new Date(year, month, 0).getDate();
    const attendanceMap = new Map();
    attendances.forEach((a) => {
      const dStr = a.date instanceof Date ? a.date.toISOString().split("T")[0] : String(a.date).split("T")[0];
      attendanceMap.set(dStr, a);
    });

    const holidayMap = new Map();
    holidays.forEach((h) => {
      const dStr = h.date instanceof Date ? h.date.toISOString().split("T")[0] : String(h.date).split("T")[0];
      holidayMap.set(dStr, h);
    });

    let pCount = 0;
    let hCount = 0;
    let p1hCount = 0;
    let plCount = 0;
    let upCount = 0;
    let aCount = 0;
    let lCount = 0;
    let totalOTHours = 0;
    let mrgPermCount = 0;
    let evePermCount = 0;
    let sundaysCount = 0;
    let holidayCount = 0;

    const calendarDays = [];

    for (let day = 1; day <= daysInMonthCount; day++) {
      const dayStr = `${monthStr}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dateObj.getUTCDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayMap.has(dayStr);
      const holidayInfo = holidayMap.get(dayStr);

      if (isSunday) sundaysCount++;
      if (isHoliday && !isSunday) holidayCount++;

      const record = attendanceMap.get(dayStr);
      let status = record ? record.status : isSunday ? "L" : null;

      if (status === "P") pCount++;
      else if (status === "H") hCount++;
      else if (status === "1H") {
        p1hCount++;
        if (record?.permissionSlot === "EVENING") evePermCount++;
        else mrgPermCount++;
      } else if (status === "PL") plCount++;
      else if (status === "UP") upCount++;
      else if (status === "A") aCount++;
      else if (status === "L") lCount++;

      if (record?.otHours) {
        totalOTHours += Number(record.otHours);
      }

      calendarDays.push({
        dayNum: day,
        date: dayStr,
        dayName: dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        isSunday,
        isHoliday,
        holidayName: holidayInfo?.name || null,
        status: status || (isHoliday ? holidayInfo?.holidayType || "PL" : "PENDING"),
        inTime: record?.inTime || (status === "P" ? "09:00 AM" : null),
        outTime: record?.outTime || (status === "P" ? "07:00 PM" : null),
        permissionSlot: record?.permissionSlot || null,
        permissionTime: record?.permissionTime || null,
        permissionNote: record?.permissionNote || null,
        otHours: record?.otHours || 0,
        otTimeRange: record?.otTimeRange || null,
        otReason: record?.otReason || null,
        workNotes: record?.workNotes || null,
      });
    }

    const scheduledWorkingDays = daysInMonthCount - sundaysCount - holidayCount;
    const netPayableDays = pCount + p1hCount + plCount + hCount * 0.5;
    const attendancePercentage = scheduledWorkingDays > 0 ? Math.round((netPayableDays / scheduledWorkingDays) * 100) : 100;

    return NextResponse.json({
      success: true,
      month: monthStr,
      year: year || 2026,
      employee,
      scorecard: {
        totalCalendarDays: daysInMonthCount,
        sundaysCount,
        holidayCount,
        scheduledWorkingDays,
        netPayableDays,
        attendancePercentage,
        totalOTHours,
        pCount,
        hCount,
        p1hCount,
        mrgPermCount,
        evePermCount,
        plCount,
        upCount,
        aCount,
        lCount,
      },
      calendarDays,
      leaveRequests,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
