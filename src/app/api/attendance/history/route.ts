import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const requestedYear = searchParams.get("year"); // optional filter by year

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Employee ID is required." }, { status: 400 });
    }

    const employee = await prisma.employeeOrLabour.findUnique({
      where: { id: employeeId },
      include: {
        attendances: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    // Process all records by Year and Month
    const yearlyMap: Record<string, any> = {};
    const sitesWorkedSet = new Set<string>();

    let lifetimePresent = 0;
    let lifetimeHalfDay = 0;
    let lifetimePermission = 0;
    let lifetimeAbsent = 0;
    let lifetimeLeave = 0;
    let lifetimeAdvance = 0;

    employee.attendances.forEach((att) => {
      const d = new Date(att.date);
      const year = d.getUTCFullYear().toString();
      const month = d.getUTCMonth(); // 0 to 11

      if (att.siteName) {
        sitesWorkedSet.add(att.siteName.trim());
      }

      if (!yearlyMap[year]) {
        yearlyMap[year] = {
          year,
          totals: {
            present: 0,
            halfDay: 0,
            permission: 0,
            absent: 0,
            leave: 0,
            payableDays: 0,
            advances: 0,
          },
          months: Array.from({ length: 12 }, (_, i) => ({
            monthIndex: i,
            monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
            present: 0,
            halfDay: 0,
            permission: 0,
            absent: 0,
            leave: 0,
            payableDays: 0,
            advances: 0,
            sites: new Set<string>(),
          })),
        };
      }

      const yData = yearlyMap[year];
      const mData = yData.months[month];
      const advance = att.dailyAdvance ? Number(att.dailyAdvance) : 0;

      lifetimeAdvance += advance;
      yData.totals.advances += advance;
      mData.advances += advance;

      if (att.siteName) {
        mData.sites.add(att.siteName.trim());
      }

      if (att.status === "P") {
        lifetimePresent++;
        yData.totals.present++;
        mData.present++;
      } else if (att.status === "H") {
        lifetimeHalfDay++;
        yData.totals.halfDay++;
        mData.halfDay++;
      } else if (att.status === "1H") {
        lifetimePermission++;
        yData.totals.permission++;
        mData.permission++;
      } else if (att.status === "A") {
        lifetimeAbsent++;
        yData.totals.absent++;
        mData.absent++;
      } else if (att.status === "L") {
        lifetimeLeave++;
        yData.totals.leave++;
        mData.leave++;
      }
    });

    // Calculate payable days and attendance rates
    const yearsList = Object.keys(yearlyMap).sort((a, b) => Number(b) - Number(a));
    
    // Ensure default years exist if empty
    if (yearsList.length === 0) {
      yearsList.push("2026", "2025");
      yearlyMap["2026"] = {
        year: "2026",
        totals: { present: 0, halfDay: 0, permission: 0, absent: 0, leave: 0, payableDays: 0, advances: 0 },
        months: Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          monthName: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
          present: 0, halfDay: 0, permission: 0, absent: 0, leave: 0, payableDays: 0, advances: 0, sites: [],
        })),
      };
    }

    yearsList.forEach((y) => {
      const yData = yearlyMap[y];
      yData.totals.payableDays =
        yData.totals.present +
        yData.totals.permission +
        yData.totals.halfDay * 0.5;

      yData.months = yData.months.map((m: any) => ({
        ...m,
        payableDays: m.present + m.permission + m.halfDay * 0.5,
        sites: Array.from(m.sites || []),
      }));
    });

    const lifetimePayableDays =
      lifetimePresent + lifetimePermission + lifetimeHalfDay * 0.5;

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        empCode: employee.empCode,
        fatherName: employee.fatherName,
        phone: employee.phone,
        address: employee.address,
        aadhaarNumber: employee.aadhaarNumber,
        panNumber: employee.panNumber,
        bankName: employee.bankName,
        bankAccountNo: employee.bankAccountNo,
        bankIfsc: employee.bankIfsc,
        designation: employee.designation,
        role: employee.role,
        category: employee.category,
        companyUnit: employee.companyUnit,
        dateOfJoining: employee.dateOfJoining || employee.createdAt,
        dailyWage: employee.dailyWage ? Number(employee.dailyWage) : null,
        monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : null,
        status: employee.status,
      },
      yearsList,
      yearlyData: yearlyMap,
      lifetimeSummary: {
        totalRecords: employee.attendances.length,
        present: lifetimePresent,
        halfDay: lifetimeHalfDay,
        permission: lifetimePermission,
        absent: lifetimeAbsent,
        leave: lifetimeLeave,
        payableDays: lifetimePayableDays,
        advances: lifetimeAdvance,
        sitesWorked: Array.from(sitesWorkedSet),
      },
      rawRecords: employee.attendances,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
