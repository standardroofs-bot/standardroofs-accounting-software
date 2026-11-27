import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const monthStr = searchParams.get("month"); // YYYY-MM
    const teamName = searchParams.get("teamName");

    const where: any = { companyId: tenant.companyId };
    if (dateStr) {
      where.date = new Date(`${dateStr}T00:00:00.000Z`);
    } else if (monthStr) {
      const [year, month] = monthStr.split("-").map(Number);
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
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
    const tenant = await getActiveTenantContext();
    const body = await request.json();
    const {
      contractorTeamName,
      date,
      siteName,
      headcount = 0,
      workerBreakdown,
      siteWorkStatus = "Active Work",
      remarks,
      otHours = 0,
      otTimeRange,
      otReason,
    } = body;

    if (!contractorTeamName || !date) {
      return NextResponse.json(
        { success: false, error: "Team Name and Date are required." },
        { status: 400 }
      );
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);

    // Match contractor record ID inside active organization
    const contractor = await prisma.contractor.findFirst({
      where: {
        companyId: tenant.companyId,
        OR: [
          { name: { equals: contractorTeamName, mode: "insensitive" } },
          { name: { contains: contractorTeamName.replace(" Team", ""), mode: "insensitive" } },
        ],
      },
    });

    // Check if a log already exists for this team and date
    const existing = await prisma.contractorDailyLog.findFirst({
      where: {
        companyId: tenant.companyId,
        contractorTeamName,
        date: targetDate,
      },
    });

    let log;
    const combinedNote = workerBreakdown || remarks || null;

    if (existing) {
      log = await prisma.contractorDailyLog.update({
        where: { id: existing.id },
        data: {
          siteName: siteName ?? existing.siteName,
          headcount: Number(headcount),
          workerBreakdown: combinedNote !== null ? combinedNote : existing.workerBreakdown,
          siteWorkStatus: siteWorkStatus ?? existing.siteWorkStatus,
          remarks: combinedNote !== null ? combinedNote : existing.remarks,
          otHours: otHours !== undefined ? Number(otHours) : existing.otHours,
          otTimeRange: otTimeRange !== undefined ? otTimeRange : existing.otTimeRange,
          otReason: otReason !== undefined ? otReason : existing.otReason,
          contractorId: contractor?.id || existing.contractorId,
        },
      });
    } else {
      log = await prisma.contractorDailyLog.create({
        data: {
          contractorTeamName,
          date: targetDate,
          siteName: siteName || "Site Standby",
          headcount: Number(headcount),
          workerBreakdown: combinedNote,
          siteWorkStatus: siteWorkStatus || (Number(headcount) > 0 ? "Active Work" : "No Work / Absent"),
          remarks: combinedNote,
          otHours: Number(otHours) || 0,
          otTimeRange: otTimeRange || null,
          otReason: otReason || null,
          contractorId: contractor?.id || null,
          companyId: tenant.companyId,
        },
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Log ID is required." }, { status: 400 });
    }

    const existing = await prisma.contractorDailyLog.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Log not found in active organization." }, { status: 404 });
    }

    await prisma.contractorDailyLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Log deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
