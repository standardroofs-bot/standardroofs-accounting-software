import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "UNCATEGORIZED";

    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        bankAccount: true,
      },
      orderBy: { date: "desc" },
    });

    const pendingCount = await prisma.bankTransaction.count({
      where: { status: "UNCATEGORIZED" },
    });

    const categorizedCount = await prisma.bankTransaction.count({
      where: { status: "CATEGORIZED" },
    });

    return NextResponse.json({
      success: true,
      transactions,
      pendingCount,
      categorizedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      transactionId,
      category, // CUSTOMER_PAYMENT, VENDOR_PAYMENT, SITE_EXPENSE, LABOUR_CONTRACTOR, OFFICE_OVERHEAD, OWNER_CAPITAL, LOAN_EMI
      counterpartyName,
      notes,
    } = body;

    if (!transactionId || !category) {
      return NextResponse.json(
        { success: false, error: "Transaction ID and Category are required" },
        { status: 400 }
      );
    }

    const tx = await prisma.bankTransaction.findUnique({
      where: { id: transactionId },
      include: { bankAccount: true },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "System user not found" }, { status: 500 });
    }

    // Determine target chart of accounts code based on category
    let targetCode = "5010"; // Default raw materials
    let targetVoucherType: VoucherType = VoucherType.PAYMENT;

    if (category === "CUSTOMER_PAYMENT") {
      targetCode = "1030"; // Accounts Receivable (or 4010 Roofing Revenue)
      targetVoucherType = VoucherType.RECEIPT;
    } else if (category === "VENDOR_PAYMENT") {
      targetCode = "2010"; // Accounts Payable
    } else if (category === "SITE_EXPENSE") {
      targetCode = "5050"; // Consumables, Fasteners & Site Expense
    } else if (category === "LABOUR_CONTRACTOR") {
      targetCode = "5030"; // Labour & Workmanship Charges
    } else if (category === "OFFICE_OVERHEAD") {
      targetCode = "6080"; // Office Overheads & Refreshments
    } else if (category === "OWNER_CAPITAL") {
      targetCode = "3010"; // Owner Capital Account
      targetVoucherType = VoucherType.RECEIPT;
    } else if (category === "LOAN_EMI") {
      targetCode = "2510"; // Equipment / Vehicle Loan
    }

    const targetAccount = await prisma.account.findUnique({ where: { code: targetCode } });
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: tx.bankAccountId },
      include: { account: true },
    });

    if (!targetAccount || !bankAccount) {
      return NextResponse.json({ success: false, error: "Ledger account not found" }, { status: 404 });
    }

    // Post double entry voucher
    const isDeposit = tx.type === "DEPOSIT";
    const debitAccId = isDeposit ? bankAccount.accountId : targetAccount.id;
    const creditAccId = isDeposit ? targetAccount.id : bankAccount.accountId;

    let voucherNumber = tx.voucherNumber;
    try {
      const vInfo = await getNextVoucherNumber(fy.id, targetVoucherType);
      voucherNumber = vInfo.voucherNumber;
    } catch (e) {}

    const journal = await postDoubleEntryTransaction({
      financialYearId: fy.id,
      voucherType: targetVoucherType,
      entryNumber: voucherNumber,
      date: tx.date,
      narration: `[1-Click Categorization: ${category}] ${tx.payeeOrPayer} - ${tx.purpose} ${notes ? `(${notes})` : ""}`,
      createdById: defaultUser.id,
      lines: [
        {
          accountId: debitAccId,
          debit: toDecimal(tx.amount),
          credit: new Decimal(0),
          narration: `Dr for ${category} (${tx.payeeOrPayer})`,
        },
        {
          accountId: creditAccId,
          debit: new Decimal(0),
          credit: toDecimal(tx.amount),
          narration: `Cr for ${category} (${tx.payeeOrPayer})`,
        },
      ],
    });

    // Update transaction
    const updated = await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: {
        category,
        status: "CATEGORIZED",
        isReconciled: true,
        reconciledAt: new Date(),
        customerName: category === "CUSTOMER_PAYMENT" ? (counterpartyName || tx.payeeOrPayer) : null,
        vendorName: category === "VENDOR_PAYMENT" ? (counterpartyName || tx.payeeOrPayer) : null,
        notes: notes || `Categorized as ${category}`,
        journalEntryId: journal.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Transaction categorized as ${category} and double-entry voucher posted`,
      transaction: updated,
    });
  } catch (error: any) {
    console.error("Categorization error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
