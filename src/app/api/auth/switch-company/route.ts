import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, createSessionToken, getCurrentUserSession, getDefaultPermissionsForRole } from "@/lib/auth";
import { ACTIVE_COMPANY_COOKIE, getUserAllowedCompanies } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const requestedCompanyId = String(body.companyId || "").trim();
    if (!requestedCompanyId) {
      return NextResponse.json({ success: false, error: "companyId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, error: "User not active" }, { status: 401 });
    }

    const allowedCompanies = await getUserAllowedCompanies(
      user.id,
      user.role,
      user.defaultCompanyId
    );
    const targetAccess = allowedCompanies.find(
      (c) => c.id === requestedCompanyId || c.code === requestedCompanyId
    );
    if (!targetAccess) {
      return NextResponse.json(
        { success: false, error: "Access Denied: You do not have permission to switch to this organization." },
        { status: 403 }
      );
    }

    const effectiveRole = targetAccess.role || user.role;
    const permissions = (user.permissions as any) || getDefaultPermissionsForRole(effectiveRole);

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
      employeeId: user.employeeId || undefined,
      activeCompanyId: targetAccess.id,
      allowedCompanyIds: allowedCompanies.map((c) => c.id),
      permissions,
    });

    const response = NextResponse.json({
      success: true,
      activeCompany: targetAccess,
      allowedCompanies,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.set(ACTIVE_COMPANY_COOKIE, targetAccess.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/auth/switch-company]", error);
    return NextResponse.json({ success: false, error: error.message || "Switch failed" }, { status: 500 });
  }
}
