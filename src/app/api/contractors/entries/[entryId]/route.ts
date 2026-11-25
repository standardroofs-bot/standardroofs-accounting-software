import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAmountToGive, recalculateSubContractorLedger } from "@/lib/subContractorLedger";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const body = await req.json();

    const existing = await prisma.subContractorLedgerEntry.findUnique({
      where: { id: entryId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ledger entry not found" }, { status: 404 });
    }

    const entryType = body.entryType !== undefined ? String(body.entryType) : existing.entryType;
    const sqft = body.sqft !== undefined ? Number(body.sqft) || 0 : existing.sqft;
    const ratePerSqft = body.ratePerSqft !== undefined ? Number(body.ratePerSqft) || 0 : existing.ratePerSqft;
    const otherAllowance = body.otherAllowance !== undefined ? Number(body.otherAllowance) || 0 : existing.otherAllowance;
    const materialReduction = body.materialReduction !== undefined ? Number(body.materialReduction) || 0 : existing.materialReduction;
    const givenAmount = body.givenAmount !== undefined ? Number(body.givenAmount) || 0 : existing.givenAmount;

    const amountToGive = computeAmountToGive(
      entryType,
      sqft,
      ratePerSqft,
      otherAllowance,
      materialReduction
    );

    await prisma.subContractorLedgerEntry.update({
      where: { id: entryId },
      data: {
        entryDate: body.entryDate ? new Date(body.entryDate) : existing.entryDate,
        siteName: body.siteName !== undefined ? (body.siteName ? String(body.siteName).trim() : null) : existing.siteName,
        particulars: body.particulars !== undefined ? String(body.particulars).trim() : existing.particulars,
        entryType,
        sqft,
        ratePerSqft,
        otherAllowance,
        materialReduction,
        amountToGive,
        givenAmount,
        walletUsed: body.walletUsed !== undefined ? body.walletUsed : existing.walletUsed,
        notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : existing.notes,
      },
    });

    const updatedTeam = await recalculateSubContractorLedger(existing.subContractorId, prisma as any);

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error: any) {
    console.error("[PATCH /api/contractors/entries/[entryId]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const existing = await prisma.subContractorLedgerEntry.findUnique({
      where: { id: entryId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ledger entry not found" }, { status: 404 });
    }

    await prisma.subContractorLedgerEntry.delete({ where: { id: entryId } });
    const updatedTeam = await recalculateSubContractorLedger(existing.subContractorId, prisma as any);

    return NextResponse.json({ success: true, deletedEntryId: entryId, team: updatedTeam });
  } catch (error: any) {
    console.error("[DELETE /api/contractors/entries/[entryId]]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
