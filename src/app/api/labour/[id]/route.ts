import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { syncEmployeeToOpenDraftRuns } from "@/lib/payrollAttendanceSync";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isContractor = searchParams.get("isContractor") === "true";

    if (isContractor) {
      const contractor = await prisma.contractor.findFirst({
        where: { id, companyId: tenant.companyId },
        include: { dailyLogs: { orderBy: { date: "desc" }, take: 20 } },
      });
      if (!contractor) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization" }, { status: 404 });
      }
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const labourer = await prisma.employeeOrLabour.findFirst({
      where: { id, companyId: tenant.companyId },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 20 },
        advances: { orderBy: { date: "desc" }, take: 10 },
      },
    });
    if (!labourer) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization" }, { status: 404 });
    }

    const masked = tenant.isSuperAdmin
      ? { ...labourer, salaryMasked: false }
      : {
          ...labourer,
          monthlySalary: null,
          dailyWage: null,
          baseWage: null,
          defaultVehicleAllowance: 0,
          salaryMasked: true,
        };

    return NextResponse.json({ success: true, labourer: masked });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      employeeCode,
      empCode,
      fatherName,
      phone,
      address,
      aadhaarNumber,
      panNumber,
      bankName,
      bankAccountNo,
      bankIfsc,
      designation,
      role,
      category,
      companyUnit,
      dailyWage,
      monthlySalary,
      dateOfJoining,
      status,
      isContractor,
    } = body;

    if (isContractor || category === "CONTRACTOR_TEAM") {
      const existing = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization" }, { status: 404 });
      }
      const contractor = await prisma.contractor.update({
        where: { id },
        data: {
          name,
          fatherName: fatherName || null,
          phone: phone || null,
          address: address || null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber ? panNumber.toUpperCase() : null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
          status: status || "ACTIVE",
          active: status !== "ARCHIVED",
        },
      });
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const existingEmp = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existingEmp) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization" }, { status: 404 });
    }

    const labourer = await prisma.employeeOrLabour.update({
      where: { id },
      data: {
        name,
        empCode: empCode || undefined,
        fatherName: fatherName || null,
        phone: phone || null,
        address: address || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber ? panNumber.toUpperCase() : null,
        bankName: bankName || null,
        bankAccountNo: body.bankAccountNumber || bankAccountNo || null,
        bankAccountNumber: body.bankAccountNumber || bankAccountNo || null,
        bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
        ifscCode: bankIfsc ? bankIfsc.toUpperCase() : null,
        designation: designation || undefined,
        role: role || designation || undefined,
        category: category || undefined,
        companyUnit: tenant.companyUnit,
        dailyWage: dailyWage !== undefined ? toDecimal(dailyWage).toFixed(2) : undefined,
        monthlySalary: monthlySalary !== undefined ? toDecimal(monthlySalary).toFixed(2) : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        location: body.location !== undefined ? String(body.location || "ERODE").toUpperCase() : undefined,
        state: body.state !== undefined ? String(body.state || "TAMIL NADU").toUpperCase() : undefined,
        defaultVehicleAllowance: body.defaultVehicleAllowance !== undefined ? Number(body.defaultVehicleAllowance) || 0 : undefined,
        status: status || undefined,
        active: status ? status !== "ARCHIVED" : undefined,
      },
    });

    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    const safeLabourer = tenant.isSuperAdmin
      ? { ...labourer, salaryMasked: false }
      : { ...labourer, monthlySalary: null, dailyWage: null, baseWage: null, defaultVehicleAllowance: 0, salaryMasked: true };
    return NextResponse.json({ success: true, labourer: safeLabourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { action = "archive", isContractor } = body;

    const newStatus = action === "restore" ? "ACTIVE" : "ARCHIVED";
    const newActive = action === "restore";

    if (isContractor) {
      const existing = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization" }, { status: 404 });
      }
      const contractor = await prisma.contractor.update({
        where: { id },
        data: { status: newStatus, active: newActive },
      });
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const existingEmp = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existingEmp) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization" }, { status: 404 });
    }

    const labourer = await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: newStatus, active: newActive },
    });

    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    if (!tenant.userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isContractor = searchParams.get("isContractor") === "true";

    if (isContractor) {
      const existing = await prisma.contractor.findFirst({ where: { id, companyId: tenant.companyId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Contractor not found in active organization" }, { status: 404 });
      }
      await prisma.contractor.update({
        where: { id },
        data: { status: "ARCHIVED", active: false },
      });
      return NextResponse.json({ success: true, message: "Contractor safely archived." });
    }

    const existingEmp = await prisma.employeeOrLabour.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existingEmp) {
      return NextResponse.json({ success: false, error: "Worker not found in active organization" }, { status: 404 });
    }

    await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: "ARCHIVED", active: false },
    });
    await syncEmployeeToOpenDraftRuns(tenant.companyId);
    return NextResponse.json({ success: true, message: "Worker safely archived." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
