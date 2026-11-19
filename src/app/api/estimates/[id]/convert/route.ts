import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGST } from "@/lib/gst";
import { getNextVoucherNumber } from "@/lib/accounting";
import { toDecimal, Decimal } from "@/lib/decimal";

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
        items: true,
      },
    });

    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found" }, { status: 404 });
    }

    if (estimate.status === "CONVERTED" && estimate.convertedInvoiceId) {
      return NextResponse.json({
        success: false,
        error: "Quotation has already been converted to an Invoice.",
      }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirstOrThrow({
      where: { isCurrent: true },
    });

    // 1. Obtain or create Project Site
    let projectId = estimate.projectId;
    if (!projectId) {
      const pCount = await prisma.project.count();
      const pCode = `PRJ-${String(pCount + 1).padStart(3, "0")}`;
      const project = await prisma.project.create({
        data: {
          code: pCode,
          name: `${estimate.customer.name} - ${estimate.roofType} Roof`,
          customerId: estimate.customerId,
          roofType: estimate.roofType,
          totalSqFt: estimate.totalSqFt,
          contractValue: estimate.totalAmount,
          siteLocation: estimate.siteAddress || estimate.customer.shippingAddress || estimate.customer.billingAddress || "Erode Site",
          status: "IN_PROGRESS",
        },
      });
      projectId = project.id;
    }

    // 2. Obtain sequential Invoice number (starting cleanly at #33)
    let invoiceNumber: string;
    let sequenceNumber: number;

    // Check SystemSettings
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "sr_system_settings", lastQuoteSerialNumber: 0, lastInvoiceNumber: 32 },
      });
    }

    sequenceNumber = settings.lastInvoiceNumber + 1;
    invoiceNumber = `SR/26-27/${String(sequenceNumber).padStart(4, "0")}`;

    // Update settings
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { lastInvoiceNumber: sequenceNumber },
    });

    // Also sync VoucherSequence table
    try {
      await prisma.voucherSequence.upsert({
        where: {
          financialYearId_voucherType: {
            financialYearId: fy.id,
            voucherType: "INVOICE",
          },
        },
        update: { nextNumber: sequenceNumber + 1 },
        create: {
          financialYearId: fy.id,
          voucherType: "INVOICE",
          prefix: "SR/26-27/",
          nextNumber: sequenceNumber + 1,
          paddingLength: 4,
        },
      });
    } catch (e) {
      console.warn("VoucherSequence update skipped", e);
    }

    // 3. Create Tax Invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        financialYearId: fy.id,
        invoiceNumber,
        sequenceNumber,
        invoiceType: "TAX_INVOICE",
        date: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        customerId: estimate.customerId,
        projectId,
        subTotal: estimate.subTotal,
        cgstTotal: estimate.cgstTotal,
        sgstTotal: estimate.sgstTotal,
        igstTotal: estimate.igstTotal,
        totalAmount: estimate.totalAmount,
        balanceDue: estimate.totalAmount,
        status: "SENT",
        placeOfSupply: "33",
        isInterState: estimate.customer.stateCode !== "33",
        terms: estimate.terms,
        notes: `Converted from Quotation ${estimate.serialNo || estimate.estimateNumber}`,
        items: {
          create: estimate.items.map((it) => ({
            description: it.description,
            hsnSacCode: it.hsnCode || "9954",
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitRate,
            discount: it.discount,
            taxableAmount: toDecimal(it.quantity).times(toDecimal(it.unitRate)),
            gstRate: it.gstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
    });

    // 4. Update Estimate Status
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        status: "CONVERTED",
        quoteStage: "Converted",
        projectId,
        convertedInvoiceId: invoice.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Quotation converted successfully to Tax Invoice #${sequenceNumber} (${invoiceNumber})`,
      invoiceId: invoice.id,
      invoiceNumber,
      projectId,
    });
  } catch (error: any) {
    console.error("Conversion error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
