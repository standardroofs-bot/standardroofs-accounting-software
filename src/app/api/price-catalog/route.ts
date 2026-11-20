import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const roofType = searchParams.get("roofType");
    const q = searchParams.get("q");

    const where: any = {};
    if (category && category !== "ALL") where.category = category;
    if (roofType && roofType !== "ALL") where.roofType = roofType;

    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { itemCode: { contains: searchTerm, mode: "insensitive" } },
        { hsnSacCode: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const items = await prisma.roofingPriceItem.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Universal Bulk Excel/CSV Import handler
    if (body.bulk && Array.isArray(body.items)) {
      let count = 0;
      for (const item of body.items) {
        const name = item.name || item["Item Name"] || item["Name"];
        if (!name) continue;
        const code =
          item.itemCode ||
          item["Item Code"] ||
          item["SKU"] ||
          `ITEM-${String(Date.now()).slice(-4)}-${count}`;
        const hsn = item.hsnSacCode || item["HSN/SAC"] || item["HSN"] || "73089090";
        const unit = item.unit || item["Usage Unit"] || item["Unit"] || "nos";
        const rate = parseFloat(item.defaultRate || item["Selling Rate"] || item["Rate"] || 0);
        const purchaseRate = parseFloat(item.purchaseRate || item["Purchase Rate"] || 0);
        const gstRate = parseFloat(item.gstRate || item["GST Rate %"] || 18);

        await prisma.roofingPriceItem.upsert({
          where: { itemCode: code },
          update: {
            name,
            hsnSacCode: String(hsn),
            unit: String(unit).toLowerCase(),
            defaultRate: rate,
            purchaseRate: purchaseRate,
            gstRate: gstRate,
          },
          create: {
            itemCode: code,
            name,
            category: "ROOFING_MATERIAL",
            roofType: "TILES",
            hsnSacCode: String(hsn),
            unit: String(unit).toLowerCase(),
            defaultRate: rate,
            purchaseRate: purchaseRate,
            gstRate: gstRate,
          },
        });
        count++;
      }
      return NextResponse.json({ success: true, count });
    }

    const {
      itemCode,
      name,
      category = "ROOFING_SERVICE",
      roofType = "PEB",
      hsnSacCode = "9954",
      unit = "Sq.Ft",
      defaultRate,
      purchaseRate = 0,
      gstRate = 18.0,
      productType = "goods",
      description,
    } = body;

    if (!itemCode || !name || defaultRate === undefined) {
      return NextResponse.json(
        { success: false, error: "Item Code, Name, and Default Rate are required." },
        { status: 400 }
      );
    }

    const item = await prisma.roofingPriceItem.create({
      data: {
        itemCode: itemCode.trim().toUpperCase(),
        name,
        category,
        roofType,
        hsnSacCode,
        unit,
        defaultRate: toDecimal(defaultRate).toFixed(2),
        purchaseRate: toDecimal(purchaseRate).toFixed(2),
        gstRate: toDecimal(gstRate).toFixed(2),
        productType,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
