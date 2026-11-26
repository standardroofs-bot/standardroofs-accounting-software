import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FATAL SECURITY ERROR: process.env.SESSION_SECRET must be configured and at least 32 characters long."
    );
  }
  return new TextEncoder().encode(secret);
}

export const COOKIE_NAME = "sr_session";

export type ModuleKey =
  | "dashboard"
  | "estimates"
  | "customers"
  | "projects"
  | "invoices"
  | "credit_debit_notes"
  | "advances"
  | "recurring"
  | "price_catalog"
  | "suppliers"
  | "expenses"
  | "fleet"
  | "inventory"
  | "labour"
  | "reports"
  | "capital"
  | "cashbook"
  | "banking"
  | "accounts"
  | "vouchers"
  | "machines"
  | "import"
  | "settings"
  | "audit"
  | "users"
  | "approvals";

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
}

export type UserPermissions = Record<ModuleKey, ModulePermission>;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  permissions?: UserPermissions;
}

export const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "estimates",
  "customers",
  "projects",
  "invoices",
  "credit_debit_notes",
  "advances",
  "recurring",
  "price_catalog",
  "suppliers",
  "expenses",
  "fleet",
  "inventory",
  "labour",
  "reports",
  "capital",
  "cashbook",
  "banking",
  "accounts",
  "vouchers",
  "machines",
  "import",
  "settings",
  "audit",
  "users",
  "approvals",
];

export function getFullPermissions(): UserPermissions {
  const p: Partial<UserPermissions> = {};
  for (const m of ALL_MODULES) {
    p[m] = { view: true, create: true, edit: true, approve: true };
  }
  return p as UserPermissions;
}

export function getNoPermissions(): UserPermissions {
  const p: Partial<UserPermissions> = {};
  for (const m of ALL_MODULES) {
    p[m] = { view: false, create: false, edit: false, approve: false };
  }
  return p as UserPermissions;
}

export function getDefaultPermissionsForRole(role: UserRole): UserPermissions {
  const perms = getNoPermissions();

  if (role === UserRole.SUPER_ADMIN || role === UserRole.MANAGING_DIRECTOR) {
    return getFullPermissions();
  }

  if (role === UserRole.ACCOUNTANT) {
    const accModules: ModuleKey[] = [
      "dashboard",
      "estimates",
      "customers",
      "projects",
      "invoices",
      "credit_debit_notes",
      "advances",
      "recurring",
      "price_catalog",
      "suppliers",
      "expenses",
      "fleet",
      "inventory",
      "labour",
      "reports",
      "capital",
      "cashbook",
      "banking",
      "accounts",
      "vouchers",
      "machines",
      "import",
      "approvals",
      "audit",
    ];
    accModules.forEach((m) => {
      perms[m] = { view: true, create: true, edit: true, approve: true };
    });
    return perms;
  }

  if (role === UserRole.HR_MANAGER) {
    // HR Manager gets access ONLY to labour, expenses, machines. Financial pages are blocked!
    perms.labour = { view: true, create: true, edit: true, approve: true };
    perms.expenses = { view: true, create: true, edit: true, approve: false };
    perms.machines = { view: true, create: false, edit: false, approve: false };
    perms.approvals = { view: true, create: false, edit: false, approve: true };
    return perms;
  }

  if (role === UserRole.ACCOUNTS_EXECUTIVE) {
    const execModules: ModuleKey[] = [
      "dashboard",
      "invoices",
      "estimates",
      "customers",
      "suppliers",
      "expenses",
      "cashbook",
      "banking",
      "vouchers",
    ];
    execModules.forEach((m) => {
      perms[m] = { view: true, create: true, edit: true, approve: false };
    });
    return perms;
  }

  if (role === UserRole.PROJECT_MANAGER) {
    const pmModules: ModuleKey[] = [
      "projects",
      "estimates",
      "machines",
      "inventory",
      "fleet",
      "expenses",
    ];
    pmModules.forEach((m) => {
      perms[m] = { view: true, create: true, edit: true, approve: false };
    });
    return perms;
  }

  if (role === UserRole.SITE_SUPERVISOR) {
    // Site Supervisor gets only expenses (photo upload) and machines
    perms.expenses = { view: true, create: true, edit: false, approve: false };
    perms.machines = { view: true, create: false, edit: false, approve: false };
    perms.fleet = { view: true, create: true, edit: false, approve: false };
    return perms;
  }

  if (role === UserRole.VIEWER) {
    const viewModules: ModuleKey[] = [
      "dashboard",
      "invoices",
      "estimates",
      "projects",
      "fleet",
      "inventory",
    ];
    viewModules.forEach((m) => {
      perms[m] = { view: true, create: false, edit: false, approve: false };
    });
    return perms;
  }

  return perms;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUserSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export function hasModulePermission(
  user: SessionPayload,
  module: ModuleKey,
  action: "view" | "create" | "edit" | "approve" = "view"
): boolean {
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.MANAGING_DIRECTOR) {
    return true;
  }
  const perms = user.permissions || getDefaultPermissionsForRole(user.role);
  return !!perms[module]?.[action];
}
