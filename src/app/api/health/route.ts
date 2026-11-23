import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dbCircuitBreaker } from "@/lib/circuitBreaker";
import { serverCache } from "@/lib/cache";
import { getRateLimitStats } from "@/lib/rateLimit";
import { serviceRegistry } from "@/lib/serviceDiscovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startTime = performance.now();
  let dbStatus: "UP" | "DOWN" | "DEGRADED" = "DOWN";
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  // 1. Probe Neon Cloud PostgreSQL via Circuit Breaker
  try {
    dbLatencyMs = await dbCircuitBreaker.execute(
      async () => {
        const queryStart = performance.now();
        await prisma.$queryRawUnsafe("SELECT 1");
        return Math.round(performance.now() - queryStart);
      },
      () => {
        // Fallback if circuit breaker trips
        return -1;
      }
    );

    if (dbLatencyMs >= 0) {
      dbStatus = "UP";
      serviceRegistry.updateServiceStatus("neon_postgresql", "UP", dbLatencyMs);
    } else {
      dbStatus = "DEGRADED";
      serviceRegistry.updateServiceStatus("neon_postgresql", "DOWN");
      dbError = "Circuit breaker open for database operations";
    }
  } catch (err: any) {
    dbStatus = "DOWN";
    dbError = err.message || "Failed to connect to Neon PostgreSQL";
    serviceRegistry.updateServiceStatus("neon_postgresql", "DOWN");
  }

  const isHealthy = dbStatus !== "DOWN";
  const overallLatencyMs = Math.round(performance.now() - startTime);

  // 2. Gather Platform Telemetry
  const healthData = {
    status: isHealthy ? "healthy" : "degraded",
    service: "Standard Roofs Books (SR-Books)",
    version: "2.6.0-enterprise",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime ? process.uptime() : 0),
    checks: {
      database: {
        provider: "Neon Cloud PostgreSQL",
        status: dbStatus,
        latencyMs: dbLatencyMs >= 0 ? `${dbLatencyMs}ms` : "N/A",
        error: dbError,
        circuitBreaker: dbCircuitBreaker.getMetrics(),
      },
      caching: {
        engine: "In-Memory LRU (Tag-Aware)",
        stats: serverCache.getStats(),
      },
      rateLimiter: {
        engine: "Sliding-Window",
        stats: getRateLimitStats(),
      },
      serviceDiscovery: serviceRegistry.getTopology(),
    },
    system: {
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage ? process.memoryUsage() : {},
      environment: process.env.NODE_ENV || "development",
      platform: process.platform,
    },
    latencyMs: `${overallLatencyMs}ms`,
  };

  const response = NextResponse.json(healthData, {
    status: isHealthy ? 200 : 503,
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("X-Response-Time", `${overallLatencyMs}ms`);
  response.headers.set("X-Service-Name", "sr-books-core");

  return response;
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
