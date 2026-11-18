import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reverseJournalEntry } from "@/lib/accounting";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { journalEntryId, reason } = body;

    if (!journalEntryId || !reason) {
      return NextResponse.json(
        { success: false, error: "Journal Entry ID and Reversal Reason are strictly required" },
        { status: 400 }
      );
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "System user not found" }, { status: 500 });
    }

    const reversalEntry = await reverseJournalEntry(
      journalEntryId,
      defaultUser.id,
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
