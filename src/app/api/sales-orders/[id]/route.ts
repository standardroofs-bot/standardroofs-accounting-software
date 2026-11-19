import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        estimate: true,
        items: true,
      },
    });

    if (!so) {
      return NextResponse.json({ success: false, error: "Sales Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, salesOrder: so });
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

    const updated = await prisma.salesOrder.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, salesOrder: updated });
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
    const so = await prisma.salesOrder.findUnique({ where: { id } });

    if (!so) {
      return NextResponse.json({ success: false, error: "Sales Order not found" }, { status: 404 });
    }

    if (so.status === "INVOICED" || so.convertedInvoiceId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a Sales Order that has already been converted to an Invoice." },
        { status: 400 }
      );
    }

    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
    await prisma.salesOrder.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Sales Order deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
