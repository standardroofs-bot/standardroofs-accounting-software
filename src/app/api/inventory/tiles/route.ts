import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const tiles = await prisma.tilesInventory.findMany({
      orderBy: { tileCode: "asc" },
    });
    return NextResponse.json({ success: true, tiles });
  } catch (error: any) {
    console.error("GET /api/inventory/tiles error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, availableStock, godownStock, unitCost, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Tile ID is required." }, { status: 400 });
    }

    const updated = await prisma.tilesInventory.update({
      where: { id },
      data: {
        ...(availableStock !== undefined && { availableStock: new Decimal(availableStock) }),
        ...(godownStock !== undefined && { godownStock: new Decimal(godownStock) }),
        ...(unitCost !== undefined && { unitCost: new Decimal(unitCost) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, tile: updated });
  } catch (error: any) {
    console.error("PUT /api/inventory/tiles error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
