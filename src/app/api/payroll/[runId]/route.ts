import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });

    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found" }, { status: 404 });
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
