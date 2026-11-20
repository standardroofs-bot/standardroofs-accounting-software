import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const teamName = searchParams.get("teamName");

    const where: any = {};
    if (dateStr) {
      where.date = new Date(`${dateStr}T00:00:00.000Z`);
    }
    if (teamName) {
      where.contractorTeamName = teamName;
    }

    const logs = await prisma.contractorDailyLog.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractorTeamName, date, siteName, headcount = 0, workerBreakdown, siteWorkStatus = "Active Work", remarks } = body;

    if (!contractorTeamName || !date) {
      return NextResponse.json({ success: false, error: "Team Name and Date are required." }, { status: 400 });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const log = await prisma.contractorDailyLog.create({
      data: {
        contractorTeamName,
        date: targetDate,
        siteName: siteName || "Site Standby",
        headcount: Number(headcount) || 0,
        workerBreakdown,
        siteWorkStatus,
        remarks,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
