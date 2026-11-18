import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal, Decimal } from "@/lib/decimal";
import { BankTransactionType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get("bankAccountId");

    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: "bankAccountId is required" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.findUniqueOrThrow({
      where: { id: bankAccountId },
      include: {
        account: true,
      },
    });

    const transactions = await prisma.bankTransaction.findMany({
      where: { bankAccountId },
      orderBy: { date: "desc" },
    });

    const imports = await prisma.bankStatementImport.findMany({
      where: { bankAccountId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Compute Reconciliation Summary
    const bookBalance = toDecimal(bankAccount.currentBalance);
    let unreconciledDeposits = new Decimal(0);
    let unreconciledPayments = new Decimal(0);
    let reconciledBalance = new Decimal(0);

    transactions.forEach((tx) => {
      const amt = toDecimal(tx.amount);
      const isDeposit =
        tx.type === BankTransactionType.DEPOSIT || tx.type === BankTransactionType.TRANSFER_IN;

      if (tx.isReconciled) {
        if (isDeposit) {
          reconciledBalance = reconciledBalance.plus(amt);
        } else {
          reconciledBalance = reconciledBalance.minus(amt);
        }
      } else {
        if (isDeposit) {
          unreconciledDeposits = unreconciledDeposits.plus(amt);
        } else {
          unreconciledPayments = unreconciledPayments.plus(amt);
        }
      }
    });

    // Bank Statement Balance = Book Balance + Unreconciled Cheques (not yet debited by bank) - Unreconciled Deposits (not yet credited by bank)
    const estimatedStatementBalance = bookBalance
      .plus(unreconciledPayments)
      .minus(unreconciledDeposits);

    return NextResponse.json({
      success: true,
      bankAccount,
      summary: {
        bookBalance: bookBalance.toFixed(2),
        reconciledBalance: reconciledBalance.toFixed(2),
        unreconciledDeposits: unreconciledDeposits.toFixed(2),
        unreconciledPayments: unreconciledPayments.toFixed(2),
        estimatedStatementBalance: estimatedStatementBalance.toFixed(2),
        totalTransactions: transactions.length,
        unreconciledCount: transactions.filter((t) => !t.isReconciled).length,
      },
      transactions,
      imports,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, transactionId, isReconciled, bankAccountId, statementRows, fileName } = body;

    // Action 1: Manual toggle of a single transaction's reconciled state
    if (action === "TOGGLE_SINGLE") {
      if (!transactionId) {
        return NextResponse.json(
          { success: false, error: "transactionId is required" },
          { status: 400 }
        );
      }

      const updated = await prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
          isReconciled: !!isReconciled,
          reconciledAt: isReconciled ? new Date() : null,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    // Action 2: Statement auto-reconciliation
    if (action === "AUTO_MATCH_STATEMENT") {
      if (!bankAccountId || !Array.isArray(statementRows) || statementRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "bankAccountId and statementRows are required" },
          { status: 400 }
        );
      }

      // Fetch all unreconciled transactions for this bank account
      const unreconciledTxs = await prisma.bankTransaction.findMany({
        where: {
          bankAccountId,
          isReconciled: false,
        },
      });

      let matchedCount = 0;
      let matchedAmount = new Decimal(0);
      const matchedTxIds = new Set<string>();

      for (const row of statementRows) {
        const stmtWithdrawal = toDecimal(row.debit || row.withdrawal || 0); // Bank Debit = Withdrawal
        const stmtDeposit = toDecimal(row.credit || row.deposit || 0); // Bank Credit = Deposit
        const stmtRef = String(row.refNo || row.reference || row.chequeNo || "").trim().toLowerCase();

        for (const tx of unreconciledTxs) {
          if (matchedTxIds.has(tx.id)) continue;

          const txAmt = toDecimal(tx.amount);
          const isDeposit =
            tx.type === BankTransactionType.DEPOSIT || tx.type === BankTransactionType.TRANSFER_IN;

          // Check match:
          // 1. Reference match (if ref exists)
          const txRef = String(tx.referenceNumber || tx.chequeNumber || "").trim().toLowerCase();
          const refMatch = stmtRef && txRef && (stmtRef.includes(txRef) || txRef.includes(stmtRef));

          // 2. Amount match
          const amountMatch =
            (isDeposit && stmtDeposit.greaterThan(0) && txAmt.equals(stmtDeposit)) ||
            (!isDeposit && stmtWithdrawal.greaterThan(0) && txAmt.equals(stmtWithdrawal));

          if (refMatch || amountMatch) {
            matchedTxIds.add(tx.id);
            matchedCount++;
            matchedAmount = matchedAmount.plus(txAmt);

            await prisma.bankTransaction.update({
              where: { id: tx.id },
              data: {
                isReconciled: true,
                reconciledAt: new Date(),
                bankStatementRef: row.refNo || row.description || "Statement Auto-Match",
              },
            });
            break; // Move to next statement row
          }
        }
      }

      // Record statement import summary
      const statementImport = await prisma.bankStatementImport.create({
        data: {
          bankAccountId,
          fileName: fileName || `Statement_${new Date().toISOString().split("T")[0]}.csv`,
          totalLines: statementRows.length,
          reconciledLines: matchedCount,
          notes: `Auto-matched: ${matchedCount} / ${statementRows.length} rows cleared.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Auto-reconciliation complete: ${matchedCount} transactions matched and cleared (Total: ₹ ${matchedAmount.toFixed(2)}).`,
        matchedCount,
        unmatchedCount: statementRows.length - matchedCount,
        statementImport,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Reconciliation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
