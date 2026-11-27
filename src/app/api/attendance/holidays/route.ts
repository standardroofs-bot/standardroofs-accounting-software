import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncOpenDraftPayrollRunsForMonth } from "@/lib/payrollAttendanceSync";
import { getActiveTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const OFFICIAL_12_HOLIDAYS = [
  { date: "2026-10-19", name: "Saraswathi Pooja", holidayType: "HALF_PAID", year: 2026, description: "Half-Day Paid Leave (0.5 day payable)" },
  { date: "2026-10-20", name: "Saraswathi Pooja", holidayType: "UP", year: 2026, description: "Non-Paid Leave (0.0 day payable)" },
  { date: "2026-11-09", name: "Deepavali", holidayType: "PL", year: 2026, description: "Deepavali Day 1 (1.0 day payable)" },
  { date: "2026-11-10", name: "Deepavali", holidayType: "PL", year: 2026, description: "Deepavali Day 2 (1.0 day payable)" },
  { date: "2027-01-01", name: "New Year", holidayType: "PL", year: 2027, description: "New Year's Day (1.0 day payable)" },
  { date: "2027-01-02", name: "New Year Holiday", holidayType: "UP", year: 2027, description: "New Year Additional Holiday (0.0 day payable)" },
  { date: "2027-01-15", name: "Thai Pongal / Makar Sankranti", holidayType: "PL", year: 2027, description: "Thai Pongal (1.0 day payable)" },
  { date: "2027-01-16", name: "Mattu Pongal", holidayType: "UP", year: 2027, description: "Mattu Pongal (0.0 day payable)" },
  { date: "2027-10-09", name: "Saraswathi Pooja / Ayudha Pooja", holidayType: "HALF_PAID", year: 2027, description: "Half-Day Paid Leave (0.5 day payable)" },
  { date: "2027-10-29", name: "Deepavali", holidayType: "PL", year: 2027, description: "Deepavali Day 1 (1.0 day payable)" },
  { date: "2027-10-30", name: "Deepavali", holidayType: "PL", year: 2027, description: "Deepavali Day 2 (1.0 day payable)" },
  { date: "2028-01-01", name: "New Year", holidayType: "PL", year: 2028, description: "New Year's Day (1.0 day payable)" },
];

export async function GET(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    const whereClause: any = {
      OR: [{ companyId: "ALL" }, { companyId: tenant.companyId }],
    };
    if (year) {
      whereClause.year = year;
    }

    const holidays = await prisma.companyHoliday.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, holidays, count: holidays.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getActiveTenantContext();
    const body = await request.json();
    const { action = "add", id, date, name, year, holidayType = "PL", description, markOfficeStaff = true } = body;

    // Action: Apply all holidays for year to active organization's office staff
    if (action === "applyAll") {
      const targetYear = year || 2026;
      const holidays = await prisma.companyHoliday.findMany({
        where: {
          year: targetYear,
          OR: [{ companyId: "ALL" }, { companyId: tenant.companyId }],
        },
      });

      const officeEmployees = await prisma.employeeOrLabour.findMany({
        where: { category: "OFFICE_STAFF", status: "ACTIVE", companyId: tenant.companyId },
      });

      for (const h of holidays) {
        const targetDate = h.date;
        const status = h.holidayType === "UP" ? "UP" : "PL";
        const permissionHours = h.holidayType === "HALF_PAID" ? 0.5 : 1.0;

        for (const emp of officeEmployees) {
          await prisma.attendanceRecord.upsert({
            where: {
              employeeId_date: {
                employeeId: emp.id,
                date: targetDate,
              },
            },
            update: {
              status,
              permissionHours,
              workNotes: `Company Holiday: ${h.name} (${h.holidayType})`,
              category: emp.category,
              companyUnit: emp.companyUnit,
              companyId: emp.companyId,
            },
            create: {
              employeeId: emp.id,
              date: targetDate,
              status,
              permissionHours,
              workNotes: `Company Holiday: ${h.name} (${h.holidayType})`,
              category: emp.category,
              companyUnit: emp.companyUnit,
              companyId: emp.companyId,
            },
          });
        }
      }

      const holidayMonths = Array.from(new Set(holidays.map((h) => h.date.toISOString().slice(0, 7))));
      for (const hm of holidayMonths) {
        await syncOpenDraftPayrollRunsForMonth(hm, tenant.companyId);
      }

      return NextResponse.json({
        success: true,
        message: `Applied ${holidays.length} holidays to ${officeEmployees.length} ${tenant.companyName} office staff.`,
      });
    }

    if (!date || !name) {
      return NextResponse.json({ success: false, error: "Date and holiday name are required." }, { status: 400 });
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const holidayYear = year || targetDate.getFullYear();

    const holiday = await prisma.companyHoliday.upsert({
      where: { date: targetDate },
      update: {
        name,
        year: holidayYear,
        holidayType,
        description: description || null,
        isPublic: true,
      },
      create: {
        date: targetDate,
        name,
        year: holidayYear,
        holidayType,
        description: description || null,
        companyId: tenant.companyId,
        isPublic: true,
      },
    });

    let staffMarkedCount = 0;
    // Mark holiday on active organization's Office Staff attendance if requested
    if (markOfficeStaff) {
      const officeEmployees = await prisma.employeeOrLabour.findMany({
        where: { category: "OFFICE_STAFF", status: "ACTIVE", companyId: tenant.companyId },
      });

      const status = holidayType === "UP" ? "UP" : "PL";
      const permissionHours = holidayType === "HALF_PAID" ? 0.5 : 1.0;

      const promises = officeEmployees.map((emp) =>
        prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: targetDate,
            },
          },
          update: {
            status,
            permissionHours,
            workNotes: `Company Holiday: ${name} (${holidayType})`,
            category: emp.category,
            companyUnit: emp.companyUnit,
            companyId: emp.companyId,
          },
          create: {
            employeeId: emp.id,
            date: targetDate,
            status,
            permissionHours,
            workNotes: `Company Holiday: ${name} (${holidayType})`,
            category: emp.category,
            companyUnit: emp.companyUnit,
            companyId: emp.companyId,
          },
        })
      );

      await Promise.all(promises);
      staffMarkedCount = officeEmployees.length;
    }

    await syncOpenDraftPayrollRunsForMonth(targetDate.toISOString().slice(0, 7), tenant.companyId);

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

    let affectedMonth: string | null = null;
    if (id) {
      const existingHoliday = await prisma.companyHoliday.findUnique({ where: { id } });
      affectedMonth = existingHoliday ? existingHoliday.date.toISOString().slice(0, 7) : null;
      await prisma.companyHoliday.delete({ where: { id } });
    } else if (date) {
      affectedMonth = String(date).slice(0, 7);
      await prisma.companyHoliday.delete({
        where: { date: new Date(`${date}T00:00:00.000Z`) },
      });
    } else {
      return NextResponse.json({ success: false, error: "Holiday ID or Date required." }, { status: 400 });
    }

    if (affectedMonth) {
      await syncOpenDraftPayrollRunsForMonth(affectedMonth);
    }

    return NextResponse.json({ success: true, message: "Holiday removed successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
