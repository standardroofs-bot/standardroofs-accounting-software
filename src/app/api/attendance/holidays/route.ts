import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Standard Tamil Nadu & National Public Holidays 2026
const DEFAULT_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day", year: 2026 },
  { date: "2026-01-14", name: "Pongal", year: 2026 },
  { date: "2026-01-15", name: "Thiruvalluvar Day / Mattu Pongal", year: 2026 },
  { date: "2026-01-16", name: "Uzhavar Thirunal", year: 2026 },
  { date: "2026-01-26", name: "Republic Day", year: 2026 },
  { date: "2026-04-14", name: "Tamil New Year / Dr. B.R. Ambedkar Jayanti", year: 2026 },
  { date: "2026-05-01", name: "May Day / International Labour Day", year: 2026 },
  { date: "2026-08-15", name: "Independence Day", year: 2026 },
  { date: "2026-10-02", name: "Gandhi Jayanti", year: 2026 },
  { date: "2026-10-19", name: "Ayutha Pooja / Saraswathi Pooja", year: 2026 },
  { date: "2026-10-20", name: "Vijaya Dasami", year: 2026 },
  { date: "2026-11-08", name: "Deepavali", year: 2026 },
  { date: "2026-12-25", name: "Christmas Day", year: 2026 },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get("year") || "2026";
    const year = parseInt(yearStr, 10) || 2026;

    // Check if holidays exist in DB, if not auto-seed default 2026 holidays
    const count = await prisma.companyHoliday.count({ where: { year } });
    if (count === 0 && year === 2026) {
      for (const h of DEFAULT_HOLIDAYS_2026) {
        await prisma.companyHoliday.upsert({
          where: { date: new Date(`${h.date}T00:00:00.000Z`) },
          update: { name: h.name, year: h.year },
          create: {
            date: new Date(`${h.date}T00:00:00.000Z`),
            name: h.name,
            year: h.year,
            isPublic: true,
          },
        });
      }
    }

    const holidays = await prisma.companyHoliday.findMany({
      where: { year },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, holidays, year });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "add", date, name, year, description, markAllStaff = true } = body;

    if (!date || !name) {
      return NextResponse.json({ success: false, error: "Date and holiday name are required." }, { status: 400 });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const holidayYear = year || targetDate.getFullYear();

    // Upsert Holiday in calendar
    const holiday = await prisma.companyHoliday.upsert({
      where: { date: targetDate },
      update: {
        name,
        year: holidayYear,
        description: description || null,
        isPublic: true,
      },
      create: {
        date: targetDate,
        name,
        year: holidayYear,
        description: description || null,
        isPublic: true,
      },
    });

    let staffMarkedCount = 0;
    // Mark holiday as 'L' across all staff if requested
    if (markAllStaff) {
      const activeEmployees = await prisma.employeeOrLabour.findMany({
        where: { status: "ACTIVE" },
      });

      const promises = activeEmployees.map((emp) =>
        prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: targetDate,
            },
          },
          update: {
            status: "L",
            workNotes: `Company Holiday: ${name}`,
            category: emp.category,
            companyUnit: emp.companyUnit,
          },
          create: {
            employeeId: emp.id,
            date: targetDate,
            status: "L",
            workNotes: `Company Holiday: ${name}`,
            category: emp.category,
            companyUnit: emp.companyUnit,
          },
        })
      );

      await Promise.all(promises);
      staffMarkedCount = activeEmployees.length;
    }

    return NextResponse.json({ success: true, holiday, staffMarkedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");

    if (id) {
      await prisma.companyHoliday.delete({ where: { id } });
    } else if (date) {
      await prisma.companyHoliday.delete({
        where: { date: new Date(`${date}T00:00:00.000Z`) },
      });
    } else {
      return NextResponse.json({ success: false, error: "Holiday ID or Date required." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Holiday removed successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
