import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const materials = await prisma.materialItem.findMany({
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 3,
        },
      },
      orderBy: { itemCode: "asc" },
    });

    let totalValuation = toDecimal(0);
    let lowStockCount = 0;

    materials.forEach((m) => {
      const stock = toDecimal(m.currentStock);
      const cost = toDecimal(m.unitCost);
      const val = stock.times(cost);
      totalValuation = totalValuation.plus(val);

      if (stock.lessThanOrEqualTo(toDecimal(m.minAlertStock))) {
        lowStockCount++;
      }
    });

    return NextResponse.json({
      success: true,
      materials,
      totalValuation: totalValuation.toFixed(2),
      lowStockCount,
    });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemCode, name, category, unit, currentStock, minAlertStock, unitCost, yardLocation } = body;

    const count = await prisma.materialItem.count();
    const code = itemCode || `MAT-${String(count + 1).padStart(3, "0")}`;

    const material = await prisma.materialItem.create({
      data: {
        itemCode: code.toUpperCase().trim(),
        name,
        category: category || "Roofing Material",
        unit: unit || "Nos",
        currentStock: new Decimal(currentStock || 0),
        minAlertStock: new Decimal(minAlertStock || 10),
        unitCost: new Decimal(unitCost || 0),
        yardLocation: yardLocation || "Erode Main Yard",
      },
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
