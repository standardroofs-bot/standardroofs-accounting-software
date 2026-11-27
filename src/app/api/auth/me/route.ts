import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTenantContext } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        defaultCompanyId: true,
        permissions: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      return NextResponse.json({ success: false, error: "User deactivated or not found" }, { status: 401 });
    }

    const tenant = await getActiveTenantContext();

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        role: tenant.role,
        activeCompanyId: tenant.companyId,
        activeCompany: {
          id: tenant.companyId,
          code: tenant.companyCode,
          name: tenant.companyName,
          tagline: tenant.companyTagline,
          gstin: tenant.companyGstin,
        },
        allowedCompanies: tenant.allowedCompanies,
        isGroupSuperAdmin: tenant.isGroupSuperAdmin,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
