import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { BankTransactionType, VoucherType } from "@prisma/client";

export async function GET() {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      include: {
        account: { select: { id: true, code: true, name: true, currentBalance: true } },
        transactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
      orderBy: { accountName: "asc" },
    });

    return NextResponse.json({ success: true, bankAccounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bankAccountId,
      type, // DEPOSIT | WITHDRAWAL | TRANSFER_IN | TRANSFER_OUT
      amount: amountStr,
      referenceNumber,
      chequeNumber,
      payeeOrPayer,
      purpose,
      targetAccountId, // Opposing Chart of Accounts account or destination bank
    } = body;

    if (!bankAccountId || !type || !amountStr || !purpose || !targetAccountId) {
      return NextResponse.json(
        { success: false, error: "Bank Account, Type, Amount, Purpose and Counter-Account are required" },
        { status: 400 }
      );
    }

    const amount = toDecimal(amountStr);
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Amount must be greater than zero" }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirst({ where: { isCurrent: true } });
    if (!fy) {
      return NextResponse.json({ success: false, error: "Active Financial Year not found" }, { status: 404 });
    }

    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      return NextResponse.json({ success: false, error: "System user not found" }, { status: 500 });
    }

    const bankAccount = await prisma.bankAccount.findUniqueOrThrow({
      where: { id: bankAccountId },
      include: { account: true },
    });

    const isDeposit = type === BankTransactionType.DEPOSIT || type === BankTransactionType.TRANSFER_IN;
    const voucherSeqType = isDeposit ? "BANK_RECEIPT" : "BANK_PAYMENT";
    const voucherInfo = await getNextVoucherNumber(fy.id, voucherSeqType);

    // Prepare Double-Entry Journal Lines
    const journalLines = isDeposit
      ? [
          {
            accountId: bankAccount.accountId, // Debit Bank
            debit: amount,
            credit: 0,
            narration: `Bank Deposit: ${purpose} (${payeeOrPayer || ""})`,
          },
          {
            accountId: targetAccountId, // Credit Source
            debit: 0,
            credit: amount,
            narration: `Bank Deposit: ${purpose} (${payeeOrPayer || ""})`,
          },
        ]
      : [
          {
            accountId: targetAccountId, // Debit Destination
            debit: amount,
            credit: 0,
            narration: `Bank Payment: ${purpose} (${payeeOrPayer || ""})`,
          },
          {
            accountId: bankAccount.accountId, // Credit Bank
            debit: 0,
            credit: amount,
            narration: `Bank Payment: ${purpose} (${payeeOrPayer || ""})`,
          },
        ];

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: isDeposit ? VoucherType.RECEIPT : VoucherType.PAYMENT,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: new Date(),
      narration: `Banking [${bankAccount.bankName}]: ${purpose} (${payeeOrPayer || ""})`,
      referenceNumber: referenceNumber || chequeNumber || undefined,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Update BankAccount currentBalance
    const currentBankBal = toDecimal(bankAccount.currentBalance);
    const newBankBal = isDeposit ? currentBankBal.plus(amount) : currentBankBal.minus(amount);

    await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: { currentBalance: newBankBal.toFixed(2) },
    });

    const transaction = await prisma.bankTransaction.create({
      data: {
        voucherNumber: voucherInfo.voucherNumber,
        date: new Date(),
        bankAccountId,
        type: type as BankTransactionType,
        amount: amount.toFixed(2),
        referenceNumber: referenceNumber || null,
        chequeNumber: chequeNumber || null,
        payeeOrPayer: payeeOrPayer || "Direct Banking",
        purpose,
        journalEntryId: journalEntry.id,
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
      journalEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
