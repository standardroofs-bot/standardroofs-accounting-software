import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: "batchId is required" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (batch.status === "ROLLED_BACK") {
      return NextResponse.json(
        { success: false, error: `Batch ${batch.batchNumber} has already been rolled back.` },
        { status: 400 }
      );
    }

    // Execute atomic cleanup
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete Invoice Payments
      const delPayments = await tx.invoicePayment.deleteMany({
        where: { importBatchId: batchId },
      });

      // 2. Delete Invoices and their items
      const batchInvoices = await tx.invoice.findMany({
        where: { importBatchId: batchId },
        select: { id: true },
      });
      const invoiceIds = batchInvoices.map((i) => i.id);

      if (invoiceIds.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
        await tx.invoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      // 3. Delete Expense Claims
      const delExpenses = await tx.expenseClaim.deleteMany({
        where: { importBatchId: batchId },
      });

      // 4. Delete Cash Book Entries
      const delCashBook = await tx.cashBookEntry.deleteMany({
        where: { importBatchId: batchId },
      });

      // 5. Delete Contractor Milestones
      const delMilestones = await tx.contractorMilestone.deleteMany({
        where: { importBatchId: batchId },
      });

      // 6. Accumulate Net Deltas and Reverse Account Balances
      const batchJournals = await tx.journalEntry.findMany({
        where: { importBatchId: batchId },
        include: {
          lines: {
            include: { account: true },
          },
        },
      });

      const accountDeltas: Record<string, { type: string; netChange: Decimal }> = {};

      for (const j of batchJournals) {
        for (const line of j.lines) {
          const accId = line.accountId;
          if (!accountDeltas[accId]) {
            accountDeltas[accId] = { type: line.account.type, netChange: new Decimal(0) };
          }
          const d = toDecimal(line.debit);
          const c = toDecimal(line.credit);

          if (line.account.type === "ASSET" || line.account.type === "EXPENSE") {
            // Reversal: -Debit + Credit
            accountDeltas[accId].netChange = accountDeltas[accId].netChange.minus(d).plus(c);
          } else {
            // Reversal: -Credit + Debit
            accountDeltas[accId].netChange = accountDeltas[accId].netChange.minus(c).plus(d);
          }
        }
      }

      for (const [accId, delta] of Object.entries(accountDeltas)) {
        const acc = await tx.account.findUniqueOrThrow({ where: { id: accId } });
        const freshBal = toDecimal(acc.currentBalance).plus(delta.netChange);
        await tx.account.update({
          where: { id: accId },
          data: { currentBalance: freshBal.toFixed(2) },
        });
      }

      const journalIds = batchJournals.map((j) => j.id);
      if (journalIds.length > 0) {
        await tx.journalLine.deleteMany({
          where: { journalEntryId: { in: journalIds } },
        });
        await tx.journalEntry.deleteMany({
          where: { id: { in: journalIds } },
        });
      }

      // 7. Update batch status
      const updatedBatch = await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "ROLLED_BACK",
          notes: `${batch.notes || ""} [Rolled back on ${new Date().toLocaleString("en-IN")}]`,
        },
      });

      return {
        batchNumber: updatedBatch.batchNumber,
        deletedExpenses: delExpenses.count,
        deletedCashBook: delCashBook.count,
        deletedJournals: journalIds.length,
        deletedInvoices: invoiceIds.length,
        deletedPayments: delPayments.count,
        deletedMilestones: delMilestones.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${result.batchNumber} successfully rolled back. All transactions and double-entry postings reversed.`,
      result,
    });
  } catch (error: any) {
    console.error("Rollback error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
