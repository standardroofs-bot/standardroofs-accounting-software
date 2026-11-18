import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET() {
  try {
    const contractors = await prisma.contractor.findMany({
      include: {
        milestones: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, contractors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      specialty,
      panNumber,
      phone,
      bankAccountNo,
      ifscCode,
      contractValue = 0,
    } = body;

    if (!name || !specialty) {
      return NextResponse.json({ success: false, error: "Contractor Name and Specialty are required." }, { status: 400 });
    }

    const contractor = await prisma.contractor.create({
      data: {
        name,
        code: code || null,
        specialty,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        phone: phone || null,
        bankAccountNo: bankAccountNo || null,
        ifscCode: ifscCode || null,
        contractValue: toDecimal(contractValue).toFixed(2),
      },
    });

    return NextResponse.json({ success: true, contractor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
