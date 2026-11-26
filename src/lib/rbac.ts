import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUserSession, hasModulePermission, ModuleKey, SessionPayload } from "@/lib/auth";

export type RbacAction =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "APPROVE"
  | "POST"
  | "REVERSE"
  | "EXPORT"
  | "BACKUP_RESTORE";

function mapActionToModulePerm(action: RbacAction): "view" | "create" | "edit" | "approve" {
  switch (action) {
    case "VIEW":
    case "EXPORT":
      return "view";
    case "CREATE":
      return "create";
    case "EDIT":
    case "DELETE":
      return "edit";
    case "APPROVE":
    case "POST":
    case "REVERSE":
    case "BACKUP_RESTORE":
      return "approve";
  }
}

export async function requireAuthorizedSession(
  module: ModuleKey,
  action: RbacAction
): Promise<{ session: SessionPayload; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getCurrentUserSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }

  if (action === "BACKUP_RESTORE" && session.role !== UserRole.SUPER_ADMIN) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: Full backup & restore is restricted to SUPER_ADMIN." },
        { status: 403 }
      ),
    };
  }

  const permKey = mapActionToModulePerm(action);
  if (!hasModulePermission(session, module, permKey)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: `Forbidden: Missing '${action}' permission for module '${module}'.`,
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export function enforceMakerChecker(
  createdById: string | null | undefined,
  actor: SessionPayload,
  entityLabel = "transaction"
): NextResponse | null {
  if (createdById && createdById === actor.userId && actor.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json(
      {
        success: false,
        error: `Maker-Checker Violation: You cannot approve, post, or reverse your own ${entityLabel}.`,
      },
      { status: 403 }
    );
  }
  return null;
}
