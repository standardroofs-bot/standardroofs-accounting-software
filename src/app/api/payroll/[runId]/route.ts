import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/tenant";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const tenant = await getActiveTenantContext();
    const { runId } = await context.params;
    const run = await prisma.payrollRun.findFirst({ where: { id: runId, companyId: tenant.companyId } });

    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found in active organization" }, { status: 404 });
    }

    if (run.status === "PAID") {
      return NextResponse.json(
        { success: false, error: "Cannot delete a PAID cycle. Reopen it to DRAFT first." },
        { status: 400 }
      );
    }

    await prisma.payrollRun.delete({ where: { id: runId } });

    return NextResponse.json({
      success: true,
      deletedRunId: runId,
    });
  } catch (error: any) {
    console.error("[DELETE /api/payroll/[runId]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete payroll cycle" },
      { status: 500 }
    );
  }
}
