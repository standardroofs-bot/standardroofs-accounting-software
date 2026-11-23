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
    const employeeIdParam = searchParams.get("employeeId");
    const statusParam = searchParams.get("status");

    const where: any = {};

    // If EMPLOYEE, force filter to their own employeeId
    if (session.role === "EMPLOYEE") {
      let empId = session.employeeId;
      if (!empId) {
        const u = await prisma.user.findUnique({ where: { id: session.userId } });
        empId = u?.employeeId || undefined;
      }
      if (!empId) {
        return NextResponse.json({ success: false, error: "No employee profile linked to this user." }, { status: 400 });
      }
      where.employeeId = empId;
    } else if (employeeIdParam) {
      where.employeeId = employeeIdParam;
    }

    if (statusParam) {
      where.status = statusParam;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            category: true,
            companyUnit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, leaveRequests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    let { employeeId, leaveCategory = "PLANNED", dayType = "FULL_DAY", startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { success: false, error: "Start date, end date, and reason are required." },
        { status: 400 }
      );
    }

    // If role is EMPLOYEE, always use their linked employeeId
    if (session.role === "EMPLOYEE") {
      let empId = session.employeeId;
      if (!empId) {
        const u = await prisma.user.findUnique({ where: { id: session.userId } });
        empId = u?.employeeId || undefined;
      }
      if (!empId) {
        return NextResponse.json({ success: false, error: "No employee profile linked to user." }, { status: 400 });
      }
      employeeId = empId;
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Employee ID is required." }, { status: 400 });
    }

    const emp = await prisma.employeeOrLabour.findUnique({
      where: { id: employeeId },
      select: { companyUnit: true, employeeCode: true },
    });
    if (emp?.companyUnit !== "STANDARD_ROOFS") {
      return NextResponse.json(
        { success: false, error: "Leave requests are restricted to Standard Roofs employees (SR001–SR010)." },
        { status: 403 }
      );
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (end < start) {
      return NextResponse.json({ success: false, error: "End date cannot be earlier than start date." }, { status: 400 });
    }

    // Calculate total days (excluding Sundays)
    let totalDays = 0;
    if (leaveCategory === "PERMISSION_1H") {
      totalDays = 1.0;
      // Default dayType to MORNING if not EVENING
      if (dayType !== "EVENING") dayType = "MORNING";
    } else if (leaveCategory === "GENERAL_REQUEST") {
      totalDays = 1.0;
    } else {
      const curr = new Date(start);
      while (curr <= end) {
        if (curr.getUTCDay() !== 0) {
          totalDays += dayType === "HALF_DAY" ? 0.5 : 1.0;
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
      if (totalDays === 0) totalDays = dayType === "HALF_DAY" ? 0.5 : 1.0;
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveCategory,
        dayType,
        startDate: start,
        endDate: end,
        totalDays,
        reason: reason.trim(),
        status: "PENDING",
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
