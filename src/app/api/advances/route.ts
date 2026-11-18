import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // CUSTOMER or SUPPLIER

    if (type === "SUPPLIER") {
      const advances = await prisma.supplierAdvance.findMany({
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, advances });
    } else {
      const advances = await prisma.customerAdvance.findMany({
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, advances });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // "RECORD_CUSTOMER_ADVANCE" | "RECORD_SUPPLIER_ADVANCE" | "APPLY_CUSTOMER_ADVANCE" | "APPLY_SUPPLIER_ADVANCE"
      customerId,
      supplierId,
      projectId,
      amount: amountStr,
      paymentMode = "BANK",
      bankAccountId,
      referenceNumber,
      notes,
      advanceId,
      invoiceId,
      purchaseBillId,
    } = body;

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const user = await prisma.user.findFirstOrThrow();

    // 1. Record Customer Advance (Dr Bank/Cash, Cr Customer Advance Liability 2020)
    if (type === "RECORD_CUSTOMER_ADVANCE") {
      const amount = toDecimal(amountStr || 0);
      if (amount.lessThanOrEqualTo(0) || !customerId) {
        return NextResponse.json({ success: false, error: "Valid amount and Customer are required." }, { status: 400 });
      }

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      const voucherInfo = await getNextVoucherNumber(fy.id, "RECEIPT");

      const advanceLiabilityAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2020" } });
      let debitAccountId: string;

      if (paymentMode === "CASH") {
        const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
        debitAccountId = cashAccount.id;
      } else {
        const bank = bankAccountId
          ? await prisma.bankAccount.findUniqueOrThrow({ where: { id: bankAccountId } })
          : await prisma.bankAccount.findFirstOrThrow();
        debitAccountId = bank.accountId;
      }

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.RECEIPT,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Customer Project Advance received from ${customer.name}. ${notes || ""}`,
        referenceNumber: referenceNumber || voucherInfo.voucherNumber,
        createdById: user.id,
        lines: [
          { accountId: debitAccountId, debit: amount, credit: 0, narration: "Advance received" },
          { accountId: advanceLiabilityAccount.id, debit: 0, credit: amount, narration: "Advance liability credit", customerId: customer.id },
        ],
      });

      const advance = await prisma.customerAdvance.create({
        data: {
          receiptNumber: voucherInfo.voucherNumber,
          customerId,
          projectId: projectId || null,
          amount: amount.toFixed(2),
          paymentMode,
          bankAccountId: paymentMode === "BANK" ? bankAccountId : null,
          referenceNumber: referenceNumber || null,
          remainingBalance: amount.toFixed(2),
          status: "ACTIVE",
          notes: notes || null,
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({ success: true, advance });
    }

    // 2. Record Supplier Advance (Dr Supplier Advance 1040, Cr Bank/Cash)
    if (type === "RECORD_SUPPLIER_ADVANCE") {
      const amount = toDecimal(amountStr || 0);
      if (amount.lessThanOrEqualTo(0) || !supplierId) {
        return NextResponse.json({ success: false, error: "Valid amount and Supplier are required." }, { status: 400 });
      }

      const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
      const voucherInfo = await getNextVoucherNumber(fy.id, "PAYMENT");

      const advanceAssetAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1040" } });
      let creditAccountId: string;

      if (paymentMode === "CASH") {
        const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });
        creditAccountId = cashAccount.id;
      } else {
        const bank = bankAccountId
          ? await prisma.bankAccount.findUniqueOrThrow({ where: { id: bankAccountId } })
          : await prisma.bankAccount.findFirstOrThrow();
        creditAccountId = bank.accountId;
      }

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.PAYMENT,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Supplier Material Advance paid to ${supplier.name}. ${notes || ""}`,
        referenceNumber: referenceNumber || voucherInfo.voucherNumber,
        createdById: user.id,
        lines: [
          { accountId: advanceAssetAccount.id, debit: amount, credit: 0, narration: "Supplier advance asset", supplierId: supplier.id },
          { accountId: creditAccountId, debit: 0, credit: amount, narration: "Advance payment" },
        ],
      });

      const advance = await prisma.supplierAdvance.create({
        data: {
          paymentNumber: voucherInfo.voucherNumber,
          supplierId,
          projectId: projectId || null,
          amount: amount.toFixed(2),
          paymentMode,
          bankAccountId: paymentMode === "BANK" ? bankAccountId : null,
          referenceNumber: referenceNumber || null,
          remainingBalance: amount.toFixed(2),
          status: "ACTIVE",
          notes: notes || null,
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({ success: true, advance });
    }

    // 3. 1-Click Apply Customer Advance against Tax Invoice
    if (type === "APPLY_CUSTOMER_ADVANCE") {
      if (!advanceId || !invoiceId) {
        return NextResponse.json({ success: false, error: "advanceId and invoiceId are required." }, { status: 400 });
      }

      const advance = await prisma.customerAdvance.findUniqueOrThrow({
        where: { id: advanceId },
        include: { customer: true },
      });
      const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

      const availAdvance = toDecimal(advance.remainingBalance);
      const invDue = toDecimal(invoice.balanceDue);

      if (availAdvance.lessThanOrEqualTo(0)) {
        return NextResponse.json({ success: false, error: "No remaining advance balance to apply." }, { status: 400 });
      }
      if (invDue.lessThanOrEqualTo(0)) {
        return NextResponse.json({ success: false, error: "Invoice is already fully paid." }, { status: 400 });
      }

      const applyAmt = Decimal.min(availAdvance, invDue);
      const voucherInfo = await getNextVoucherNumber(fy.id, "JOURNAL_VOUCHER");

      // Dr Customer Advance Liability (2020), Cr Accounts Receivable (1030)
      const advanceLiabilityAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2020" } });
      const arAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1030" } });

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.JOURNAL_VOUCHER,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Advance ${advance.receiptNumber} applied against Invoice ${invoice.invoiceNumber} for ${advance.customer.name}`,
        referenceNumber: invoice.invoiceNumber,
        createdById: user.id,
        lines: [
          { accountId: advanceLiabilityAccount.id, debit: applyAmt, credit: 0, narration: "Advance adjusted", customerId: advance.customerId },
          { accountId: arAccount.id, debit: 0, credit: applyAmt, narration: "AR reduced", customerId: advance.customerId },
        ],
      });

      // Update Invoice
      const newInvDue = invDue.minus(applyAmt);
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          balanceDue: newInvDue.toFixed(2),
          amountPaid: toDecimal(invoice.amountPaid).plus(applyAmt).toFixed(2),
          status: newInvDue.isZero() ? "PAID" : "PARTIALLY_PAID",
        },
      });

      // Update Advance
      const newRemaining = availAdvance.minus(applyAmt);
      const updatedAdvance = await prisma.customerAdvance.update({
        where: { id: advanceId },
        data: {
          allocatedAmount: toDecimal(advance.allocatedAmount).plus(applyAmt).toFixed(2),
          remainingBalance: newRemaining.toFixed(2),
          status: newRemaining.isZero() ? "FULLY_ADJUSTED" : "ACTIVE",
        },
      });

      return NextResponse.json({
        success: true,
        message: `₹ ${applyAmt.toFixed(2)} advance successfully applied to Invoice ${invoice.invoiceNumber}. Remaining advance: ₹ ${newRemaining.toFixed(2)}.`,
        advance: updatedAdvance,
      });
    }

    // 4. 1-Click Apply Supplier Advance against Purchase Bill
    if (type === "APPLY_SUPPLIER_ADVANCE") {
      if (!advanceId || !purchaseBillId) {
        return NextResponse.json({ success: false, error: "advanceId and purchaseBillId are required." }, { status: 400 });
      }

      const advance = await prisma.supplierAdvance.findUniqueOrThrow({
        where: { id: advanceId },
        include: { supplier: true },
      });
      const bill = await prisma.purchaseBill.findUniqueOrThrow({ where: { id: purchaseBillId } });

      const availAdvance = toDecimal(advance.remainingBalance);
      const billDue = toDecimal(bill.balanceDue);

      if (availAdvance.lessThanOrEqualTo(0)) {
        return NextResponse.json({ success: false, error: "No remaining advance balance to apply." }, { status: 400 });
      }
      if (billDue.lessThanOrEqualTo(0)) {
        return NextResponse.json({ success: false, error: "Purchase bill is already fully paid." }, { status: 400 });
      }

      const applyAmt = Decimal.min(availAdvance, billDue);
      const voucherInfo = await getNextVoucherNumber(fy.id, "JOURNAL_VOUCHER");

      // Dr Accounts Payable (2010), Cr Supplier Advance Asset (1040)
      const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } });
      const advanceAssetAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1040" } });

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.JOURNAL_VOUCHER,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Supplier Advance ${advance.paymentNumber} applied against Bill ${bill.billNumber} for ${advance.supplier.name}`,
        referenceNumber: bill.billNumber,
        createdById: user.id,
        lines: [
          { accountId: apAccount.id, debit: applyAmt, credit: 0, narration: "AP liability reduced", supplierId: advance.supplierId },
          { accountId: advanceAssetAccount.id, debit: 0, credit: applyAmt, narration: "Advance asset adjusted", supplierId: advance.supplierId },
        ],
      });

      // Update Bill
      const newBillDue = billDue.minus(applyAmt);
      await prisma.purchaseBill.update({
        where: { id: purchaseBillId },
        data: {
          balanceDue: newBillDue.toFixed(2),
          amountPaid: toDecimal(bill.amountPaid).plus(applyAmt).toFixed(2),
          status: newBillDue.isZero() ? "PAID" : "PARTIAL",
        },
      });

      // Update Advance
      const newRemaining = availAdvance.minus(applyAmt);
      const updatedAdvance = await prisma.supplierAdvance.update({
        where: { id: advanceId },
        data: {
          allocatedAmount: toDecimal(advance.allocatedAmount).plus(applyAmt).toFixed(2),
          remainingBalance: newRemaining.toFixed(2),
          status: newRemaining.isZero() ? "FULLY_ADJUSTED" : "ACTIVE",
        },
      });

      return NextResponse.json({
        success: true,
        message: `₹ ${applyAmt.toFixed(2)} advance successfully applied to Purchase Bill ${bill.billNumber}. Remaining advance: ₹ ${newRemaining.toFixed(2)}.`,
        advance: updatedAdvance,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Advances error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
