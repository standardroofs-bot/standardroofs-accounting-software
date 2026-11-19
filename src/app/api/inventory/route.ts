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
      orderBy: { sNo: "asc" },
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
    const { itemCode, name, category, unit, currentStock, minAlertStock, unitCost, yardLocation, imageUrl } = body;

    const count = await prisma.materialItem.count();
    const code = itemCode || `MAT-${String(count + 1).padStart(3, "0")}`;

    const material = await prisma.materialItem.create({
      data: {
        itemCode: code.toUpperCase().trim(),
        sNo: count + 1,
        name: name.trim(),
        category: category || "Roofing Material",
        unit: unit || "Nos",
        currentStock: new Decimal(currentStock || 0),
        minAlertStock: new Decimal(minAlertStock || 10),
        unitCost: new Decimal(unitCost || 0),
        rate: new Decimal(unitCost || 0),
        yardLocation: yardLocation || "Erode Main Yard",
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({ success: true, material });
  } catch (error: any) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, delta, currentStock, minAlertStock, unitCost } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Material ID is required." }, { status: 400 });
    }

    let updatedStock: Decimal | undefined;

    if (delta !== undefined) {
      const current = await prisma.materialItem.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ success: false, error: "Material not found" }, { status: 404 });
      }
      updatedStock = Decimal.max(0, current.currentStock.plus(new Decimal(delta)));
    } else if (currentStock !== undefined) {
      updatedStock = new Decimal(currentStock);
    }

    const updated = await prisma.materialItem.update({
      where: { id },
      data: {
        ...(updatedStock !== undefined && { currentStock: updatedStock }),
        ...(minAlertStock !== undefined && { minAlertStock: new Decimal(minAlertStock) }),
        ...(unitCost !== undefined && { unitCost: new Decimal(unitCost), rate: new Decimal(unitCost) }),
      },
    });

    return NextResponse.json({ success: true, material: updated });
  } catch (error: any) {
    console.error("PATCH /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
