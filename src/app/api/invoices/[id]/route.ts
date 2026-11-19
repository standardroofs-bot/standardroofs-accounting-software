import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        items: true,
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        journalEntry: {
          include: {
            lines: {
              include: { account: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
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
    const { status, notes, terms, dueDate } = body;

    const data: any = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (terms !== undefined) data.terms = terms;
    if (dueDate) data.dueDate = new Date(dueDate);

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: { customer: true, items: true },
    });

    return NextResponse.json({ success: true, invoice: updated });
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
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.payments && invoice.payments.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete invoice with recorded payments. Please void it or delete payments first." },
        { status: 400 }
      );
    }

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoice.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
