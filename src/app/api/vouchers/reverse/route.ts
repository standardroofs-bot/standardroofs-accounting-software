import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reverseJournalEntry } from "@/lib/accounting";
import { requireAuthorizedSession, enforceMakerChecker } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthorizedSession("vouchers", "REVERSE");
    if (auth.error) return auth.error;

    const body = await request.json();
    const { journalEntryId, reason } = body;

    if (!journalEntryId || !reason) {
      return NextResponse.json(
        { success: false, error: "Journal Entry ID and Reversal Reason are strictly required" },
        { status: 400 }
      );
    }

    const original = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      select: { createdById: true },
    });
    if (!original) {
      return NextResponse.json({ success: false, error: "Journal entry not found" }, { status: 404 });
    }

    const makerCheckerErr = enforceMakerChecker(original.createdById, auth.session, "journal voucher");
    if (makerCheckerErr) return makerCheckerErr;

    const reversalEntry = await reverseJournalEntry(
      journalEntryId,
      auth.session.userId,
      reason
    );

    return NextResponse.json({
      success: true,
      reversalEntry,
      message: `Transaction successfully reversed with voucher ${reversalEntry.entryNumber}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
