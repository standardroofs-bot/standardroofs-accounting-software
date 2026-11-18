import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found." }, { status: 404 });
    }

    if (estimate.status === "CONVERTED" || estimate.convertedInvoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: `Estimate is already converted to Invoice ID: ${estimate.convertedInvoiceId}`,
        },
        { status: 400 }
      );
    }

    const fy = await prisma.financialYear.findFirstOrThrow({
      where: { isCurrent: true },
    });

    const defaultUser = await prisma.user.findFirstOrThrow();

    // Accounts for Double-Entry
    const arAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1030" } }); // Accounts Receivable
    const incomeAccount = await prisma.account.findUniqueOrThrow({ where: { code: "4010" } }); // Roofing Project Income
    const cgstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2030" } }); // CGST Output
    const sgstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2031" } }); // SGST Output
    const igstAccount = await prisma.account.findUniqueOrThrow({ where: { code: "2032" } }); // IGST Output

    // Calculate line items with GST
    const isInterState = estimate.customer.stateCode !== COMPANY_GST_STATE_CODE;
    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);

    const invoiceItems = estimate.items.map((it) => {
      const qty = toDecimal(it.quantity);
      const price = toDecimal(it.unitRate);
      const disc = toDecimal(it.discount);
      const rate = toDecimal(it.gstRate);

      const baseAmount = qty.times(price);
      const taxable = baseAmount.minus(disc).greaterThan(0) ? baseAmount.minus(disc) : new Decimal(0);
      const gstRes = calculateGST(taxable, estimate.customer.stateCode, rate);

      subTotal = subTotal.plus(taxable);
      cgstTotal = cgstTotal.plus(gstRes.cgstAmount);
      sgstTotal = sgstTotal.plus(gstRes.sgstAmount);
      igstTotal = igstTotal.plus(gstRes.igstAmount);
      grandTotal = grandTotal.plus(gstRes.totalAmount);

      return {
        description: it.description,
        hsnSacCode: it.hsnCode || "9954",
        quantity: qty.toFixed(2),
        unit: it.unit || "SQFT",
        unitPrice: price.toFixed(2),
        discount: disc.toFixed(2),
        taxableAmount: taxable.toFixed(2),
        gstRate: rate.toFixed(2),
        cgstRate: gstRes.cgstRate.toFixed(2),
        cgstAmount: gstRes.cgstAmount.toFixed(2),
        sgstRate: gstRes.sgstRate.toFixed(2),
        sgstAmount: gstRes.sgstAmount.toFixed(2),
        igstRate: gstRes.igstRate.toFixed(2),
        igstAmount: gstRes.igstAmount.toFixed(2),
        totalAmount: gstRes.totalAmount.toFixed(2),
      };
    });

    // Obtain sequential invoice number (starting at #33)
    const voucherInfo = await getNextVoucherNumber(fy.id, "INVOICE");
    const invoiceNumber = voucherInfo.voucherNumber;
    const sequenceNumber = voucherInfo.sequenceNumber;

    // Post double entry journal voucher
    const journalLines: any[] = [
      // Debit: Customer Receivable
      {
        accountId: arAccount.id,
        debit: grandTotal,
        credit: 0,
        narration: `Tax Invoice: ${invoiceNumber} (Converted from Quote ${estimate.estimateNumber})`,
        customerId: estimate.customerId,
        projectId: estimate.projectId || undefined,
      },
      // Credit: Roofing Contract Income
      {
        accountId: incomeAccount.id,
        debit: 0,
        credit: subTotal,
        narration: `Contract Revenue for ${invoiceNumber}`,
        customerId: estimate.customerId,
        projectId: estimate.projectId || undefined,
      },
    ];

    if (isInterState) {
      if (igstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: igstAccount.id,
          debit: 0,
          credit: igstTotal,
          narration: `IGST Output (18%) on ${invoiceNumber}`,
        });
      }
    } else {
      if (cgstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: cgstAccount.id,
          debit: 0,
          credit: cgstTotal,
          narration: `CGST Output (9%) on ${invoiceNumber}`,
        });
      }
      if (sgstTotal.greaterThan(0)) {
        journalLines.push({
          accountId: sgstAccount.id,
          debit: 0,
          credit: sgstTotal,
          narration: `SGST Output (9%) on ${invoiceNumber}`,
        });
      }
    }

    const journal = await postDoubleEntryTransaction({
      voucherType: VoucherType.INVOICE,
      financialYearId: fy.id,
      date: new Date(),
      narration: `Tax Invoice ${invoiceNumber} generated from Quote ${estimate.estimateNumber} for ${estimate.customer.name}`,
      referenceNumber: invoiceNumber,
      createdById: defaultUser.id,
      lines: journalLines,
    });

    // Create Invoice record
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        sequenceNumber,
        financialYearId: fy.id,
        invoiceType: "TAX_INVOICE",
        date: new Date(),
        dueDate: new Date(Date.now() + (estimate.customer.creditDays || 30) * 86400000),
        customerId: estimate.customerId,
        projectId: estimate.projectId || null,
        subTotal: subTotal.toFixed(2),
        cgstTotal: cgstTotal.toFixed(2),
        sgstTotal: sgstTotal.toFixed(2),
        igstTotal: igstTotal.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
        balanceDue: grandTotal.toFixed(2),
        status: "ISSUED",
        terms: estimate.terms,
        notes: `Converted from Estimate ${estimate.estimateNumber}. ${estimate.notes || ""}`,
        journalEntryId: journal.id,
        items: {
          create: invoiceItems,
        },
      },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    // Update estimate status
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        status: "CONVERTED",
        convertedInvoiceId: invoice.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Quote ${estimate.estimateNumber} successfully converted to Tax Invoice ${invoice.invoiceNumber} (Sequence #${invoice.sequenceNumber})`,
      invoice,
    });
  } catch (error: any) {
    console.error("Error converting estimate to invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
