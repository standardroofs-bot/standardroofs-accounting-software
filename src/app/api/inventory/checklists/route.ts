import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "WELDER" | "LAYER" | "GENERAL"

    const checklists = await prisma.preDispatchChecklist.findMany({
      where: type ? { checklistType: type } : undefined,
      orderBy: [{ checklistType: "asc" }, { sNo: "asc" }],
    });

    return NextResponse.json({ success: true, checklists });
  } catch (error: any) {
    console.error("GET /api/inventory/checklists error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, verifiedQty, status, verifiedBy, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Checklist item ID is required." }, { status: 400 });
    }

    const updated = await prisma.preDispatchChecklist.update({
      where: { id },
      data: {
        ...(verifiedQty !== undefined && { verifiedQty: String(verifiedQty) }),
        ...(status !== undefined && { status }),
        ...(verifiedBy !== undefined && { verifiedBy }),
        verifiedAt: new Date(),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("PUT /api/inventory/checklists error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
