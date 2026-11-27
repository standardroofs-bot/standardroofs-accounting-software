import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeCashBookWalletName,
  recalculatePayrollRunTotals,
  syncPayrollItemCashBookLegs,
} from "@/lib/payrollTotals";
import { getActiveTenantContext } from "@/lib/tenant";
import { syncEmployeeToOpenDraftRuns } from "@/lib/payrollAttendanceSync";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.payrollItem.findUnique({
      where: { id },
      include: { payrollRun: true },
    });

    if (!existing || existing.payrollRun.companyId !== tenant.companyId) {
      return NextResponse.json({ success: false, error: "Payroll item not found in active organization" }, { status: 404 });
    }

    const paidCash =
      body.paidCash !== undefined && Number.isFinite(Number(body.paidCash))
        ? Number(body.paidCash)
        : existing.paidCash;
    const paidBankOrGpay =
      body.paidBankOrGpay !== undefined && Number.isFinite(Number(body.paidBankOrGpay))
        ? Number(body.paidBankOrGpay)
        : existing.paidBankOrGpay;
    const paidGpay =
      body.paidGpay !== undefined && Number.isFinite(Number(body.paidGpay))
        ? Number(body.paidGpay)
        : (existing.paidGpay || 0);

    const gpayWallet = normalizeCashBookWalletName(body.gpayWallet || existing.gpayWallet || "Office Gpay");
    const bankWallet = body.bankWallet === "RBL" ? "RBL" : "ICICI";
    const paymentRef =
      body.paymentRef !== undefined
        ? body.paymentRef
          ? String(body.paymentRef).trim()
          : null
        : existing.paymentRef;
    const paidDate = body.paidDate ? new Date(body.paidDate) : existing.paidDate || new Date();
    const paymentReason =
      body.paymentReason !== undefined
        ? body.paymentReason
          ? String(body.paymentReason).trim()
          : null
        : existing.paymentReason;
    const notes =
      body.notes !== undefined
        ? body.notes
          ? String(body.notes).trim()
          : null
        : existing.notes;

    const totalPaid = Math.round((paidCash + paidBankOrGpay + paidGpay) * 100) / 100;
    const carryForwardBalance = Math.round((existing.netSalary - totalPaid) * 100) / 100;

    const paymentStatus =
      body.paymentStatus === "HOLD"
        ? "HOLD"
        : totalPaid >= existing.netSalary && (existing.netSalary > 0 || totalPaid > 0)
        ? "PAID"
        : totalPaid > 0
        ? "PARTIAL"
        : "UNPAID";

    const paymentChannel =
      body.paymentChannel
        ? String(body.paymentChannel)
        : paidBankOrGpay > 0 && paidCash === 0 && paidGpay === 0
        ? bankWallet
        : paidGpay > 0 && paidCash === 0 && paidBankOrGpay === 0
        ? "OFFICE_GPAY"
        : paidCash > 0 && paidBankOrGpay === 0 && paidGpay === 0
        ? "CASH"
        : existing.paymentChannel;

    const updatedItem = await prisma.payrollItem.update({
      where: { id },
      data: {
        paidCash,
        paidBankOrGpay,
        paidGpay,
        gpayWallet,
        paymentRef,
        paidDate: totalPaid > 0 || body.paidDate ? paidDate : null,
        paymentReason,
        notes,
        paymentChannel,
        carryForwardBalance,
        paymentStatus,
        isCleared: paymentStatus === "PAID",
      },
    });

    await syncPayrollItemCashBookLegs(prisma as any, updatedItem, existing.payrollRun, {
      bankWallet,
      gpayWallet,
      syncToCashBook: body.syncToCashBook !== false,
    });

    const updatedRun = await recalculatePayrollRunTotals(existing.payrollRunId, prisma as any);
    await syncEmployeeToOpenDraftRuns(tenant.companyId);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      run: updatedRun,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/items/[id]/mark-paid]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark payroll item as paid" },
      { status: 500 }
    );
  }
}
