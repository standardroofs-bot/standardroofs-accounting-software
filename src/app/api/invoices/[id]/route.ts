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
    const { status, notes, terms, dueDate, action } = body;

    // Handle Archive / Restore Actions
    if (action === "restore") {
      const restored = await prisma.invoice.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
        },
        include: { customer: true, items: true },
      });
      return NextResponse.json({ success: true, message: "Invoice restored from Archive", invoice: restored });
    }

    if (action === "archive") {
      const archived = await prisma.invoice.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
        include: { customer: true, items: true },
      });
      return NextResponse.json({ success: true, message: "Invoice moved to Archive", invoice: archived });
    }

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
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Soft-delete to Archive (never permanently deleted - preserves all audit records)
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice moved to Archive successfully",
      invoice: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
