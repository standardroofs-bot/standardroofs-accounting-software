import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      amount: amountStr,
      tdsAmount: tdsStr = "0",
      paymentMode = "NEFT",
      bankAccountId, // Required if paymentMode != 'CASH'
      referenceNumber,
      paymentDate,
      notes,
    } = body;

    const amount = toDecimal(amountStr);
    const tdsAmount = toDecimal(tdsStr);
    const totalCreditAmount = amount.plus(tdsAmount);

    if (totalCreditAmount.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: { customer: true, project: true },
    });

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts
    const arAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1030" } });
    const tdsAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1070" } }); // TDS Receivable
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });

    let depositAccountId = cashAccount.id;
    let bankAccount: any = null;

    if (paymentMode !== "CASH") {
      if (bankAccountId) {
        bankAccount = await prisma.bankAccount.findUniqueOrThrow({ where: { id: bankAccountId } });
        depositAccountId = bankAccount.accountId;
      } else {
        // Default to HDFC Main
        const defaultBank = await prisma.bankAccount.findFirst({ where: { accountNumber: "50200012345678" } });
        if (defaultBank) {
          bankAccount = defaultBank;
          depositAccountId = defaultBank.accountId;
        }
      }
    }

    // Prepare Double-Entry Journal Lines
    const receiptSeqType = paymentMode === "CASH" ? "CASH_RECEIPT" : "BANK_RECEIPT";
    const voucherInfo = await getNextVoucherNumber(fy.id, receiptSeqType);

    const journalLines: any[] = [
      // Debit: Bank / Cash for net amount
      {
        accountId: depositAccountId,
        debit: amount,
        credit: 0,
        narration: `Payment received for ${invoice.invoiceNumber} via ${paymentMode}`,
        customerId: invoice.customerId,
        projectId: invoice.projectId || undefined,
      },
    ];

    // Debit: TDS Receivable if applicable
    if (tdsAmount.greaterThan(0)) {
      journalLines.push({
        accountId: tdsAccount.id,
        debit: tdsAmount,
        credit: 0,
        narration: `TDS deducted u/s 194C by ${invoice.customer.name} on ${invoice.invoiceNumber}`,
        customerId: invoice.customerId,
        projectId: invoice.projectId || undefined,
      });
    }

    // Credit: Accounts Receivable for total cleared
    journalLines.push({
      accountId: arAccount.id,
      debit: 0,
      credit: totalCreditAmount,
      narration: `Receivable cleared for ${invoice.invoiceNumber}`,
      customerId: invoice.customerId,
      projectId: invoice.projectId || undefined,
    });

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.RECEIPT,
      financialYearId: fy.id,
      entryNumber: voucherInfo.voucherNumber,
      date: paymentDate ? new Date(paymentDate) : new Date(),
      narration: `Payment Receipt: ${invoice.customer.name} for ${invoice.invoiceNumber} (Ref: ${referenceNumber || "Direct"})`,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Update Bank Account balance if payment via bank
    if (bankAccount) {
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          currentBalance: toDecimal(bankAccount.currentBalance).plus(amount).toFixed(2),
        },
      });

      await prisma.bankTransaction.create({
        data: {
          voucherNumber: voucherInfo.voucherNumber,
          date: paymentDate ? new Date(paymentDate) : new Date(),
          bankAccountId: bankAccount.id,
          type: "DEPOSIT",
          amount: amount.toFixed(2),
          referenceNumber: referenceNumber || null,
          payeeOrPayer: invoice.customer.name,
          purpose: `Customer Receipt for ${invoice.invoiceNumber}`,
          journalEntryId: journalEntry.id,
        },
      });
    }

    // Calculate new invoice balance
    const currentPaid = toDecimal(invoice.amountPaid).plus(amount);
    const currentTds = toDecimal(invoice.tdsDeducted).plus(tdsAmount);
    const newBalanceDue = toDecimal(invoice.totalAmount).minus(currentPaid).minus(currentTds);
    const newStatus = newBalanceDue.lessThanOrEqualTo(0.01) ? "PAID" : "PARTIAL";

    // Record InvoicePayment
    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        amount: amount.toFixed(2),
        tdsAmount: tdsAmount.toFixed(2),
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        journalEntryId: journalEntry.id,
      },
    });

    // Update Invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: currentPaid.toFixed(2),
        tdsDeducted: currentTds.toFixed(2),
        balanceDue: newBalanceDue.greaterThan(0) ? newBalanceDue.toFixed(2) : "0.00",
        status: newStatus,
      },
    });

    // Update Customer outstanding balance
    await prisma.customer.update({
      where: { id: invoice.customerId },
      data: {
        outstandingBalance: toDecimal(invoice.customer.outstandingBalance).minus(totalCreditAmount).toFixed(2),
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      journalEntry,
      newBalanceDue: newBalanceDue.toFixed(2),
      status: newStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
