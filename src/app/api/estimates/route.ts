import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGST, COMPANY_GST_STATE_CODE } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";
import { getNextVoucherNumber } from "@/lib/accounting";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const estimates = await prisma.estimate.findMany({
      where,
      include: {
        customer: true,
        project: { select: { id: true, code: true, name: true, roofType: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, estimates });
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
      roofType = "PEB",
      date,
      expiryDate,
      terms,
      notes,
      items, // Array of { description, hsnCode, quantity, unit, unitRate, discount, gstRate }
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

    // Obtain sequential estimate number
    let estimateNumber: string;
    try {
      const voucherInfo = await getNextVoucherNumber(fy.id, "ESTIMATE");
      estimateNumber = voucherInfo.voucherNumber;
    } catch {
      const count = await prisma.estimate.count();
      const numStr = String(count + 1).padStart(4, "0");
      estimateNumber = `EST/${fy.name}/${numStr}`;
    }

    // Process line items
    let subTotal = new Decimal(0);
    let cgstTotal = new Decimal(0);
    let sgstTotal = new Decimal(0);
    let igstTotal = new Decimal(0);
    let grandTotal = new Decimal(0);
    let totalSqFt = new Decimal(0);

    const processedItems = items.map((it: any) => {
      const qty = toDecimal(it.quantity || 1);
      const price = toDecimal(it.unitRate || it.unitPrice || 0);
      const disc = toDecimal(it.discount || 0);
      const rate = toDecimal(it.gstRate || 18);
      const unit = it.unit || "Sq.Ft";

      if (unit.toLowerCase().includes("sq") || unit.toLowerCase().includes("ft")) {
        totalSqFt = totalSqFt.plus(qty);
      }

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
        hsnCode: it.hsnCode || "9954",
        quantity: qty.toFixed(2),
        unit,
        unitRate: price.toFixed(2),
        discount: disc.toFixed(2),
        gstRate: rate.toFixed(2),
        cgstAmount: gstRes.cgstAmount.toFixed(2),
        sgstAmount: gstRes.sgstAmount.toFixed(2),
        igstAmount: gstRes.igstAmount.toFixed(2),
        totalAmount: gstRes.totalAmount.toFixed(2),
      };
    });

    const estimate = await prisma.estimate.create({
      data: {
        estimateNumber,
        customerId,
        projectId: projectId || null,
        roofType,
        date: date ? new Date(date) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: "SENT",
        terms: terms || "1. Validity: 30 days from date of issue.\n2. Payment: 50% Advance, 40% on Delivery, 10% on Completion.\n3. GST 18% extra as applicable.",
        notes: notes || "Detailed roofing estimate including fabrication, materials, and installation.",
        totalSqFt: totalSqFt.toFixed(2),
        subTotal: subTotal.toFixed(2),
        cgstTotal: cgstTotal.toFixed(2),
        sgstTotal: sgstTotal.toFixed(2),
        igstTotal: igstTotal.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
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

    return NextResponse.json({ success: true, estimate });
  } catch (error: any) {
    console.error("Error creating estimate:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
