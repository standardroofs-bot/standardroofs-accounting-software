import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAmountToGive, recalculateSubContractorLedger } from "@/lib/subContractorLedger";
import { getNextVoucherNumber } from "@/lib/accounting";
import { getCurrentUserSession } from "@/lib/auth";
import { CashFlowType } from "@prisma/client";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const team = await prisma.subContractor.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ success: false, error: "SubContractor not found" }, { status: 404 });
    }

    const entryType = body.entryType || "WORK_BILL";
    const sqft = Number(body.sqft) || 0;
    const ratePerSqft = Number(body.ratePerSqft) || 0;
    const otherAllowance = Number(body.otherAllowance) || 0;
    const materialReduction = Number(body.materialReduction) || 0;
    const givenAmount = Number(body.givenAmount) || 0;
    const walletUsed = body.walletUsed || "Office Cash";
    const entryDate = body.entryDate ? new Date(body.entryDate) : new Date();

    const amountToGive = computeAmountToGive(
      entryType,
      sqft,
      ratePerSqft,
      otherAllowance,
      materialReduction
    );

    const created = await prisma.subContractorLedgerEntry.create({
      data: {
        subContractorId: id,
        entryDate,
        siteName: body.siteName ? String(body.siteName).trim() : null,
        particulars: String(body.particulars || entryType).trim(),
        entryType,
        sqft,
        ratePerSqft,
        otherAllowance,
        materialReduction,
        amountToGive,
        givenAmount,
        walletUsed: entryType === "PAYMENT" ? walletUsed : null,
        notes: body.notes ? String(body.notes).trim() : null,
      },
    });

    // Optional: post outflow to Daily Cash Book for payments
    if (entryType === "PAYMENT" && givenAmount > 0 && body.postToCashBook !== false) {
      try {
        const fy =
          (await prisma.financialYear.findFirst({ where: { isCurrent: true } })) ||
          (await prisma.financialYear.findFirst());
        const session = await getCurrentUserSession();
        const user =
          (session?.userId ? await prisma.user.findUnique({ where: { id: session.userId } }) : null) ||
          (await prisma.user.findFirst());

        if (fy && user) {
          const { voucherNumber } = await getNextVoucherNumber(fy.id, "CASH_PAYMENT");
          await prisma.cashBookEntry.create({
            data: {
              voucherNumber,
              date: entryDate,
              type: CashFlowType.CASH_OUTFLOW,
              amount: givenAmount,
              purpose: `${team.name} — ${body.particulars || "Contractor payment"}`,
              category: "Contractor payment",
              walletName: walletUsed,
              counterpartyName: team.name,
              teamName: team.name,
              financialYearId: fy.id,
              createdById: user.id,
            },
          });
        }
      } catch (cbErr) {
        console.warn("[Contractor Payment -> CashBook warn]", cbErr);
      }
    }

    const updatedTeam = await recalculateSubContractorLedger(id, prisma as any);

    return NextResponse.json({
      success: true,
      entry: created,
      team: updatedTeam,
    });
  } catch (error: any) {
    console.error("[POST /api/contractors/[id]/entries]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
