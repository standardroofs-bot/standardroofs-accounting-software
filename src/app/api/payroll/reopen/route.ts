import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json({ success: false, error: "payrollRunId is required" }, { status: 400 });
    }

    const run = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found" }, { status: 404 });
    }

    // Reverse/cleanup linked CashBook summary entry if posted on approval
    const isOffice = run.cycleType === "MONTHLY_OFFICE";
    const expenseCategory = isOffice ? "Employee Salary" : "Labour Wages";
    const purposeKey = `${expenseCategory} (${run.month} ${run.halfPeriod})`;

    await prisma.cashBookEntry.deleteMany({
      where: {
        category: expenseCategory,
        purpose: purposeKey,
      },
    });

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: "DRAFT",
        approvedBy: null,
        approvedAt: null,
      },
      include: {
        items: { orderBy: { employeeName: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/reopen]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reopen payroll cycle" },
      { status: 500 }
    );
  }
}
