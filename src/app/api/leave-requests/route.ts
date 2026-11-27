import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession } from "@/lib/auth";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const tenant = await getActiveTenantContext();

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");
    const statusParam = searchParams.get("status");

    const where: any = { companyId: tenant.companyId };

    // If EMPLOYEE, force filter to their own employeeId
    if (tenant.role === "EMPLOYEE") {
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
    const tenant = await getActiveTenantContext();

    const body = await request.json();
    let { employeeId, leaveCategory = "PLANNED", dayType = "FULL_DAY", startDate, endDate, reason } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Start date and end date are required." },
        { status: 400 }
      );
    }

    // If role is EMPLOYEE, always use their linked employeeId
    if (tenant.role === "EMPLOYEE") {
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

    const emp = await prisma.employeeOrLabour.findFirst({
      where: { id: employeeId, companyId: tenant.companyId },
      select: { category: true, companyUnit: true, employeeCode: true, companyId: true },
    });
    if (!emp || emp.category !== "OFFICE_STAFF") {
      return NextResponse.json(
        { success: false, error: "Leave requests can only be submitted for Office Staff." },
        { status: 400 }
      );
    }

    const cleanReason = reason ? String(reason).trim() : "";

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
        companyId: emp.companyId,
        leaveCategory,
        dayType,
        startDate: start,
        endDate: end,
        totalDays,
        reason: cleanReason,
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

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const tenant = await getActiveTenantContext();

    const body = await request.json();
    const { id, leaveCategory, dayType, startDate, endDate, reason } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Leave ID is required." }, { status: 400 });
    }

    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing || (existing.companyId && existing.companyId !== tenant.companyId)) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : existing.startDate;
    const end = endDate ? new Date(`${endDate}T00:00:00.000Z`) : existing.endDate;

    let totalDays = 0;
    const cat = leaveCategory || existing.leaveCategory;
    const dt = dayType || existing.dayType;

    if (cat === "PERMISSION_1H" || cat === "GENERAL_REQUEST") {
      totalDays = 1.0;
    } else {
      const curr = new Date(start);
      while (curr <= end) {
        if (curr.getUTCDay() !== 0) {
          totalDays += dt === "HALF_DAY" ? 0.5 : 1.0;
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
      if (totalDays === 0) totalDays = dt === "HALF_DAY" ? 0.5 : 1.0;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveCategory: cat,
        dayType: dt,
        startDate: start,
        endDate: end,
        totalDays,
        reason: reason !== undefined ? String(reason).trim() : existing.reason,
      },
      include: {
        employee: true,
      },
    });

    // If leave was APPROVED, re-sync dates on attendance grid
    if (updated.status === "APPROVED") {
      const catLabel =
        cat === "PLANNED"
          ? "Planned Leave"
          : cat === "UNPLANNED"
          ? "Unplanned Leave"
          : cat === "SICK"
          ? "Sick Leave"
          : cat === "EMERGENCY"
          ? "Emergency Leave"
          : `${cat} Leave`;

      const note = updated.reason ? `Approved ${catLabel}: ${updated.reason}` : `Approved ${catLabel}`;
      const curr = new Date(start);
      while (curr <= end) {
        const isSun = curr.getUTCDay() === 0;
        if (!isSun) {
          await prisma.attendanceRecord.upsert({
            where: {
              employeeId_date: {
                employeeId: updated.employeeId,
                date: new Date(curr),
              },
            },
            update: { status: "A", workNotes: note },
            create: { employeeId: updated.employeeId, date: new Date(curr), status: "A", workNotes: note },
          });
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    return NextResponse.json({ success: true, leaveRequest: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const tenant = await getActiveTenantContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Leave ID is required." }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    if (leave.companyId && leave.companyId !== tenant.companyId) {
      return NextResponse.json({ success: false, error: "Leave request belongs to another organization." }, { status: 403 });
    }

    // 1. Move to RecycleBinItem
    await prisma.recycleBinItem.create({
      data: {
        entityType: "LEAVE_REQUEST",
        entityId: leave.id,
        title: `Leave: ${leave.employee?.name || "Employee"} (${leave.startDate.toISOString().split("T")[0]} to ${leave.endDate.toISOString().split("T")[0]})`,
        subtitle: `${leave.leaveCategory} • ${leave.totalDays} day(s) • Status: ${leave.status}`,
        payloadJson: JSON.stringify(leave),
        deletedBy: session.email || "HR Manager",
        companyId: leave.companyId || tenant.companyId,
      },
    });

    // 2. If leave was APPROVED, revert the "A" mark on the attendance matrix for this range
    if (leave.status === "APPROVED") {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const curr = new Date(start);

      while (curr <= end) {
        const isSun = curr.getUTCDay() === 0;
        if (!isSun) {
          // Delete or revert to unmarked
          await prisma.attendanceRecord.deleteMany({
            where: {
              employeeId: leave.employeeId,
              date: new Date(curr),
              status: "A",
            },
          });
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    // 3. Remove from LeaveRequest table
    await prisma.leaveRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Leave request moved to Recycle Bin (and attendance grid synced).",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

