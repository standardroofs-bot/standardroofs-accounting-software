import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;

    const payments = await prisma.billPayment.findMany({
      where,
      include: {
        supplier: true,
        purchaseBill: true,
        bankAccount: true,
        journalEntry: {
          include: {
            lines: {
              include: { account: true },
            },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      purchaseBillId,
      amount: amountStr,
      tdsSection, // "194C", "194Q"
      tdsRate: tdsRateNum,
      tdsAmount: tdsStr = "0",
      paymentMode = "NEFT",
      bankAccountId,
      referenceNumber,
      paymentDate,
      notes,
    } = body;

    const netAmount = toDecimal(amountStr || 0);
    const tdsAmount = toDecimal(tdsStr || 0);
    const totalCreditSettled = netAmount.plus(tdsAmount);

    if (totalCreditSettled.lessThanOrEqualTo(0)) {
      return NextResponse.json({ success: false, error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const bill = await prisma.purchaseBill.findUniqueOrThrow({
      where: { id: purchaseBillId },
      include: { supplier: true, project: true },
    });

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts
    const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } }); // Accounts Payable
    const tdsPayableAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2040" } }); // TDS Payable
    const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1010" } });

    let sourceAccountId = cashAccount.id;
    let bankAccount: any = null;

    if (paymentMode !== "CASH") {
      if (bankAccountId) {
        bankAccount = await prisma.bankAccount.findUniqueOrThrow({ where: { id: bankAccountId } });
        sourceAccountId = bankAccount.accountId;
      } else {
        const defaultBank =
          (await prisma.bankAccount.findFirst({ where: { accountNumber: "155205003161" } })) ||
          (await prisma.bankAccount.findFirst());
        if (defaultBank) {
          bankAccount = defaultBank;
          sourceAccountId = defaultBank.accountId;
        }
      }
    }

    // Sequence for payment
    const paymentSeq = await prisma.billPayment.count();
    const paymentNumber = `VPM-26-27-${String(paymentSeq + 1).padStart(4, "0")}`;

    // Prepare Double-Entry Journal Lines
    const journalLines: any[] = [
      // Debit: Accounts Payable (Clears creditor liability for gross settled amount)
      {
        accountId: apAccount.id,
        debit: totalCreditSettled,
        credit: 0,
        narration: `Settlement of Bill ${bill.billNumber} to ${bill.supplier.name}`,
        supplierId: bill.supplierId,
        projectId: bill.projectId || undefined,
      },
      // Credit: Bank / Cash for net payout
      {
        accountId: sourceAccountId,
        debit: 0,
        credit: netAmount,
        narration: `Payment for Bill ${bill.billNumber} via ${paymentMode} ref: ${referenceNumber || "Direct"}`,
        supplierId: bill.supplierId,
        projectId: bill.projectId || undefined,
      },
    ];

    // Credit: TDS Payable (Section 194C / 194Q)
    if (tdsAmount.greaterThan(0)) {
      journalLines.push({
        accountId: tdsPayableAccount.id,
        debit: 0,
        credit: tdsAmount,
        narration: `TDS u/s ${tdsSection || "194C"} deducted on Bill ${bill.billNumber}`,
        supplierId: bill.supplierId,
        projectId: bill.projectId || undefined,
      });
    }

    const journalEntry = await postDoubleEntryTransaction({
      voucherType: VoucherType.PAYMENT,
      financialYearId: fy.id,
      entryNumber: paymentNumber,
      date: paymentDate ? new Date(paymentDate) : new Date(),
      narration: `Vendor Payout ${paymentNumber} for Bill ${bill.billNumber}: ${bill.supplier.name}`,
      referenceNumber: referenceNumber || undefined,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Create BillPayment record
    const billPayment = await prisma.billPayment.create({
      data: {
        paymentNumber,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        purchaseBillId: bill.id,
        supplierId: bill.supplierId,
        bankAccountId: bankAccount ? bankAccount.id : null,
        amount: netAmount,
        tdsSection: tdsSection || null,
        tdsRate: tdsRateNum ? toDecimal(tdsRateNum) : null,
        tdsAmount,
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || `Payment for Bill ${bill.billNumber}`,
        journalEntryId: journalEntry.id,
      },
    });

    // Update PurchaseBill
    const newAmountPaid = toDecimal(bill.amountPaid).plus(totalCreditSettled);
    const newBalanceDue = toDecimal(bill.totalAmount).minus(newAmountPaid);
    const updatedStatus = newBalanceDue.lessThanOrEqualTo(0) ? "PAID" : "PARTIAL";

    await prisma.purchaseBill.update({
      where: { id: bill.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue.greaterThan(0) ? newBalanceDue : 0,
        status: updatedStatus,
      },
    });

    // Update Supplier outstanding balance
    await prisma.supplier.update({
      where: { id: bill.supplierId },
      data: {
        outstandingBalance: {
          decrement: totalCreditSettled,
        },
      },
    });

    // If paid via bank, update BankAccount currentBalance
    if (bankAccount) {
      await prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          currentBalance: {
            decrement: netAmount,
          },
        },
      });
    }

    return NextResponse.json({ success: true, billPayment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
