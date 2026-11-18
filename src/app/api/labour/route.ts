import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { RoleType, PayCycle } from "@prisma/client";

export async function GET() {
  try {
    const labourers = await prisma.employeeOrLabour.findMany({
      include: {
        advances: {
          orderBy: { date: "desc" },
          take: 5,
        },
        musters: {
          orderBy: { periodEnd: "desc" },
          take: 5,
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json({ success: true, labourers });
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
      roleType = "DAILY_LABOUR",
      payCycle = "FIFTEEN_DAYS",
      baseWage = 0,
      phone,
      bankAccountNo,
      ifscCode,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Labourer Name is required." }, { status: 400 });
    }

    let code = employeeCode;
    if (!code) {
      const count = await prisma.employeeOrLabour.count();
      code = `LAB-${String(count + 1).padStart(3, "0")}`;
    }

    const labourer = await prisma.employeeOrLabour.create({
      data: {
        employeeCode: code,
        name,
        roleType: roleType as RoleType,
        payCycle: payCycle as PayCycle,
        baseWage: toDecimal(baseWage).toFixed(2),
        phone: phone || null,
        bankAccountNo: bankAccountNo || null,
        ifscCode: ifscCode || null,
      },
    });

    return NextResponse.json({ success: true, labourer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
