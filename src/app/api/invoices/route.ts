import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postDoubleEntryTransaction, getNextVoucherNumber } from "@/lib/accounting";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";
import { VoucherType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        project: { select: { id: true, code: true, name: true, roofType: true } },
        items: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
      orderBy: { sequenceNumber: "desc" },
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      projectId,
      invoiceType = "TAX_INVOICE",
      date,
      dueDate,
      notes,
      terms,
      items, // Array of { description, hsnSacCode, quantity, unit, unitPrice, discount, gstRate }
    } = body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer and at least one line item are required." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });

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
    const isInterState = customer.stateCode !== COMPANY_GST_STATE_CODE;
    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);

    const processedItems = items.map((it: any) => {
      const qty = toDecimal(it.quantity || 1);
      const price = toDecimal(it.unitPrice || 0);
      const disc = toDecimal(it.discount || 0);
      const rate = toDecimal(it.gstRate || 18);

      const baseAmount = qty.times(price);
      const taxable = baseAmount.minus(disc).greaterThan(0) ? baseAmount.minus(disc) : new Decimal(0);
      const gstRes = calculateGST(taxable, customer.stateCode, rate);

      subTotal = subTotal.plus(taxable);
      cgstTotal = cgstTotal.plus(gstRes.cgstAmount);
      sgstTotal = sgstTotal.plus(gstRes.sgstAmount);
      igstTotal = igstTotal.plus(gstRes.igstAmount);
      grandTotal = grandTotal.plus(gstRes.totalAmount);

      return {
        description: it.description,
        hsnSacCode: it.hsnSacCode || "9954",
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

    // Obtain sequential invoice number starting at #33
    const voucherInfo = await getNextVoucherNumber(fy.id, "INVOICE");
    const invoiceNumber = voucherInfo.voucherNumber;
    const sequenceNumber = voucherInfo.sequenceNumber;

    // Post Double-Entry Journal Entry for genuine Tax Invoices
    let journalEntryId: string | null = null;
    const isActualFinancialDoc =
      invoiceType === "TAX_INVOICE" ||
      invoiceType === "FINAL_INVOICE" ||
      invoiceType === "ADVANCE_INVOICE";

    if (isActualFinancialDoc) {
      const journalLines: any[] = [
        // Debit: Customer Receivable
        {
          accountId: arAccount.id,
          debit: grandTotal,
          credit: 0,
          narration: `Sales Invoice: ${invoiceNumber} to ${customer.name}`,
          customerId: customer.id,
          projectId: projectId || undefined,
        },
        // Credit: Roofing Contract Income
        {
          accountId: incomeAccount.id,
          debit: 0,
          credit: subTotal,
          narration: `Taxable Income on ${invoiceNumber}`,
          customerId: customer.id,
          projectId: projectId || undefined,
        },
      ];

      // Credit: Taxes
      if (isInterState) {
        if (igstTotal.greaterThan(0)) {
          journalLines.push({
            accountId: igstAccount.id,
            debit: 0,
            credit: igstTotal,
            narration: `IGST Output Liability on ${invoiceNumber}`,
            customerId: customer.id,
            projectId: projectId || undefined,
          });
        }
      } else {
        if (cgstTotal.greaterThan(0)) {
          journalLines.push({
            accountId: cgstAccount.id,
            debit: 0,
            credit: cgstTotal,
            narration: `CGST Output Liability on ${invoiceNumber}`,
            customerId: customer.id,
            projectId: projectId || undefined,
          });
        }
        if (sgstTotal.greaterThan(0)) {
          journalLines.push({
            accountId: sgstAccount.id,
            debit: 0,
            credit: sgstTotal,
            narration: `SGST Output Liability on ${invoiceNumber}`,
            customerId: customer.id,
            projectId: projectId || undefined,
          });
        }
      }

      const postedJournal = await postDoubleEntryTransaction({
        voucherType: VoucherType.INVOICE,
        financialYearId: fy.id,
        entryNumber: invoiceNumber,
        date: date ? new Date(date) : new Date(),
        narration: `Tax Invoice ${invoiceNumber}: ${customer.name} (${processedItems.length} items)`,
        createdById: defaultUser.id,
        lines: journalLines,
      });

      journalEntryId = postedJournal.id;
    }

    // Create Invoice record
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        sequenceNumber,
        invoiceType,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + (customer.creditDays || 30) * 86400000),
        customerId,
        projectId: projectId || null,
        financialYearId: fy.id,
        placeOfSupply: customer.state,
        placeOfSupplyStateCode: customer.stateCode,
        isInterState,
        subTotal: subTotal.toFixed(2),
        cgstTotal: cgstTotal.toFixed(2),
        sgstTotal: sgstTotal.toFixed(2),
        igstTotal: igstTotal.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
        balanceDue: grandTotal.toFixed(2),
        status: "UNPAID",
        notes: notes || null,
        terms: terms || "Payment due within specified credit terms. Subject to Erode Jurisdiction.",
        journalEntryId,
        items: {
          create: processedItems,
        },
      },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    // Update Customer outstanding balance
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        outstandingBalance: toDecimal(customer.outstandingBalance).plus(grandTotal).toFixed(2),
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
