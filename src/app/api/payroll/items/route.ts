import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cycleType = "MONTHLY_OFFICE",
      month,
      halfPeriod = "FULL",
      employeeName,
      employeeCode,
      company = "STANDARD_ROOFS",
      totalWorkingDays = cycleType === "MONTHLY_OFFICE" ? 26 : 15,
      daysPresent = 0,
      baseRate = 0,
      otAndIncentive = 0,
      nightDutyAmount = 0,
      lastMonthBalance = 0,
      advanceDeduction = 0,
      expenseBalanceDeduction = 0,
      paidCash = 0,
      paidBankOrGpay = 0,
      paymentChannel = "CASH",
      notes = null,
    } = body;

    if (!month || !employeeName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Month and Employee Name are required" },
        { status: 400 }
      );
    }

    const effectiveHalf = cycleType === "MONTHLY_OFFICE" ? "FULL" : halfPeriod;
    const itemCategory =
      cycleType === "MONTHLY_OFFICE"
        ? "OFFICE"
        : cycleType === "BI_MONTHLY_TAMIL"
        ? "TAMIL_LABOUR"
        : "HINDI_CREW";

    // Find or create DRAFT run
    let run = await prisma.payrollRun.findUnique({
      where: {
        cycleType_month_halfPeriod_companyFilter: {
          cycleType,
          month,
          halfPeriod: effectiveHalf,
          companyFilter: "ALL",
        },
      },
    });

    if (run?.status === "PAID") {
      return NextResponse.json(
        { success: false, error: "Cannot add rows to a PAID cycle. Reopen the cycle first." },
        { status: 400 }
      );
    }

    if (!run) {
      run = await prisma.payrollRun.create({
        data: {
          cycleType,
          month,
          halfPeriod: effectiveHalf,
          companyFilter: "ALL",
          status: "DRAFT",
        },
      });
    }

    const wrkDays = Number(totalWorkingDays) || (cycleType === "MONTHLY_OFFICE" ? 26 : 15);
    const present = Number(daysPresent) || 0;
    const rate = Number(baseRate) || 0;
    const grossSalary =
      itemCategory === "OFFICE"
        ? Math.round((rate / wrkDays) * present)
        : Math.round(rate * present);

    const ot = Number(otAndIncentive) || 0;
    const night = Number(nightDutyAmount) || 0;
    const prevBal = Number(lastMonthBalance) || 0;
    const adv = Number(advanceDeduction) || 0;
    const exp = Number(expenseBalanceDeduction) || 0;
    const netSalary = Math.round(grossSalary + ot + night + prevBal - adv - exp);

    const cash = Number(paidCash) || 0;
    const bank = Number(paidBankOrGpay) || 0;
    const carryForwardBalance = Math.round((netSalary - (cash + bank)) * 100) / 100;
    const isCleared = cash + bank > 0 && Math.abs(carryForwardBalance) < 1;

    const cleanName = String(employeeName).trim();
    const slug = cleanName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 10);
    const generatedCode = employeeCode?.trim() || `ADHOC-${slug}`;

    const createdItem = await prisma.payrollItem.create({
      data: {
        payrollRunId: run.id,
        employeeId: `ADHOC_${Date.now()}_${slug}`,
        employeeName: cleanName,
        employeeCode: generatedCode,
        category: itemCategory,
        company,
        totalWorkingDays: wrkDays,
        daysPresent: present,
        baseRate: rate,
        grossSalary,
        otAndIncentive: ot,
        nightDutyAmount: night,
        lastMonthBalance: prevBal,
        advanceDeduction: adv,
        expenseBalanceDeduction: exp,
        netSalary,
        paidCash: cash,
        paidBankOrGpay: bank,
        paymentChannel,
        carryForwardBalance,
        isCleared,
        notes: notes ? String(notes).trim() : null,
      },
    });

    const updatedRun = await recalculatePayrollRunTotals(run.id, prisma as any);

    return NextResponse.json({
      success: true,
      item: createdItem,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/items]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add payroll item" },
      { status: 500 }
    );
  }
}
