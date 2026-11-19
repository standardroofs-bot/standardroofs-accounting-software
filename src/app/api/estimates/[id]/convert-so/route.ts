import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

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
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    const fy = await prisma.financialYear.findFirstOrThrow({ where: { isCurrent: true } });

    // Generate SO Sequence
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

    const salesOrder = await prisma.salesOrder.create({
      data: {
        soNumber,
        sequenceNumber: seq,
        date: new Date(),
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customerId: estimate.customerId,
        projectId: estimate.projectId,
        estimateId: estimate.id,
        financialYearId: fy.id,
        subTotal: estimate.subTotal,
        cgstTotal: estimate.cgstTotal,
        sgstTotal: estimate.sgstTotal,
        igstTotal: estimate.igstTotal,
        totalAmount: estimate.totalAmount,
        status: "CONFIRMED",
        terms: estimate.terms || "1. 50% Advance with Order Confirmation. 2. 40% on material delivery. 3. 10% on completion.",
        notes: `Generated from Quotation ${estimate.serialNo || estimate.estimateNumber}`,
        items: {
          create: estimate.items.map((it) => ({
            description: it.description,
            hsnSacCode: it.hsnCode || "9954",
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitRate,
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

    return NextResponse.json({ success: true, salesOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
