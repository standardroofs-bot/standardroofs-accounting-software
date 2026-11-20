import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME, ModuleKey, hasModulePermission } from "@/lib/auth";

// Public URLs that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/favicon.ico",
];

// Mapping URL prefixes to module keys for granular permission checks
const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  "/reports": "reports",
  "/api/reports": "reports",
  "/capital": "capital",
  "/api/capital": "capital",
  "/banking": "banking",
  "/api/banking": "banking",
  "/api/bank-accounts": "banking",
  "/cashbook": "cashbook",
  "/api/cashbook": "cashbook",
  "/invoices": "invoices",
  "/api/invoices": "invoices",
  "/estimates": "estimates",
  "/api/estimates": "estimates",
  "/credit-notes": "credit_debit_notes",
  "/api/credit-notes": "credit_debit_notes",
  "/advances": "advances",
  "/api/advances": "advances",
  "/recurring": "recurring",
  "/api/recurring": "recurring",
  "/price-catalog": "price_catalog",
  "/api/price-catalog": "price_catalog",
  "/customers": "customers",
  "/api/customers": "customers",
  "/projects": "projects",
  "/api/projects": "projects",
  "/suppliers": "suppliers",
  "/api/suppliers": "suppliers",
  "/api/purchases": "suppliers",
  "/expenses": "expenses",
  "/api/expenses": "expenses",
  "/fleet": "fleet",
  "/api/fleet": "fleet",
  "/inventory": "inventory",
  "/api/inventory": "inventory",
  "/labour": "labour",
  "/api/labour": "labour",
  "/vouchers": "vouchers",
  "/api/vouchers": "vouchers",
  "/accounts": "accounts",
  "/api/chart-of-accounts": "accounts",
  "/machines": "machines",
  "/api/machines": "machines",
  "/import": "import",
  "/api/import": "import",
  "/settings": "settings",
  "/api/settings": "settings",
  "/audit": "audit",
  "/api/audit": "audit",
  "/users": "users",
  "/api/users": "users",
  "/approvals": "approvals",
  "/api/approvals": "approvals",
};

/**
 * Apply strict anti-cache HTTP headers to prevent bfcache leaks on browser Back/Forward
 */
function applyAntiCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static Next.js assets, public files, and whitelisted public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/images") ||
    pathname.includes("/print") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Extract and verify session token
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 3. Handle unauthenticated requests
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return applyAntiCacheHeaders(
        NextResponse.json(
          { success: false, error: "Authentication required. Please log in." },
          { status: 401 }
        )
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return applyAntiCacheHeaders(NextResponse.redirect(loginUrl));
  }

  // 4. Granular Module Permission Enforcement
  for (const [routePrefix, moduleKey] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + "/")) {
      const isAllowed = hasModulePermission(session, moduleKey, "view");
      if (!isAllowed) {
        if (pathname.startsWith("/api/")) {
          return applyAntiCacheHeaders(
            NextResponse.json(
              {
                success: false,
                error: `Access Denied: You do not have permission to access module '${moduleKey}'.`,
              },
              { status: 403 }
            )
          );
        }
        // Redirect unauthorized page access to allowed landing page
        if (session.role === "SITE_SUPERVISOR") {
          return applyAntiCacheHeaders(NextResponse.redirect(new URL("/expenses", request.url)));
        }
        if (session.role === "HR_MANAGER") {
          return applyAntiCacheHeaders(NextResponse.redirect(new URL("/labour", request.url)));
        }
        return applyAntiCacheHeaders(NextResponse.redirect(new URL("/", request.url)));
      }
      break;
    }
  }

  return applyAntiCacheHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, uploads (static assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|uploads).*)",
  ],
};
