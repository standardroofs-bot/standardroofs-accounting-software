import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";
import { getActiveTenantContext } from "@/lib/tenant";

function getCycleWindow(month: string, halfPeriod: string) {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();

  if (halfPeriod === "FIRST_HALF") {
    return {
      start: new Date(Date.UTC(y, m - 1, 1)),
      end: new Date(Date.UTC(y, m - 1, 15, 23, 59, 59)),
    };
  }
  if (halfPeriod === "SECOND_HALF") {
    return {
      start: new Date(Date.UTC(y, m - 1, 16)),
      end: new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59)),
    };
  }
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59)),
  };
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getActiveTenantContext();
    const body = await req.json();
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json({ success: false, error: "payrollRunId is required" }, { status: 400 });
    }

    const run = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId: tenant.companyId },
      include: { items: true },
    });

    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found in active organization" }, { status: 404 });
    }

    const { start, end } = getCycleWindow(run.month, run.halfPeriod);

    const advanceCategory = run.cycleType === "MONTHLY_OFFICE" ? "Employee Advance" : "Labour Advance";
    const advanceEntries = await prisma.cashBookEntry.findMany({
      where: {
        companyId: tenant.companyId,
        date: { gte: start, lte: end },
        category: advanceCategory,
      },
    });

    let matchedCount = 0;

    for (const item of run.items) {
      const firstName = item.employeeName.toLowerCase().split(/[\s.]+/)[0];
      if (firstName.length < 3) continue;
      const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRe = new RegExp(`\\b${escaped}\\b`, "i");
      const specificRe = new RegExp(`\\b${escaped}[^0-9]{0,6}(\\d+)`, "i");

      let advTotal = 0;
      for (const cb of advanceEntries) {
        const text = `${cb.purpose || ""} ${cb.counterpartyName || ""}`;
        if (wordRe.test(text)) {
          const specificMatch = text.match(specificRe);
          if (specificMatch) {
            advTotal += Number(specificMatch[1]);
          } else if (!text.includes(",")) {
            advTotal += Number(cb.amount);
          }
        }
      }

      if (advTotal > 0) {
        const netSalary = Math.round(
          item.grossSalary +
            item.otAndIncentive +
            (item.performanceIncentive || 0) +
            item.nightDutyAmount +
            item.vehicleAllowance +
            item.lastMonthBalance -
            advTotal -
            item.expenseBalanceDeduction
        );
        const carryForwardBalance = Math.round(
          (netSalary - ((item.paidCash || 0) + (item.paidBankOrGpay || 0) + (item.paidGpay || 0))) * 100
        ) / 100;

        await prisma.payrollItem.update({
          where: { id: item.id },
          data: {
            advanceDeduction: advTotal,
            netSalary,
            carryForwardBalance,
          },
        });
        matchedCount++;
      }
    }

    const updatedRun = await recalculatePayrollRunTotals(run.id, prisma as any);
    const updatedItems = await prisma.payrollItem.findMany({
      where: { payrollRunId: run.id },
      orderBy: { employeeName: "asc" },
    });

    return NextResponse.json({
      success: true,
      matchedCount,
      cashBookAdvancesScanned: advanceEntries.length,
      run: { ...updatedRun, items: updatedItems },
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/sync-advances]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync advances" },
      { status: 500 }
    );
  }
}
