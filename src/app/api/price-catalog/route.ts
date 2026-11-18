import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const roofType = searchParams.get("roofType");

    const where: any = {};
    if (category) where.category = category;
    if (roofType) where.roofType = roofType;

    const items = await prisma.roofingPriceItem.findMany({
      where,
      orderBy: { itemCode: "asc" },
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      itemCode,
      name,
      category = "ROOFING_SERVICE",
      roofType = "PEB",
      hsnSacCode = "9954",
      unit = "Sq.Ft",
      defaultRate,
      gstRate = 18.0,
      description,
    } = body;

    if (!itemCode || !name || defaultRate === undefined) {
      return NextResponse.json(
        { success: false, error: "Item Code, Name, and Default Rate are required." },
        { status: 400 }
      );
    }

    const item = await prisma.roofingPriceItem.create({
      data: {
        itemCode: itemCode.trim().toUpperCase(),
        name,
        category,
        roofType,
        hsnSacCode,
        unit,
        defaultRate: toDecimal(defaultRate).toFixed(2),
        gstRate: toDecimal(gstRate).toFixed(2),
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
