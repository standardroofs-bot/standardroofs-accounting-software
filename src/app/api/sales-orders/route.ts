import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal, Decimal } from "@/lib/decimal";
import { COMPANY_GST_STATE_CODE } from "@/lib/gst";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        project: true,
        estimate: true,
        items: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, salesOrders });
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
      estimateId,
      date,
      deliveryDate,
      notes,
      terms,
      items = [],
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: "Please select a customer." }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required in the Sales Order." }, { status: 400 });
    }

    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    const isInterState = customer.stateCode !== COMPANY_GST_STATE_CODE;
    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    // Generate SO sequence
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "sr_system_settings", lastSoSerialNumber: 0, lastInvoiceNumber: 32 },
      });
    }

    const seq = (settings.lastSoSerialNumber || 0) + 1;
    const soNumber = `SO-26-27-${String(seq).padStart(4, "0")}`;

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { lastSoSerialNumber: seq },
    });

    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);

    const calculatedItems = items.map((it: any) => {
      const qty = toDecimal(it.quantity || 1);
      const rate = toDecimal(it.unitPrice || 0);
      const taxable = qty.times(rate);
      const gstRate = toDecimal(it.gstRate || 18);

      let cgst = new Decimal(0);
      let sgst = new Decimal(0);
      let igst = new Decimal(0);

      if (isInterState) {
        igst = taxable.times(gstRate).dividedBy(100);
      } else {
        const halfRate = gstRate.dividedBy(2);
        cgst = taxable.times(halfRate).dividedBy(100);
        sgst = taxable.times(halfRate).dividedBy(100);
      }

      const lineTotal = taxable.plus(cgst).plus(sgst).plus(igst);

      subTotal = subTotal.plus(taxable);
      cgstTotal = cgstTotal.plus(cgst);
      sgstTotal = sgstTotal.plus(sgst);
      igstTotal = igstTotal.plus(igst);
      grandTotal = grandTotal.plus(lineTotal);

      return {
        description: it.description,
        hsnSacCode: it.hsnSacCode || "9954",
        quantity: qty,
        unit: it.unit || "SQFT",
        unitPrice: rate,
        taxableAmount: taxable,
        gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
      };
    });

    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNumber,
        sequenceNumber: seq,
        date: date ? new Date(date) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        customerId,
        projectId: projectId || null,
        estimateId: estimateId || null,
        financialYearId: fy.id,
        subTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        totalAmount: grandTotal,
        status: "CONFIRMED",
        terms: terms || "1. 50% Advance with Order Confirmation. 2. 40% on material delivery. 3. 10% on completion.",
        notes,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        customer: true,
        project: true,
        items: true,
      },
    });

    return NextResponse.json({ success: true, salesOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
