import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { BankTransactionType, VoucherType, CashFlowType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contraType, // "CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_TO_BANK"
      sourceBankId,
      destinationBankId,
      amount: amountStr,
      date,
      referenceNumber,
      narration,
    } = body;

    const amount = toDecimal(amountStr || 0);
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { success: false, error: "Contra transfer amount must be greater than zero." },
        { status: 400 }
      );
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();
    const voucherInfo = await getNextVoucherNumber(fy.id, "CONTRA");

    // Cash-in-hand account (1010)
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });

    let journalLines: any[] = [];
    let transactionDescription = narration || "";

    if (contraType === "CASH_TO_BANK") {
      // Cash Deposit: Dr Bank, Cr Cash
      if (!destinationBankId) {
        return NextResponse.json({ success: false, error: "Destination Bank is required for Cash Deposit." }, { status: 400 });
      }
      const destBank = await prisma.bankAccount.findUniqueOrThrow({
        where: { id: destinationBankId },
        include: { account: true },
      });

      journalLines = [
        {
          accountId: destBank.accountId, // Debit Bank
          debit: amount,
          credit: 0,
          narration: narration || `Cash Deposit into ${destBank.bankName} - ${destBank.accountNumber}`,
        },
        {
          accountId: cashAccount.id, // Credit Cash
          debit: 0,
          credit: amount,
          narration: narration || `Cash Deposited to ${destBank.bankName}`,
        },
      ];

      // Update Bank Balance
      await prisma.bankAccount.update({
        where: { id: destBank.id },
        data: { currentBalance: toDecimal(destBank.currentBalance).plus(amount).toFixed(2) },
      });

      // Record in BankTransaction
      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.CONTRA,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: date ? new Date(date) : new Date(),
        narration: `Contra Deposit: Cash deposited into ${destBank.bankName}. ${narration || ""}`,
        referenceNumber: referenceNumber || voucherInfo.voucherNumber,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      await prisma.bankTransaction.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          bankAccountId: destBank.id,
          type: BankTransactionType.DEPOSIT,
          amount: amount.toFixed(2),
          referenceNumber: referenceNumber || null,
          payeeOrPayer: "Self (Cash-in-Hand)",
          purpose: narration || "Cash Deposit from Office Cash",
          journalEntryId: journal.id,
          isReconciled: true,
          reconciledAt: new Date(),
        },
      });

      // Record in CashBookEntry (outflow)
      await prisma.cashBookEntry.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          type: CashFlowType.CASH_OUTFLOW,
          amount: amount.toFixed(2),
          purpose: `Bank Deposit into ${destBank.bankName} (${destBank.accountNumber})`,
          category: "Contra",
          counterpartyName: "Cashier / Bank Runner",
          financialYearId: fy.id,
          createdById: defaultUser.id,
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Contra Voucher ${voucherInfo.voucherNumber} created: ₹ ${amount.toFixed(2)} deposited into ${destBank.bankName}`,
        journal,
      });

    } else if (contraType === "BANK_TO_CASH") {
      // Cash Withdrawal: Dr Cash, Cr Bank
      if (!sourceBankId) {
        return NextResponse.json({ success: false, error: "Source Bank is required for Cash Withdrawal." }, { status: 400 });
      }
      const srcBank = await prisma.bankAccount.findUniqueOrThrow({
        where: { id: sourceBankId },
        include: { account: true },
      });

      journalLines = [
        {
          accountId: cashAccount.id, // Debit Cash
          debit: amount,
          credit: 0,
          narration: narration || `Cash Withdrawal from ${srcBank.bankName}`,
        },
        {
          accountId: srcBank.accountId, // Credit Bank
          debit: 0,
          credit: amount,
          narration: narration || `ATM / Self Cheque Cash Withdrawal from ${srcBank.bankName}`,
        },
      ];

      // Update Bank Balance
      await prisma.bankAccount.update({
        where: { id: srcBank.id },
        data: { currentBalance: toDecimal(srcBank.currentBalance).minus(amount).toFixed(2) },
      });

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.CONTRA,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: date ? new Date(date) : new Date(),
        narration: `Contra Withdrawal: Cash withdrawn from ${srcBank.bankName}. ${narration || ""}`,
        referenceNumber: referenceNumber || voucherInfo.voucherNumber,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      await prisma.bankTransaction.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          bankAccountId: srcBank.id,
          type: BankTransactionType.WITHDRAWAL,
          amount: amount.toFixed(2),
          referenceNumber: referenceNumber || null,
          payeeOrPayer: "Self (Office Cash)",
          purpose: narration || "Cash Withdrawal for Daily Yard & Labour Expenses",
          journalEntryId: journal.id,
          isReconciled: true,
          reconciledAt: new Date(),
        },
      });

      // Record in CashBookEntry (inflow)
      await prisma.cashBookEntry.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          type: CashFlowType.CASH_INFLOW,
          amount: amount.toFixed(2),
          purpose: `Bank Cash Withdrawal from ${srcBank.bankName}`,
          category: "Contra",
          counterpartyName: "Self Withdrawal",
          financialYearId: fy.id,
          createdById: defaultUser.id,
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Contra Voucher ${voucherInfo.voucherNumber} created: ₹ ${amount.toFixed(2)} withdrawn from ${srcBank.bankName} to Cash-in-Hand`,
        journal,
      });

    } else if (contraType === "BANK_TO_BANK") {
      // Inter-bank transfer: Dr Dest Bank, Cr Src Bank
      if (!sourceBankId || !destinationBankId) {
        return NextResponse.json({ success: false, error: "Both Source and Destination banks are required for Inter-Bank transfer." }, { status: 400 });
      }
      if (sourceBankId === destinationBankId) {
        return NextResponse.json({ success: false, error: "Source and Destination bank accounts must be different." }, { status: 400 });
      }

      const srcBank = await prisma.bankAccount.findUniqueOrThrow({
        where: { id: sourceBankId },
        include: { account: true },
      });
      const destBank = await prisma.bankAccount.findUniqueOrThrow({
        where: { id: destinationBankId },
        include: { account: true },
      });

      journalLines = [
        {
          accountId: destBank.accountId, // Debit Dest Bank
          debit: amount,
          credit: 0,
          narration: narration || `Transfer from ${srcBank.bankName} to ${destBank.bankName}`,
        },
        {
          accountId: srcBank.accountId, // Credit Src Bank
          debit: 0,
          credit: amount,
          narration: narration || `Transfer to ${destBank.bankName}`,
        },
      ];

      // Update both balances
      await prisma.bankAccount.update({
        where: { id: srcBank.id },
        data: { currentBalance: toDecimal(srcBank.currentBalance).minus(amount).toFixed(2) },
      });
      await prisma.bankAccount.update({
        where: { id: destBank.id },
        data: { currentBalance: toDecimal(destBank.currentBalance).plus(amount).toFixed(2) },
      });

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.CONTRA,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: date ? new Date(date) : new Date(),
        narration: `Contra Transfer: ₹ ${amount.toFixed(2)} transferred from ${srcBank.bankName} to ${destBank.bankName}. ${narration || ""}`,
        referenceNumber: referenceNumber || voucherInfo.voucherNumber,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      // Two transaction entries: one OUT, one IN
      await prisma.bankTransaction.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          bankAccountId: srcBank.id,
          type: BankTransactionType.TRANSFER_OUT,
          amount: amount.toFixed(2),
          referenceNumber: referenceNumber || null,
          payeeOrPayer: destBank.bankName,
          purpose: narration || `Inter-Bank Transfer to ${destBank.bankName}`,
          journalEntryId: journal.id,
        },
      });

      await prisma.bankTransaction.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: date ? new Date(date) : new Date(),
          bankAccountId: destBank.id,
          type: BankTransactionType.TRANSFER_IN,
          amount: amount.toFixed(2),
          referenceNumber: referenceNumber || null,
          payeeOrPayer: srcBank.bankName,
          purpose: narration || `Inter-Bank Transfer from ${srcBank.bankName}`,
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Contra Voucher ${voucherInfo.voucherNumber} created: ₹ ${amount.toFixed(2)} transferred between ${srcBank.bankName} and ${destBank.bankName}`,
        journal,
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid Contra Type." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Contra voucher error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
