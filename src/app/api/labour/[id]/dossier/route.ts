import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "VIEW");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const isSuperAdmin = auth.session.role === "SUPER_ADMIN";

    const worker = await prisma.employeeOrLabour.findUnique({
      where: { id },
      include: {
        attendances: { orderBy: { date: "desc" }, take: 90 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 20 },
        performanceReviews: { orderBy: { month: "desc" }, take: 12 },
      },
    });

    if (!worker) {
      return NextResponse.json({ success: false, error: "Worker not found" }, { status: 404 });
    }

    const payrollHistory = await prisma.payrollItem.findMany({
      where: { employeeId: id },
      include: {
        payrollRun: {
          select: { month: true, halfPeriod: true, cycleType: true, status: true },
        },
      },
      orderBy: { payrollRun: { month: "desc" } },
      take: 24,
    });

    return NextResponse.json({
      success: true,
      worker: isSuperAdmin
        ? worker
        : {
            ...worker,
            monthlySalary: null,
            dailyWage: null,
            baseWage: null,
            defaultVehicleAllowance: 0,
            salaryMasked: true,
          },
      payrollHistory: isSuperAdmin
        ? payrollHistory
        : payrollHistory.map((p) => ({
            ...p,
            baseRate: 0,
            grossSalary: 0,
            netSalary: 0,
            paidCash: 0,
            paidBankOrGpay: 0,
            paidGpay: 0,
            salaryMasked: true,
          })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
