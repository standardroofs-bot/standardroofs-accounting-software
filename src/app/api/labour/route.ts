import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { RoleType, PayCycle } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // OFFICE_STAFF, TAMIL_LABOUR, HINDI_LABOUR, CONTRACTOR_TEAM
    const status = searchParams.get("status") || "ACTIVE"; // ACTIVE, ARCHIVED, ALL
    const search = searchParams.get("search")?.toLowerCase().trim();
    const companyUnit = searchParams.get("companyUnit");

    // Contractors handling
    if (category === "CONTRACTOR_TEAM") {
      const contractors = await prisma.contractor.findMany({
        where: status !== "ALL" ? { status } : undefined,
        include: {
          dailyLogs: {
            orderBy: { date: "desc" },
            take: 10,
          },
          milestones: true,
        },
        orderBy: { code: "asc" },
      });
      return NextResponse.json({ success: true, labourers: contractors, isContractor: true });
    }

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (category) where.category = category;
    if (companyUnit) where.companyUnit = companyUnit;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { empCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { aadhaarNumber: { contains: search, mode: "insensitive" } },
        { panNumber: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
      ];
    }

    const labourers = await prisma.employeeOrLabour.findMany({
      where,
      include: {
        attendances: {
          orderBy: { date: "desc" },
          take: 5,
        },
        advances: {
          orderBy: { date: "desc" },
          take: 5,
        },
        musters: {
          orderBy: { periodEnd: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { companyUnit: "desc" },
        { employeeCode: "asc" },
      ],
    });

    return NextResponse.json({ success: true, labourers, isContractor: false });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      category = "TAMIL_LABOUR",
      companyUnit = "STANDARD_ROOFS",
      dailyWage = 0,
      monthlySalary = 0,
      baseWage = 0,
      specialty,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Worker / Staff Name is required." }, { status: 400 });
    }

    // Handle Contractor creation
    if (category === "CONTRACTOR_TEAM") {
      let code = employeeCode || empCode;
      if (!code) {
        const count = await prisma.contractor.count();
        code = `CON-${String(count + 1).padStart(3, "0")}`;
      }
      const contractor = await prisma.contractor.create({
        data: {
          code,
          name,
          specialty: specialty || designation || "Roofing Contractor",
          fatherName: fatherName || null,
          phone: phone || null,
          address: address || null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber ? panNumber.toUpperCase() : null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
          category: "CONTRACTOR_TEAM",
          status: "ACTIVE",
          active: true,
        },
      });
      return NextResponse.json({ success: true, labourer: contractor });
    }

    // Handle Employee / Labourer creation
    let code = employeeCode || empCode;
    if (!code) {
      const prefix = category === "OFFICE_STAFF" ? (companyUnit === "INVI_CREATION" ? "Invi" : "SR") : category === "HINDI_LABOUR" ? "HIN-" : "LAB-";
      const count = await prisma.employeeOrLabour.count({ where: { category } });
      code = `${prefix}${String(count + 1).padStart(3, "0")}`;
    }

    const labourer = await prisma.employeeOrLabour.create({
      data: {
        employeeCode: code,
        empCode: empCode || code.replace(/^(LAB-|HIN-)/, ""),
        name,
        fatherName: fatherName || null,
        phone: phone || null,
        address: address || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber ? panNumber.toUpperCase() : null,
        bankName: bankName || null,
        bankAccountNo: bankAccountNo || null,
        bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
        ifscCode: bankIfsc ? bankIfsc.toUpperCase() : null,
        designation: designation || "Site Helper",
        role: role || designation || "Site Helper",
        category,
        companyUnit,
        dailyWage: toDecimal(dailyWage || (baseWage ? Number(baseWage) / 15 : 850)).toFixed(2),
        monthlySalary: toDecimal(monthlySalary || (category === "OFFICE_STAFF" ? 15000 : 0)).toFixed(2),
        baseWage: toDecimal(baseWage || (dailyWage ? Number(dailyWage) * 15 : 12750)).toFixed(2),
        status: "ACTIVE",
        active: true,
      },
    });

    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
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
      status,
      isContractor,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

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
        status: status || undefined,
        active: status ? status !== "ARCHIVED" : undefined,
      },
    });

    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action = "archive", isContractor } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const isContractor = searchParams.get("isContractor") === "true";

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

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
