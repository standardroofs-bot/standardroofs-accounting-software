import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bill = await prisma.purchaseBill.findUnique({
      where: { id },
      include: {
        supplier: true,
        project: true,
        items: true,
        payments: {
          include: { bankAccount: true },
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

    if (!bill) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, bill });
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
    const bill = await prisma.purchaseBill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ success: false, error: "Bill not found" }, { status: 404 });
    }

    if (bill.payments.length > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a bill with recorded payments. Delete payments first." },
        { status: 400 }
      );
    }

    // Revert supplier balance
    await prisma.supplier.update({
      where: { id: bill.supplierId },
      data: {
        outstandingBalance: { decrement: bill.totalAmount },
      },
    });

    // Delete items and journal entry
    await prisma.purchaseItem.deleteMany({ where: { purchaseBillId: id } });

    if (bill.journalEntryId) {
      await prisma.purchaseBill.update({ where: { id }, data: { journalEntryId: null } });
      await prisma.journalLine.deleteMany({ where: { journalEntryId: bill.journalEntryId } });
      await prisma.journalEntry.delete({ where: { id: bill.journalEntryId } });
    }

    await prisma.purchaseBill.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Purchase bill deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
