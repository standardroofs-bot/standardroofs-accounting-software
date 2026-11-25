import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSubContractorLedger } from "@/lib/subContractorLedger";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.subContractor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "SubContractor not found" }, { status: 404 });
    }

    await prisma.subContractor.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        teamLead: body.teamLead !== undefined ? (body.teamLead ? String(body.teamLead).trim() : null) : existing.teamLead,
        phone: body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : existing.phone,
        tradeCategory: body.tradeCategory !== undefined ? String(body.tradeCategory).trim() : existing.tradeCategory,
        openingBalance: body.openingBalance !== undefined ? Number(body.openingBalance) || 0 : existing.openingBalance,
        notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : existing.notes,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    const recalculated = await recalculateSubContractorLedger(id, prisma as any);

    return NextResponse.json({ success: true, team: recalculated });
  } catch (error: any) {
    console.error("[PATCH /api/contractors/[id]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.subContractor.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[DELETE /api/contractors/[id]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
