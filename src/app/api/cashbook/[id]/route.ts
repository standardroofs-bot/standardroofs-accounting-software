import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CashFlowType } from "@prisma/client";
import { toDecimal } from "@/lib/decimal";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.cashBookEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "CashBook entry not found" }, { status: 404 });
    }

    const updated = await prisma.cashBookEntry.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : existing.date,
        type: body.type ? (body.type as CashFlowType) : existing.type,
        amount: body.amount !== undefined ? toDecimal(body.amount).toFixed(2) : existing.amount,
        purpose: body.purpose !== undefined ? String(body.purpose).trim() : existing.purpose,
        category: body.category !== undefined ? String(body.category).trim() : existing.category,
        walletName: body.walletName !== undefined ? String(body.walletName).trim() : existing.walletName,
        counterpartyName:
          body.counterpartyName !== undefined
            ? body.counterpartyName
              ? String(body.counterpartyName).trim()
              : null
            : existing.counterpartyName,
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error("[PATCH /api/cashbook/[id]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.cashBookEntry.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[DELETE /api/cashbook/[id]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
