import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.subContractor.findMany({
      include: {
        entries: {
          orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const summary = teams.reduce(
      (acc, t) => {
        const billed = t.entries
          .filter((e) => e.entryType === "WORK_BILL" || e.entryType === "EXTRA_LABOUR" || e.entryType === "ADJUSTMENT")
          .reduce((s, e) => s + Math.max(0, e.amountToGive), 0);
        const deductions = t.entries.reduce((s, e) => s + (e.materialReduction || 0), 0);
        const paid = t.entries.reduce((s, e) => s + (e.givenAmount || 0), 0);
        acc.totalBilled += billed;
        acc.totalDeductions += deductions;
        acc.totalPaid += paid;
        acc.netBalance += t.currentBalance;
        if (t.currentBalance > 0) acc.totalPayable += t.currentBalance;
        return acc;
      },
      { totalBilled: 0, totalDeductions: 0, totalPaid: 0, netBalance: 0, totalPayable: 0 }
    );

    return NextResponse.json({
      success: true,
      teams,
      summary,
    });
  } catch (error: any) {
    console.error("[GET /api/contractors]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      teamLead,
      phone,
      tradeCategory = "Roofing & Fabrication",
      openingBalance = 0,
      notes,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Team / Contractor Name is required." },
        { status: 400 }
      );
    }

    const openBal = Number(openingBalance) || 0;

    const team = await prisma.subContractor.create({
      data: {
        name: String(name).trim(),
        teamLead: teamLead ? String(teamLead).trim() : null,
        phone: phone ? String(phone).trim() : null,
        tradeCategory: String(tradeCategory || "Roofing & Fabrication").trim(),
        openingBalance: openBal,
        currentBalance: openBal,
        notes: notes ? String(notes).trim() : null,
      },
      include: { entries: true },
    });

    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    console.error("[POST /api/contractors]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
