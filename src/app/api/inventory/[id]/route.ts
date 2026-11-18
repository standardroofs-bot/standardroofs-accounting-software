import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updated = await prisma.materialItem.update({
      where: { id },
      data: {
        itemCode: data.itemCode ? data.itemCode.toUpperCase() : undefined,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentStock: data.currentStock !== undefined ? new Decimal(data.currentStock) : undefined,
        minAlertStock: data.minAlertStock !== undefined ? new Decimal(data.minAlertStock) : undefined,
        unitCost: data.unitCost !== undefined ? new Decimal(data.unitCost) : undefined,
        yardLocation: data.yardLocation,
      },
    });

    return NextResponse.json({ success: true, material: updated });
  } catch (error: any) {
    console.error("PUT /api/inventory/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.materialItem.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Material deleted" });
  } catch (error: any) {
    console.error("DELETE /api/inventory/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
