import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedSession } from "@/lib/rbac";
import { getActiveTenantContext } from "@/lib/tenant";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthorizedSession("labour", "EDIT");
    if (auth.error) return auth.error;
    const tenant = await getActiveTenantContext();

    const { id } = await context.params;
    const existingWorker = await prisma.employeeOrLabour.findFirst({
      where: { id, companyId: tenant.companyId },
      select: { id: true },
    });
    if (!existingWorker) {
      return NextResponse.json({ success: false, error: "Employee not found in active organization" }, { status: 404 });
    }
    const body = await req.json();
    const { terms } = body;

    const updated = await prisma.employeeOrLabour.update({
      where: { id },
      data: {
        offerLetterIssuedAt: new Date(),
        offerLetterTerms: terms || "Standard 1-Month Notice Period & Statutory Compliance",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ISSUE_OFFER_LETTER",
        entityType: "EmployeeOrLabour",
        entityId: id,
        newValues: JSON.stringify({
          employeeCode: updated.employeeCode,
          name: updated.name,
          issuedAt: updated.offerLetterIssuedAt,
        }),
        performedById: auth.session.userId,
      },
    });

    return NextResponse.json({ success: true, worker: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
