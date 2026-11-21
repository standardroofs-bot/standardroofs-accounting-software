import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isContractor = searchParams.get("isContractor") === "true";

    if (isContractor) {
      const contractor = await prisma.contractor.findUnique({
        where: { id },
        include: { dailyLogs: { orderBy: { date: "desc" }, take: 20 } },
      });
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const labourer = await prisma.employeeOrLabour.findUnique({
      where: { id },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 20 },
        advances: { orderBy: { date: "desc" }, take: 10 },
      },
    });

    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        bankAccountNo: bankAccountNo || null,
        bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
        ifscCode: bankIfsc ? bankIfsc.toUpperCase() : null,
        designation: designation || undefined,
        role: role || designation || undefined,
        category: category || undefined,
        companyUnit: companyUnit || undefined,
        dailyWage: dailyWage !== undefined ? toDecimal(dailyWage).toFixed(2) : undefined,
        monthlySalary: monthlySalary !== undefined ? toDecimal(monthlySalary).toFixed(2) : undefined,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
        status: status || undefined,
        active: status ? status !== "ARCHIVED" : undefined,
      },
    });

    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action = "archive", isContractor } = body;

    const newStatus = action === "restore" ? "ACTIVE" : "ARCHIVED";
    const newActive = action === "restore";

    if (isContractor) {
      const contractor = await prisma.contractor.update({
        where: { id },
        data: { status: newStatus, active: newActive },
      });
      return NextResponse.json({ success: true, labourer: contractor });
    }

    const labourer = await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: newStatus, active: newActive },
    });

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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isContractor = searchParams.get("isContractor") === "true";

    if (isContractor) {
      await prisma.contractor.update({
        where: { id },
        data: { status: "ARCHIVED", active: false },
      });
      return NextResponse.json({ success: true, message: "Contractor safely archived." });
    }

    await prisma.employeeOrLabour.update({
      where: { id },
      data: { status: "ARCHIVED", active: false },
    });
    return NextResponse.json({ success: true, message: "Worker safely archived." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
