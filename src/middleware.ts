import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME, ModuleKey, hasModulePermission } from "@/lib/auth";
import { checkRateLimit, getRouteRateLimit } from "@/lib/rateLimit";
import { invalidateRouteCache } from "@/lib/cache";

// Public URLs that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/logo.png",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico",
];

// Mapping URL prefixes to module keys for granular permission checks
const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  "/reports": "reports",
  "/api/reports": "reports",
  "/capital": "capital",
  "/capital-loans": "capital",
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
  "/vendors": "suppliers",
  "/api/vendors": "suppliers",
  "/api/purchases": "suppliers",
  "/expenses": "expenses",
  "/api/expenses": "expenses",
  "/fleet": "fleet",
  "/api/fleet": "fleet",
  "/inventory": "inventory",
  "/api/inventory": "inventory",
  "/labour": "labour",
  "/api/labour": "labour",
  "/payroll": "labour",
  "/api/payroll": "labour",
  "/attendance": "labour",
  "/api/attendance": "labour",
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
 * Apply Unified API Gateway & Security headers
 */
function applyGatewayHeaders(
  response: NextResponse,
  requestId: string,
  startTime: number,
  rateLimitInfo?: { limit: number; remaining: number }
): NextResponse {
  // Anti-cache headers to prevent bfcache leaks
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Distributed Tracing & Latency telemetry
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Response-Time", `${Math.round(performance.now() - startTime)}ms`);

  // Defense-in-depth Security Headers
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Rate Limiting headers if available
  if (rateLimitInfo) {
    response.headers.set("X-RateLimit-Limit", String(rateLimitInfo.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitInfo.remaining));
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const startTime = performance.now();
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Correlation ID Tracing
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // 2. Allow static Next.js assets and public branding files ONLY (never bypass /uploads or /print!)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/logo.png" ||
    pathname === "/favicon.ico" ||
    (!pathname.startsWith("/uploads") &&
      !pathname.startsWith("/api/") &&
      pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js|json|webmanifest)$/i))
  ) {
    const res = NextResponse.next();
    res.headers.set("X-Request-Id", requestId);
    return res;
  }

  // 3. Sliding-Window Rate Limiter Protection for /api/*
  let rateLimitInfo: { limit: number; remaining: number } | undefined;
  if (pathname.startsWith("/api/")) {
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { limit, windowMs } = getRouteRateLimit(pathname);
    const rateLimit = checkRateLimit(`${clientIp}:${pathname.startsWith("/api/auth/") ? "auth" : "api"}`, limit, windowMs);
    rateLimitInfo = { limit: rateLimit.limit, remaining: rateLimit.remaining };

    if (!rateLimit.allowed) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: `Too Many Requests. Rate limit exceeded, please retry in ${rateLimit.retryAfter}s.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
      errorResponse.headers.set("Retry-After", String(rateLimit.retryAfter));
      errorResponse.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
      errorResponse.headers.set("X-RateLimit-Remaining", "0");
      errorResponse.headers.set("X-RateLimit-Reset", String(rateLimit.resetSeconds));
      return applyGatewayHeaders(errorResponse, requestId, startTime, rateLimitInfo);
    }

    // Auto-invalidate server cache on mutations
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      invalidateRouteCache(pathname);
    }
  }

  // Allow Health & Public Whitelist routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return applyGatewayHeaders(NextResponse.next(), requestId, startTime, rateLimitInfo);
  }

  // 4. Extract and verify session token
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 5. Handle unauthenticated requests
  if (!session) {
    if (pathname.startsWith("/api/") || pathname.startsWith("/uploads/")) {
      return applyGatewayHeaders(
        NextResponse.json(
          { success: false, error: "Authentication required. Please log in." },
          { status: 401 }
        ),
        requestId,
        startTime,
        rateLimitInfo
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return applyGatewayHeaders(NextResponse.redirect(loginUrl), requestId, startTime);
  }

  // 5.0 Rewrite authenticated /uploads/* requests to authenticated /api/files/* handler
  if (pathname.startsWith("/uploads/")) {
    const fileSubpath = pathname.slice("/uploads/".length);
    const rewriteUrl = new URL(`/api/files/${fileSubpath}`, request.url);
    return applyGatewayHeaders(NextResponse.rewrite(rewriteUrl), requestId, startTime, rateLimitInfo);
  }

  // 5.1 Strict Role Isolation for EMPLOYEE (Tier 3: Read-Only Self-Service Portal Only)
  if (session.role === "EMPLOYEE") {
    const isEmployeeAllowed =
      pathname === "/my-attendance" ||
      pathname.startsWith("/my-attendance/") ||
      pathname === "/api/my-attendance" ||
      pathname.startsWith("/api/my-attendance/") ||
      pathname === "/api/leave-requests" ||
      pathname.startsWith("/api/leave-requests/") ||
      pathname === "/api/attendance/holidays" ||
      pathname === "/api/auth/me" ||
      pathname === "/api/auth/logout" ||
      pathname === "/api/health";

    if (!isEmployeeAllowed) {
      if (pathname.startsWith("/api/")) {
        return applyGatewayHeaders(
          NextResponse.json(
            { success: false, error: "Access Denied: Employee accounts are restricted to the Self-Service Portal." },
            { status: 403 }
          ),
          requestId,
          startTime,
          rateLimitInfo
        );
      }
      return applyGatewayHeaders(NextResponse.redirect(new URL("/my-attendance", request.url)), requestId, startTime);
    }
    return applyGatewayHeaders(NextResponse.next(), requestId, startTime, rateLimitInfo);
  }

  // 5.2 Strict Role Isolation for HR_MANAGER (Tier 2: HR, Attendance & Payroll Workspace Only)
  if (session.role === "HR_MANAGER") {
    const isHrAllowed =
      pathname === "/attendance" ||
      pathname.startsWith("/attendance/") ||
      pathname === "/labour" ||
      pathname.startsWith("/labour/") ||
      pathname === "/payroll" ||
      pathname.startsWith("/payroll/") ||
      pathname === "/recycle-bin" ||
      pathname.startsWith("/recycle-bin/") ||
      pathname === "/my-attendance" ||
      pathname.startsWith("/my-attendance/") ||
      pathname.startsWith("/api/attendance") ||
      pathname.startsWith("/api/labour") ||
      pathname.startsWith("/api/upload") ||
      pathname.startsWith("/api/leave-requests") ||
      pathname.startsWith("/api/recycle-bin") ||
      pathname.startsWith("/api/users/password") ||
      pathname.startsWith("/api/payroll") ||
      pathname === "/api/auth/me" ||
      pathname === "/api/auth/logout" ||
      pathname === "/api/health";

    if (!isHrAllowed) {
      if (pathname.startsWith("/api/")) {
        return applyGatewayHeaders(
          NextResponse.json(
            { success: false, error: "Access Denied: HR Department accounts are restricted to HR, Attendance & Payroll." },
            { status: 403 }
          ),
          requestId,
          startTime,
          rateLimitInfo
        );
      }
      return applyGatewayHeaders(NextResponse.redirect(new URL("/attendance", request.url)), requestId, startTime);
    }
    return applyGatewayHeaders(NextResponse.next(), requestId, startTime, rateLimitInfo);
  }

  // 6. Granular Action-Level Module Permission Enforcement
  const requiredAction: "view" | "create" | "edit" | "approve" =
    method === "POST"
      ? pathname.includes("/approve") || pathname.includes("/reverse") || pathname.includes("/fy-lock") || pathname.includes("/backup")
        ? "approve"
        : "create"
      : method === "PUT" || method === "PATCH" || method === "DELETE"
      ? "edit"
      : "view";

  for (const [routePrefix, moduleKey] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + "/")) {
      const isAllowed = hasModulePermission(session, moduleKey, requiredAction);
      if (!isAllowed) {
        if (pathname.startsWith("/api/")) {
          return applyGatewayHeaders(
            NextResponse.json(
              {
                success: false,
                error: `Access Denied: You do not have permission to access module '${moduleKey}'.`,
              },
              { status: 403 }
            ),
            requestId,
            startTime,
            rateLimitInfo
          );
        }
        // Redirect unauthorized page access to allowed landing page
        if (session.role === "SITE_SUPERVISOR") {
          return applyGatewayHeaders(NextResponse.redirect(new URL("/expenses", request.url)), requestId, startTime);
        }
        return applyGatewayHeaders(NextResponse.redirect(new URL("/", request.url)), requestId, startTime);
      }
      break;
    }
  }

  return applyGatewayHeaders(NextResponse.next(), requestId, startTime, rateLimitInfo);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static, _next/image (static Next.js bundles)
     * - favicon.ico, logo.png (branding images)
     * - images, uploads, icons (static assets)
     * - sw.js, manifest.webmanifest (PWA files)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|images|icons|manifest.webmanifest|sw.js).*)",
  ],
};
