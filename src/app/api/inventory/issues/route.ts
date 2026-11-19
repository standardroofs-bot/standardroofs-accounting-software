import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const site = searchParams.get("site");
    const team = searchParams.get("team");

    const issues = await prisma.siteMaterialIssue.findMany({
      where: {
        ...(site ? { siteName: { contains: site, mode: "insensitive" } } : {}),
        ...(team ? { team } : {}),
      },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, issues });
  } catch (error: any) {
    console.error("GET /api/inventory/issues error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      team,
      siteName,
      projectId,
      productName,
      quantity,
      isReturnable,
      issuedBy,
      approvedBy,
      condition,
      notes,
    } = body;

    if (!productName || !quantity) {
      return NextResponse.json(
        { success: false, error: "Product name and quantity are required." },
        { status: 400 }
      );
    }

    const qty = new Decimal(quantity);

    const issue = await prisma.siteMaterialIssue.create({
      data: {
        date: date ? new Date(date) : new Date(),
        team: team || "SRM01",
        siteName: siteName || "Main Yard Dispatched",
        projectId: projectId || null,
        productName: productName.trim(),
        quantity: qty,
        isReturnable: Boolean(isReturnable),
        issuedBy: issuedBy || "Gowri Sankar",
        approvedBy: approvedBy || "Siva Kumar",
        condition: condition || "Good",
        notes: notes || null,
      },
    });

    // Also deduct stock from MaterialItem if item exists
    const matchingMaterial = await prisma.materialItem.findFirst({
      where: {
        name: { contains: productName.trim(), mode: "insensitive" },
      },
    });

    if (matchingMaterial) {
      const newStock = Decimal.max(0, matchingMaterial.currentStock.minus(qty));
      await prisma.materialItem.update({
        where: { id: matchingMaterial.id },
        data: { currentStock: newStock },
      });

      // Log material movement
      const movCount = await prisma.materialStockMovement.count();
      await prisma.materialStockMovement.create({
        data: {
          movementNumber: `ISSUE/26-27/${String(movCount + 1).padStart(4, "0")}`,
          date: date ? new Date(date) : new Date(),
          materialId: matchingMaterial.id,
          movementType: "SITE_ISSUE",
          quantity: qty,
          unitCost: matchingMaterial.unitCost,
          totalValue: qty.times(matchingMaterial.unitCost),
          projectId: projectId || null,
          referenceNo: `ISSUE-${issue.id.slice(-6)}`,
          notes: `Site: ${siteName || "Site"} | Team: ${team || "SRM01"}`,
        },
      });
    }

    return NextResponse.json({ success: true, issue });
  } catch (error: any) {
    console.error("POST /api/inventory/issues error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
