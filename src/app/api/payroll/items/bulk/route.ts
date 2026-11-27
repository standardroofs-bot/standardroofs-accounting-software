import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculatePayrollRunTotals } from "@/lib/payrollTotals";
import { getActiveTenantContext } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const tenant = await getActiveTenantContext();
    const body = await req.json();
    const { payrollRunId, itemIds, action, paymentChannel } = body;

    if (!payrollRunId || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "payrollRunId and itemIds[] are required" },
        { status: 400 }
      );
    }

    const run = await prisma.payrollRun.findFirst({ where: { id: payrollRunId, companyId: tenant.companyId } });
    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found in active organization" }, { status: 404 });
    }

    if (action === "MARK_CLEARED") {
      const items = await prisma.payrollItem.findMany({ where: { id: { in: itemIds } } });
      const now = new Date();
      for (const it of items) {
        const isGpay = it.paymentChannel === "OFFICE_GPAY";
        const isCash = it.paymentChannel === "CASH";
        const isBank = !isCash && !isGpay;
        await prisma.payrollItem.update({
          where: { id: it.id },
          data: {
            paidCash: isCash ? it.netSalary : 0,
            paidBankOrGpay: isBank ? it.netSalary : 0,
            paidGpay: isGpay ? it.netSalary : 0,
            carryForwardBalance: 0,
            paymentStatus: "PAID",
            paidDate: it.paidDate || now,
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
