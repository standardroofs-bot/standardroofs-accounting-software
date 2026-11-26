import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await req.json();
    const { action, resignationDate, handoverChecklist, fnfAmount } = body;

    if (action === "INITIATE_EXIT") {
      const resDate = resignationDate ? new Date(resignationDate) : new Date();
      const lwd = new Date(resDate.getTime() + 30 * 86400000);

      const updated = await prisma.employeeOrLabour.update({
        where: { id },
        data: {
          resignationDate: resDate,
          lastWorkingDate: lwd,
          exitStatus: "NOTICE_PERIOD",
          handoverChecklistJson: JSON.stringify(
            handoverChecklist || {
              toolsReturned: false,
              idCardReturned: false,
              siteKeysReturned: false,
              advanceCleared: false,
              remarks: "",
            }
          ),
        },
      });

      return NextResponse.json({ success: true, worker: updated });
    }

    if (action === "UPDATE_HANDOVER") {
      const updated = await prisma.employeeOrLabour.update({
        where: { id },
        data: {
          handoverChecklistJson: JSON.stringify(handoverChecklist || {}),
        },
      });
      return NextResponse.json({ success: true, worker: updated });
    }

    if (action === "COMPLETE_FNF") {
      const updated = await prisma.employeeOrLabour.update({
        where: { id },
        data: {
          exitStatus: "EXITED",
          status: "ARCHIVED",
          active: false,
          handoverChecklistJson: handoverChecklist ? JSON.stringify(handoverChecklist) : undefined,
          fnfSettlementAmount: Number(fnfAmount || 0),
          fnfSettledAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "COMPLETE_FNF_EXIT",
          entityType: "EmployeeOrLabour",
          entityId: id,
          newValues: JSON.stringify({
            employeeCode: updated.employeeCode,
            fnfSettlementAmount: updated.fnfSettlementAmount,
            lastWorkingDate: updated.lastWorkingDate,
          }),
          performedById: auth.session.userId,
        },
      });

      return NextResponse.json({ success: true, worker: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid exit action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
