import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        project: true,
        items: true,
      },
    });

    if (!po) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, purchaseOrder: po });
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
    const { status, notes, terms } = body;

    const data: any = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (terms !== undefined) data.terms = terms;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, purchaseOrder: updated });
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
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return NextResponse.json({ success: false, error: "Purchase Order not found" }, { status: 404 });
    }

    if (po.status === "BILLED" || po.convertedBillId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a Purchase Order that has already been billed." },
        { status: 400 }
      );
    }

    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Purchase Order deleted." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
