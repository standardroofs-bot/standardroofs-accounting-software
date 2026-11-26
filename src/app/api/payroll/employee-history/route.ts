import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isInFinancialYear(month: string, fy: string): boolean {
  if (!fy || fy === "ALL") return true;
  const [startYearStr] = fy.split("-");
  const startYear = Number(startYearStr);
  if (!startYear) return true;
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  // Indian FY: Apr (4) of startYear .. Mar (3) of startYear + 1
  if (y === startYear && m >= 4) return true;
  if (y === startYear + 1 && m <= 3) return true;
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const employeeCode = searchParams.get("employeeCode");
    const employeeName = searchParams.get("employeeName");
    const fy = searchParams.get("fy") || "ALL";

    let employee = null;
    if (employeeId) {
      employee = await prisma.employeeOrLabour.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
          category: true,
          companyUnit: true,
          dateOfJoining: true,
          monthlySalary: true,
          dailyWage: true,
        },
      });
    } else if (employeeCode) {
      employee = await prisma.employeeOrLabour.findUnique({
        where: { employeeCode },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
          category: true,
          companyUnit: true,
          dateOfJoining: true,
          monthlySalary: true,
          dailyWage: true,
        },
      });
    }

    const whereOr: any[] = [];
    if (employee?.id) whereOr.push({ employeeId: employee.id });
    else if (employeeId) whereOr.push({ employeeId });
    if (employee?.employeeCode || employeeCode) {
      whereOr.push({ employeeCode: employee?.employeeCode || employeeCode });
    }
    if (employee?.name || employeeName) {
      whereOr.push({
        employeeName: {
          equals: employee?.name || employeeName || "",
          mode: "insensitive",
        },
      });
    }

    if (whereOr.length === 0) {
      return NextResponse.json({ success: false, error: "Employee identifier required" }, { status: 400 });
    }

    const rawItems = await prisma.payrollItem.findMany({
      where: { OR: whereOr },
      include: {
        payrollRun: {
          select: {
            id: true,
            month: true,
            cycleType: true,
            halfPeriod: true,
            status: true,
          },
        },
      },
      orderBy: [{ payrollRun: { month: "asc" } }, { payrollRun: { halfPeriod: "asc" } }],
    });

    const filtered = rawItems.filter((it) => isInFinancialYear(it.payrollRun.month, fy));

    const totals = filtered.reduce(
      (acc, it) => {
        const otLastInc =
          it.otAndIncentive +
          (it.performanceIncentive || 0) +
          it.nightDutyAmount +
          (it.vehicleAllowance || 0) +
          it.lastMonthBalance;
        const bankTotal = (it.paidBankOrGpay || 0) + (it.paidGpay || 0);
        acc.totalWorkingDays += it.totalWorkingDays;
        acc.daysPresent += it.daysPresent;
        acc.grossSalary += it.grossSalary;
        acc.expenseBalanceDeduction += it.expenseBalanceDeduction || 0;
        acc.advanceDeduction += it.advanceDeduction || 0;
        acc.otLastInc += otLastInc;
        acc.netSalary += it.netSalary;
        acc.paidCash += it.paidCash || 0;
        acc.paidBank += bankTotal;
        acc.carryForwardBalance += it.carryForwardBalance || 0;
        return acc;
      },
      {
        totalWorkingDays: 0,
        daysPresent: 0,
        grossSalary: 0,
        expenseBalanceDeduction: 0,
        advanceDeduction: 0,
        otLastInc: 0,
        netSalary: 0,
        paidCash: 0,
        paidBank: 0,
        carryForwardBalance: 0,
      }
    );

    return NextResponse.json({
      success: true,
      employee: employee || {
        id: employeeId || "",
        name: employeeName || filtered[0]?.employeeName || "Employee",
        employeeCode: employeeCode || filtered[0]?.employeeCode || "",
        designation: filtered[0]?.designation || null,
        dateOfJoining: filtered[0]?.joiningDate || null,
      },
      fy,
      items: filtered,
      totals,
    });
  } catch (error: any) {
    console.error("[GET /api/payroll/employee-history]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
