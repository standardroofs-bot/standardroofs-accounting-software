import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleType = searchParams.get("cycleType") || "MONTHLY_OFFICE";
    const month = searchParams.get("month") || "2026-10";
    const halfPeriod = searchParams.get("halfPeriod") || (cycleType === "MONTHLY_OFFICE" ? "FULL" : "FIRST_HALF");
    const companyFilter = searchParams.get("companyFilter") || "ALL";

    const run = await prisma.payrollRun.findUnique({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType,
          month,
          halfPeriod,
          companyFilter: "ALL",
        },
      },
      include: {
        items: {
          orderBy: [{ employeeName: "asc" }],
        },
      },
    });

    const availableRuns = await prisma.payrollRun.findMany({
      where: { cycleType },
      select: {
        id: true,
        month: true,
        halfPeriod: true,
        status: true,
        totalNet: true,
        paidCash: true,
        paidBank: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ month: "desc" }, { halfPeriod: "desc" }],
    });

    if (!run) {
      return NextResponse.json({
        success: true,
        run: null,
        availableRuns,
      });
    }

    const filteredItems =
      companyFilter === "ALL"
        ? run.items
        : run.items.filter((it) => it.company === companyFilter);

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        items: filteredItems,
      },
      availableRuns,
    });
  } catch (error: any) {
    console.error("[GET /api/payroll]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load payroll" },
      { status: 500 }
    );
  }
}
