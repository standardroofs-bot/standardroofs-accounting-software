import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const team = searchParams.get("team");
    const site = searchParams.get("site");

    const where: any = {};
    if (team) where.team = team;
    if (site) where.siteName = { contains: site, mode: "insensitive" };

    const issues = await prisma.siteMaterialIssue.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, issues });
  } catch (error: any) {
    console.error("GET /api/machines/consumables error:", error);
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
      productName,
      quantity,
      returnedQty = 0,
      isReturnable = false,
      issuedBy = "Gowri Sankar",
      approvedBy = "Siva Kumar",
      condition = "Good",
      notes,
    } = body;

    if (!team || !productName || !quantity) {
      return NextResponse.json(
        { success: false, error: "Team, Product / Tool Name, and Quantity are required." },
        { status: 400 }
      );
    }

    const issue = await prisma.siteMaterialIssue.create({
      data: {
        date: date ? new Date(date) : new Date(),
        team,
        siteName: siteName || "Standard Site",
        productName,
        quantity: toDecimal(quantity).toFixed(2),
        returnedQty: toDecimal(returnedQty).toFixed(2),
        isReturnable: Boolean(isReturnable),
        issuedBy: issuedBy || "Gowri Sankar",
        approvedBy: approvedBy || "Siva Kumar",
        condition: condition || "Good",
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Issued ${quantity} x ${productName} to ${team} at ${siteName || "Site"}.`,
      issue,
    });
  } catch (error: any) {
    console.error("POST /api/machines/consumables error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, returnedQty, condition, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.siteMaterialIssue.update({
      where: { id },
      data: {
        returnedQty: toDecimal(returnedQty || 0).toFixed(2),
        condition,
        notes,
      },
    });

    return NextResponse.json({ success: true, message: "Return record updated successfully.", issue: updated });
  } catch (error: any) {
    console.error("PUT /api/machines/consumables error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
