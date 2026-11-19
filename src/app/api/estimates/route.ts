import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateGST } from "@/lib/gst";
import { toDecimal, Decimal } from "@/lib/decimal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status && status !== "ALL") where.quoteStage = status;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { serialNo: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { roofType: { contains: search, mode: "insensitive" } },
      ];
    }

    const estimates = await prisma.estimate.findMany({
      where,
      include: {
        customer: true,
        project: { select: { id: true, code: true, name: true } },
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
      cloneFromId,
      date,
      roofType = "Ceramic Tile",
      subType = "3 Way",
      length = 0,
      breadth = 0,
      rateSqft = 340,
      clientMobile,
      siteAddress,
      googleMapsLink,
      supervisorName,
      supervisorMobile,
      managerName,
      managerMobile,
      accountantName,
      accountantMobile,
      topLayer,
      bottomLayer,
      ridgeType,
      clipType,
      thicknessType,
      weldingRod,
      waterproofingSheet,
      productColor,
      colorText,
      productImage1,
      productImage2,
      earthImage,
      roof2DImage,
      manual2DRoofImage,
      pillarSpec,
      platformSpec,
      rafterSpec,
      purlinSpec,
      terms,
      notes,
      extraItems = [], // [{ description, quantity, unit, unitRate, gstRate }]
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Client / Customer selection is required." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });

    // 1. Persistent Serial Number from SystemSettings
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "sr_system_settings", lastQuoteSerialNumber: 0, lastInvoiceNumber: 32 },
      });
    }

    const nextSerialNum = settings.lastQuoteSerialNumber + 1;
    const serialNo = `SR-${String(nextSerialNum).padStart(5, "0")}`;

    // Update SystemSettings so counter never resets on delete
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { lastQuoteSerialNumber: nextSerialNum },
    });

    // 2. Per-Client Version Control (V1, V2, V3...)
    const existingQuotesCount = await prisma.estimate.count({
      where: { customerId },
    });
    const version = existingQuotesCount + 1;

    // 3. Create Date & Valid Until (Create Date + 7 days)
    const createDate = date ? new Date(date) : new Date();
    const validUntil = new Date(createDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 4. Auto-Generate Subject Line (Section 13.2: SR-[SerialNo] – [ClientName] – [ProductType] – V[Version])
    const subject = `${serialNo} – ${customer.name} – ${roofType} – V${version}`;

    // 5. Calculations
    const numLength = Number(length) || Number(customer.length) || 0;
    const numBreadth = Number(breadth) || Number(customer.breadth) || 0;
    const totalAreaSqFt = numLength * numBreadth;
    const unitRate = Number(rateSqft) || 280;

    let subTotal = new Decimal(totalAreaSqFt * unitRate);
    const mainGst = calculateGST(subTotal, customer.stateCode, 18);

    let cgstTotal = mainGst.cgstAmount;
    let sgstTotal = mainGst.sgstAmount;
    let igstTotal = mainGst.igstAmount;
    let grandTotal = mainGst.totalAmount;

    // Main line item
    const lineItems: any[] = [
      {
        description: `${roofType} Roofing System (${subType || "Standard"}) - Dimensions: ${numLength} ft × ${numBreadth} ft`,
        hsnCode: "9954",
        quantity: totalAreaSqFt.toFixed(2),
        unit: "Sq.Ft",
        unitRate: unitRate.toFixed(2),
        discount: "0.00",
        gstRate: "18.00",
        cgstAmount: mainGst.cgstAmount.toFixed(2),
        sgstAmount: mainGst.sgstAmount.toFixed(2),
        igstAmount: mainGst.igstAmount.toFixed(2),
        totalAmount: mainGst.totalAmount.toFixed(2),
      },
    ];

    // Optional Extra Line Items
    if (Array.isArray(extraItems)) {
      for (const it of extraItems) {
        if (!it.description) continue;
        const q = toDecimal(it.quantity || 1);
        const p = toDecimal(it.unitRate || 0);
        const lineBase = q.times(p);
        const itGst = calculateGST(lineBase, customer.stateCode, it.gstRate || 18);

        subTotal = subTotal.plus(lineBase);
        cgstTotal = cgstTotal.plus(itGst.cgstAmount);
        sgstTotal = sgstTotal.plus(itGst.sgstAmount);
        igstTotal = igstTotal.plus(itGst.igstAmount);
        grandTotal = grandTotal.plus(itGst.totalAmount);

        lineItems.push({
          description: it.description,
          hsnCode: it.hsnCode || "9954",
          quantity: q.toFixed(2),
          unit: it.unit || "Nos",
          unitRate: p.toFixed(2),
          discount: "0.00",
          gstRate: (it.gstRate || 18).toFixed(2),
          cgstAmount: itGst.cgstAmount.toFixed(2),
          sgstAmount: itGst.sgstAmount.toFixed(2),
          igstAmount: itGst.igstAmount.toFixed(2),
          totalAmount: itGst.totalAmount.toFixed(2),
        });
      }
    }

    // 6. Smart Image Priority: manual overrides take priority
    const finalRoof2DImage = manual2DRoofImage || roof2DImage || "/uploads/roofing/A type.jpg";
    const finalEarthImage = earthImage || "/uploads/diagrams/Ceramic/Ceramic_3way.png";

    const estimate = await prisma.estimate.create({
      data: {
        estimateNumber: serialNo,
        serialNo,
        version,
        subject,
        customerId,
        projectId: projectId || null,
        date: createDate,
        validUntil,
        quoteStage: "Sent",
        status: "SENT",
        roofType,
        subType: subType || "Standard",
        totalSqFt: totalAreaSqFt.toFixed(2),
        rateSqft: unitRate.toFixed(2),
        subTotal: subTotal.toFixed(2),
        cgstTotal: cgstTotal.toFixed(2),
        sgstTotal: sgstTotal.toFixed(2),
        igstTotal: igstTotal.toFixed(2),
        totalAmount: grandTotal.toFixed(2),
        clientMobile: clientMobile || customer.phone || "",
        siteAddress: siteAddress || customer.siteAddress || customer.billingAddress,
        googleMapsLink: googleMapsLink || customer.googleMapsLink || "",
        length: numLength.toFixed(2),
        breadth: numBreadth.toFixed(2),
        supervisorName: supervisorName || "Saran",
        supervisorMobile: supervisorMobile || "+91 98427 12345",
        managerName: managerName || "Prabhakaran T",
        managerMobile: managerMobile || "+91 86084 75767",
        accountantName: accountantName || "Senior Accountant",
        accountantMobile: accountantMobile || "+91 98421 12345",
        topLayer: topLayer || "Standard Top Layer Specification",
        bottomLayer: bottomLayer || "Standard Bottom Layer",
        ridgeType: ridgeType || "Standard Ridge System",
        clipType: clipType || "Heavy Duty Fasteners",
        thicknessType: thicknessType || "Standard",
        weldingRod: weldingRod || "BEST ARC",
        waterproofingSheet: waterproofingSheet || "Dr.Fixit Waterproofing Membrane",
        productColor: productColor || "Coffee Brown",
        colorText: colorText || productColor || "Coffee Brown",
        productImage1: productImage1 || "/uploads/roofing/Ceramic/Ceramic_Coffe Brown Pyramid.png",
        productImage2: productImage2 || "/uploads/roofing/Ceramic/ceramic terracotta.png",
        earthImage: finalEarthImage,
        roof2DImage: finalRoof2DImage,
        manual2DRoofImage: manual2DRoofImage || null,
        pillarSpec: pillarSpec || "150X150 mm Size Apollo Brand Pipe",
        platformSpec: platformSpec || "150X75 mm Size Apollo Brand Pipe",
        rafterSpec: rafterSpec || "100X50 mm Size Apollo Brand Pipe",
        purlinSpec: purlinSpec || "40X20 mm Size Apollo Brand Pipe",
        terms: terms || "1. Validity: 7 days from issue date.\n2. Payment terms: 50% mobilization advance, 40% against material delivery, 10% on completion.\n3. Water, power & free scaffold access to be provided by client at site.\n4. Complete structural warranty: 10 Years against leaks and manufacturing defects.",
        notes: notes || "Detailed roofing estimate with structural steel specifications and branded components.",
        items: {
          create: lineItems,
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    await prisma.estimateItem.deleteMany({ where: { estimateId: id } });
    await prisma.estimate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
