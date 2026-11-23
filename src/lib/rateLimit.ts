/**
 * Enterprise In-Memory Sliding-Window Rate Limiter
 * Standard Roofs Books (SR-Books) Platform Infrastructure
 *
 * Protects endpoints from DDoS and brute-force attacks.
 * Default limits:
 * - Auth endpoints (/api/auth/*): 15 req/min
 * - Standard API endpoints (/api/*): 120 req/min
 * - Health checks (/api/health): 300 req/min
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfter: number;
}

interface ClientRecord {
  timestamps: number[];
}

// In-memory sliding-window log per client identifier (IP or user token)
const clientBuckets = new Map<string, ClientRecord>();

// Clean up stale client buckets every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeStaleBuckets(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const expirationThreshold = now - windowMs;
  for (const [key, record] of clientBuckets.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > expirationThreshold);
    if (record.timestamps.length === 0) {
      clientBuckets.delete(key);
    }
  }
}

/**
 * Check if a request exceeds the sliding-window rate limit
 * @param identifier Client IP address or unique token
 * @param limit Maximum requests allowed in the window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 120,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  purgeStaleBuckets(windowMs);

  const windowStart = now - windowMs;
  let record = clientBuckets.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    clientBuckets.set(identifier, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  const currentCount = record.timestamps.length;
  const resetSeconds = Math.max(
    1,
    Math.ceil((record.timestamps[0] ? record.timestamps[0] + windowMs - now : windowMs) / 1000)
  );

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
      retryAfter: resetSeconds,
    };
  }

  // Record this request timestamp
  record.timestamps.push(now);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetSeconds,
    retryAfter: 0,
  };
}

/**
 * Determine rate limit configuration based on route pathname
 */
export function getRouteRateLimit(pathname: string): { limit: number; windowMs: number } {
  // Strict rate limit on authentication routes (prevent credential stuffing)
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/")) {
    return { limit: 15, windowMs: 60_000 }; // 15 req/min
  }

  // Health and metrics routes
  if (pathname === "/api/health") {
    return { limit: 300, windowMs: 60_000 }; // 300 req/min
  }

  // Standard API endpoints
  if (pathname.startsWith("/api/")) {
    return { limit: 120, windowMs: 60_000 }; // 120 req/min
  }

  // Non-API routes
  return { limit: 300, windowMs: 60_000 };
}

/**
 * Get active rate limiter statistics for health telemetry
 */
export function getRateLimitStats(): { activeClients: number; totalTrackedRequests: number } {
  let totalTrackedRequests = 0;
  for (const record of clientBuckets.values()) {
    totalTrackedRequests += record.timestamps.length;
  }
  return {
    activeClients: clientBuckets.size,
    totalTrackedRequests,
  };
}
