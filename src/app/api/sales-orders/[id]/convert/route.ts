import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    if (!so) {
      return NextResponse.json({ success: false, error: "Sales Order not found" }, { status: 404 });
    }

    if (so.status === "INVOICED" && so.convertedInvoiceId) {
      return NextResponse.json(
        { success: false, error: "Sales Order has already been converted to an Invoice." },
        { status: 400 }
      );
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    // 1. Obtain Project Site
    let projectId = so.projectId;
    if (!projectId) {
      const pCount = await prisma.project.count();
      const pCode = `PRJ-${String(pCount + 1).padStart(3, "0")}`;
      const project = await prisma.project.create({
        data: {
          code: pCode,
          name: `${so.customer.name} - Roofing Project`,
          customerId: so.customerId,
          roofType: "PEB",
          contractValue: so.totalAmount,
          siteLocation: so.customer.shippingAddress || so.customer.billingAddress || "Erode Site",
          status: "IN_PROGRESS",
        },
      });
      projectId = project.id;
    }

    // 2. Sequential Invoice number
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "sr_system_settings", lastQuoteSerialNumber: 0, lastInvoiceNumber: 32 },
      });
    }

    const sequenceNumber = settings.lastInvoiceNumber + 1;
    const invoiceNumber = `SR/26-27/${String(sequenceNumber).padStart(4, "0")}`;

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { lastInvoiceNumber: sequenceNumber },
    });

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

    // 3. Create Tax Invoice
    const invoice = await prisma.invoice.create({
      data: {
        financialYearId: fy.id,
        invoiceNumber,
        sequenceNumber,
        invoiceType: "TAX_INVOICE",
        date: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        customerId: so.customerId,
        projectId,
        salesOrderId: so.id,
        subTotal: so.subTotal,
        cgstTotal: so.cgstTotal,
        sgstTotal: so.sgstTotal,
        igstTotal: so.igstTotal,
        totalAmount: so.totalAmount,
        balanceDue: so.totalAmount,
        status: "SENT",
        placeOfSupply: so.customer.state || "Tamil Nadu",
        placeOfSupplyStateCode: so.customer.stateCode || "33",
        isInterState: so.customer.stateCode !== "33",
        terms: so.terms,
        notes: `Converted from Sales Order ${so.soNumber}`,
        items: {
          create: so.items.map((it) => ({
            description: it.description,
            hsnSacCode: it.hsnSacCode || "9954",
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            discount: 0,
            taxableAmount: it.taxableAmount,
            gstRate: it.gstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          })),
        },
      },
    });

    // 4. Update Sales Order
    await prisma.salesOrder.update({
      where: { id: so.id },
      data: {
        status: "INVOICED",
        convertedInvoiceId: invoice.id,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
