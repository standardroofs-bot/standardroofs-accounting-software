/**
 * Enterprise Service Discovery & Topology Registry
 * Standard Roofs Books (SR-Books) Platform Infrastructure
 *
 * Resolves internal network endpoints across Kubernetes ClusterIP DNS,
 * Docker Compose bridge network, Cloudflare Tunnel ingress, and localhost.
 */

export interface ServiceEndpoint {
  name: string;
  url: string;
  protocol: "http" | "https" | "postgres";
  internalDns?: string;
  status: "UP" | "DOWN" | "UNKNOWN";
  latencyMs?: number;
  lastChecked?: string;
}

export interface ServiceTopology {
  environment: string;
  instanceId: string;
  hostname: string;
  region: string;
  services: Record<string, ServiceEndpoint>;
}

class ServiceRegistry {
  private instanceId: string;
  private hostname: string;
  private services: Map<string, ServiceEndpoint> = new Map();

  constructor() {
    this.instanceId = `sr-books-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;
    this.hostname = process.env.HOSTNAME || "localhost";
    this.initializeDefaultTopology();
  }

  private initializeDefaultTopology() {
    // 1. Neon Cloud PostgreSQL
    const rawDbUrl = process.env.DATABASE_URL || "";
    let dbHost = "neon-cloud-postgres";
    try {
      if (rawDbUrl) {
        const urlObj = new URL(rawDbUrl.replace("postgresql://", "http://"));
        dbHost = urlObj.hostname;
      }
    } catch {
      // fallback
    }

    this.registerService({
      name: "neon_postgresql",
      url: `postgres://${dbHost}`,
      protocol: "postgres",
      internalDns: dbHost,
      status: "UP",
    });

    // 2. SR-Books Core App (Current Instance)
    const appInternalUrl =
      process.env.SR_BOOKS_INTERNAL_URL ||
      (process.env.NODE_ENV === "production"
        ? "http://sr-books-service.default.svc.cluster.local:80"
        : "http://localhost:3000");

    this.registerService({
      name: "sr_books_core",
      url: appInternalUrl,
      protocol: appInternalUrl.startsWith("https") ? "https" : "http",
      internalDns: "sr-books-service",
      status: "UP",
    });

    // 3. Cloudflare Tunnel Ingress
    const tunnelUrl = process.env.CLOUDFLARE_TUNNEL_URL || "https://books.standardroofs.com";
    this.registerService({
      name: "cloudflare_tunnel",
      url: tunnelUrl,
      protocol: "https",
      status: "UP",
    });
  }

  public registerService(endpoint: ServiceEndpoint): void {
    this.services.set(endpoint.name, {
      ...endpoint,
      lastChecked: new Date().toISOString(),
    });
  }

  public updateServiceStatus(name: string, status: "UP" | "DOWN", latencyMs?: number): void {
    const existing = this.services.get(name);
    if (existing) {
      existing.status = status;
      if (latencyMs !== undefined) existing.latencyMs = latencyMs;
      existing.lastChecked = new Date().toISOString();
    }
  }

  public getTopology(): ServiceTopology {
    const serviceObj: Record<string, ServiceEndpoint> = {};
    for (const [key, value] of this.services.entries()) {
      serviceObj[key] = { ...value };
    }

    return {
      environment: process.env.NODE_ENV || "development",
      instanceId: this.instanceId,
      hostname: this.hostname,
      region: process.env.FLY_REGION || process.env.AWS_REGION || "ap-south-1 (Mumbai / Chennai)",
      services: serviceObj,
    };
  }
}

// Global singleton registry
const globalForRegistry = globalThis as unknown as { serviceRegistry?: ServiceRegistry };
export const serviceRegistry = globalForRegistry.serviceRegistry ?? new ServiceRegistry();
if (process.env.NODE_ENV !== "production") {
  globalForRegistry.serviceRegistry = serviceRegistry;
}
