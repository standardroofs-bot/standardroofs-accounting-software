import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // CREDIT_NOTE or DEBIT_NOTE

    const where: any = {};
    if (type) where.type = type;

    const notes = await prisma.creditDebitNote.findMany({
      where,
      include: {
        customer: true,
        supplier: true,
        invoice: { select: { invoiceNumber: true, totalAmount: true } },
        purchaseBill: { select: { billNumber: true, totalAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // CREDIT_NOTE (Customer) or DEBIT_NOTE (Supplier)
      customerId,
      supplierId,
      invoiceId,
      purchaseBillId,
      reason,
      taxableAmount: taxableStr,
      gstRate = 18.0,
      notes: noteRemarks,
    } = body;

    const taxable = toDecimal(taxableStr || 0);
    if (taxable.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { success: false, error: "Taxable amount must be greater than zero." },
        { status: 400 }
      );
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });
    const user = await prisma.user.findFirstOrThrow();

    if (type === "CREDIT_NOTE") {
      // Customer Credit Note: Dr Revenue (4010), Dr CGST (2030) + SGST (2031), Cr Customer AR (1030)
      if (!customerId) {
        return NextResponse.json({ success: false, error: "Customer is required for Credit Note." }, { status: 400 });
      }

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      const voucherInfo = await getNextVoucherNumber(fy.id, "CREDIT_NOTE");
      const gst = calculateGST(taxable, customer.stateCode, toDecimal(gstRate));

      const arAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1030" } });
      const revenueAccount = await prisma.account.findUniqueOrThrow({ where: { code: "4010" } });
      const cgstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2030" } });
      const sgstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2031" } });
      const igstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2032" } });

      const journalLines: any[] = [
        {
          accountId: revenueAccount.id,
          debit: taxable,
          credit: 0,
          narration: `Credit Note ${voucherInfo.voucherNumber} - Revenue reversal for ${customer.name}`,
          customerId: customer.id,
        },
      ];

      if (customer.stateCode === COMPANY_GST_STATE_CODE) {
        if (gst.cgstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: cgstAccount.id,
            debit: gst.cgstAmount,
            credit: 0,
            narration: `CGST Output Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
        if (gst.sgstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: sgstAccount.id,
            debit: gst.sgstAmount,
            credit: 0,
            narration: `SGST Output Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
      } else {
        if (gst.igstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: igstAccount.id,
            debit: gst.igstAmount,
            credit: 0,
            narration: `IGST Output Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
      }

      // Credit: Customer AR reduction
      journalLines.push({
        accountId: arAccount.id,
        debit: 0,
        credit: gst.totalAmount,
        narration: `Credit Note Adjustment for ${customer.name}`,
        customerId: customer.id,
      });

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.CREDIT_NOTE,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Customer Credit Note: ${reason} (${customer.name})`,
        referenceNumber: voucherInfo.voucherNumber,
        createdById: user.id,
        lines: journalLines,
      });

      // Update invoice balanceDue if linked
      if (invoiceId) {
        const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (inv) {
          const newBal = Decimal.max(0, toDecimal(inv.balanceDue).minus(gst.totalAmount));
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { balanceDue: newBal.toFixed(2) },
          });
        }
      }

      const note = await prisma.creditDebitNote.create({
        data: {
          noteNumber: voucherInfo.voucherNumber,
          type: "CREDIT_NOTE",
          date: new Date(),
          customerId,
          invoiceId: invoiceId || null,
          reason,
          subTotal: taxable.toFixed(2),
          cgstTotal: gst.cgstAmount.toFixed(2),
          sgstTotal: gst.sgstAmount.toFixed(2),
          igstTotal: gst.igstAmount.toFixed(2),
          totalAmount: gst.totalAmount.toFixed(2),
          status: "ISSUED",
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({ success: true, note });

    } else if (type === "DEBIT_NOTE") {
      // Vendor Debit Note: Dr Accounts Payable (2010), Cr Material Cost (5010), Cr GST ITC (1060/1061/1062)
      if (!supplierId) {
        return NextResponse.json({ success: false, error: "Supplier is required for Debit Note." }, { status: 400 });
      }

      const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
      const voucherInfo = await getNextVoucherNumber(fy.id, "DEBIT_NOTE");
      const gst = calculateGST(taxable, supplier.stateCode, toDecimal(gstRate));

      const apAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2010" } });
      const materialCostAccount = await prisma.account.findUniqueOrThrow({ where: { code: "5010" } });
      const cgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1060" } });
      const sgstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1061" } });
      const igstItcAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1062" } });

      const journalLines: any[] = [
        // Debit: Vendor AP reduction
        {
          accountId: apAccount.id,
          debit: gst.totalAmount,
          credit: 0,
          narration: `Debit Note reduction on ${supplier.name}`,
          supplierId: supplier.id,
        },
        // Credit: Material Cost reversal
        {
          accountId: materialCostAccount.id,
          debit: 0,
          credit: taxable,
          narration: `Material return / price reduction credit from ${supplier.name}`,
          supplierId: supplier.id,
        },
      ];

      if (supplier.stateCode === COMPANY_GST_STATE_CODE) {
        if (gst.cgstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: cgstItcAccount.id,
            debit: 0,
            credit: gst.cgstAmount,
            narration: `CGST ITC Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
        if (gst.sgstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: sgstItcAccount.id,
            debit: 0,
            credit: gst.sgstAmount,
            narration: `SGST ITC Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
      } else {
        if (gst.igstAmount.greaterThan(0)) {
          journalLines.push({
            accountId: igstItcAccount.id,
            debit: 0,
            credit: gst.igstAmount,
            narration: `IGST ITC Reversal on ${voucherInfo.voucherNumber}`,
          });
        }
      }

      const journal = await postDoubleEntryTransaction({
        voucherType: VoucherType.DEBIT_NOTE,
        financialYearId: fy.id,
        entryNumber: voucherInfo.voucherNumber,
        date: new Date(),
        narration: `Supplier Debit Note: ${reason} (${supplier.name})`,
        referenceNumber: voucherInfo.voucherNumber,
        createdById: user.id,
        lines: journalLines,
      });

      if (purchaseBillId) {
        const bill = await prisma.purchaseBill.findUnique({ where: { id: purchaseBillId } });
        if (bill) {
          const newBal = Decimal.max(0, toDecimal(bill.balanceDue).minus(gst.totalAmount));
          await prisma.purchaseBill.update({
            where: { id: purchaseBillId },
            data: { balanceDue: newBal.toFixed(2) },
          });
        }
      }

      const note = await prisma.creditDebitNote.create({
        data: {
          noteNumber: voucherInfo.voucherNumber,
          type: "DEBIT_NOTE",
          date: new Date(),
          supplierId,
          purchaseBillId: purchaseBillId || null,
          reason,
          subTotal: taxable.toFixed(2),
          cgstTotal: gst.cgstAmount.toFixed(2),
          sgstTotal: gst.sgstAmount.toFixed(2),
          igstTotal: gst.igstAmount.toFixed(2),
          totalAmount: gst.totalAmount.toFixed(2),
          status: "ISSUED",
          journalEntryId: journal.id,
        },
      });

      return NextResponse.json({ success: true, note });
    } else {
      return NextResponse.json({ success: false, error: "Invalid note type." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Credit/Debit note error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
