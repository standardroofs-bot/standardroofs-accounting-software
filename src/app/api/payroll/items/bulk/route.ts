import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payrollRunId, itemIds, action, paymentChannel } = body;

    if (!payrollRunId || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "payrollRunId and itemIds[] are required" },
        { status: 400 }
      );
    }

    const run = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found" }, { status: 404 });
    }

    if (action === "MARK_CLEARED") {
      const items = await prisma.payrollItem.findMany({ where: { id: { in: itemIds } } });
      for (const it of items) {
        const isBank = it.paymentChannel !== "CASH";
        await prisma.payrollItem.update({
          where: { id: it.id },
          data: {
            paidCash: isBank ? 0 : it.netSalary,
            paidBankOrGpay: isBank ? it.netSalary : 0,
            carryForwardBalance: 0,
            isCleared: true,
          },
        });
      }
    } else if (action === "SET_CHANNEL" && paymentChannel) {
      await prisma.payrollItem.updateMany({
        where: { id: { in: itemIds } },
        data: { paymentChannel },
      });
    } else if (action === "DELETE_SELECTED") {
      await prisma.payrollItem.deleteMany({
        where: { id: { in: itemIds } },
      });
    } else {
      return NextResponse.json({ success: false, error: "Unsupported bulk action" }, { status: 400 });
    }

    const updatedRun = await recalculatePayrollRunTotals(payrollRunId, prisma as any);
    const updatedItems = await prisma.payrollItem.findMany({
      where: { payrollRunId },
      orderBy: { employeeName: "asc" },
    });

    return NextResponse.json({
      success: true,
      run: { ...updatedRun, items: updatedItems },
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/items/bulk]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Bulk action failed" },
      { status: 500 }
    );
  }
}
