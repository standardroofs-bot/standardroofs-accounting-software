import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserSession, SessionPayload } from "@/lib/auth";

export const STANDARD_ROOFS_COMPANY_ID = "standard-roofs";
export const INVI_CREATION_COMPANY_ID = "invi-creation";
export const ACTIVE_COMPANY_COOKIE = "sr_active_company";

export interface TenantCompanySummary {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  gstin: string | null;
  role: UserRole;
  isDefault: boolean;
}

export interface TenantContext {
  session: SessionPayload | null;
  userId: string | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isGroupSuperAdmin: boolean;
  companyId: string;
  companyCode: "STANDARD_ROOFS" | "INVI_CREATION";
  companyName: string;
  companyTagline: string;
  companyGstin: string | null;
  companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
  allowedCompanies: TenantCompanySummary[];
}

export function getCompanyUnitForCompanyId(companyId: string): "STANDARD_ROOFS" | "INVI_CREATION" {
  return companyId === INVI_CREATION_COMPANY_ID ? "INVI_CREATION" : "STANDARD_ROOFS";
}

const DEFAULT_COMPANIES: Record<string, { code: "STANDARD_ROOFS" | "INVI_CREATION"; name: string; tagline: string; gstin: string | null }> = {
  [STANDARD_ROOFS_COMPANY_ID]: {
    code: "STANDARD_ROOFS",
    name: "Standard Roofs",
    tagline: "Construction & Roofing • Erode",
    gstin: "33AEWFS5187G1ZD",
  },
  [INVI_CREATION_COMPANY_ID]: {
    code: "INVI_CREATION",
    name: "Invi Creation",
    tagline: "Women's Ethnic Wear & Digital Hub • Erode",
    gstin: null,
  },
};

export async function getUserAllowedCompanies(userId: string, fallbackRole: UserRole, fallbackCompanyId?: string | null): Promise<TenantCompanySummary[]> {
  try {
    const rows = await prisma.userCompanyAccess.findMany({
      where: { userId },
      include: { company: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    if (rows.length > 0) {
      return rows
        .filter((r) => r.company?.isActive !== false)
        .map((r) => ({
          id: r.companyId,
          code: r.company.code,
          name: r.company.name,
          tagline: r.company.tagline,
          gstin: r.company.gstin,
          role: r.role,
          isDefault: r.isDefault,
        }));
    }
  } catch {
    // Fallback cleanly if UserCompanyAccess table is still initializing
  }

  const fbId = fallbackCompanyId || STANDARD_ROOFS_COMPANY_ID;
  const meta = DEFAULT_COMPANIES[fbId] || DEFAULT_COMPANIES[STANDARD_ROOFS_COMPANY_ID];
  return [
    {
      id: fbId,
      code: meta.code,
      name: meta.name,
      tagline: meta.tagline,
      gstin: meta.gstin,
      role: fallbackRole,
      isDefault: true,
    },
  ];
}

export async function getActiveTenantContext(): Promise<TenantContext> {
  const session = await getCurrentUserSession();
  const cookieStore = await cookies();
  const cookieCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  if (!session) {
    const meta = DEFAULT_COMPANIES[STANDARD_ROOFS_COMPANY_ID];
    return {
      session: null,
      userId: null,
      role: UserRole.VIEWER,
      isSuperAdmin: false,
      isGroupSuperAdmin: false,
      companyId: STANDARD_ROOFS_COMPANY_ID,
      companyCode: meta.code,
      companyName: meta.name,
      companyTagline: meta.tagline,
      companyGstin: meta.gstin,
      companyUnit: "STANDARD_ROOFS",
      allowedCompanies: [
        {
          id: STANDARD_ROOFS_COMPANY_ID,
          code: meta.code,
          name: meta.name,
          tagline: meta.tagline,
          gstin: meta.gstin,
          role: UserRole.VIEWER,
          isDefault: true,
        },
      ],
    };
  }

  const allowedCompanies = await getUserAllowedCompanies(
    session.userId,
    session.role,
    session.activeCompanyId || STANDARD_ROOFS_COMPANY_ID
  );

  const requestedId = cookieCompanyId || session.activeCompanyId;
  const activeEntry =
    allowedCompanies.find((c) => c.id === requestedId) ||
    allowedCompanies.find((c) => c.isDefault) ||
    allowedCompanies[0];

  const companyId = activeEntry.id;
  const meta = DEFAULT_COMPANIES[companyId] || DEFAULT_COMPANIES[STANDARD_ROOFS_COMPANY_ID];
  const effectiveRole = activeEntry.role || session.role;

  return {
    session,
    userId: session.userId,
    role: effectiveRole,
    isSuperAdmin: String(effectiveRole).toUpperCase() === "SUPER_ADMIN",
    isGroupSuperAdmin:
      allowedCompanies.length > 1 && String(effectiveRole).toUpperCase() === "SUPER_ADMIN",
    companyId,
    companyCode: (activeEntry.code as "STANDARD_ROOFS" | "INVI_CREATION") || meta.code,
    companyName: activeEntry.name || meta.name,
    companyTagline: activeEntry.tagline || meta.tagline,
    companyGstin: activeEntry.gstin ?? meta.gstin,
    companyUnit: getCompanyUnitForCompanyId(companyId),
    allowedCompanies,
  };
}
