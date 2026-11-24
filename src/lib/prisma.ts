import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Error codes and messages considered transient in Neon PostgreSQL serverless pooling
const TRANSIENT_NEON_ERRORS = [
  "P1001", // Can't reach database server
  "P1002", // Database server was reached but timed out
  "P1008", // Operations timed out
  "P1017", // Server closed connection
  "Connection terminated",
  "connection reset",
  "ECONNRESET",
  "ETIMEDOUT",
  "Can't reach database",
];

function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const code = error.code || "";
  return TRANSIENT_NEON_ERRORS.some(
    (target) => code === target || msg.includes(target.toLowerCase())
  );
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Attach retry extension for resilient serverless connection pooling
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          let attempts = 0;
          const maxAttempts = 3;
          while (true) {
            try {
              return await query(args);
            } catch (error: any) {
              attempts++;
              if (attempts >= maxAttempts || !isTransientError(error)) {
                throw error;
              }
              const jitter = Math.random() * 80;
              const delay = Math.min(1500, 200 * Math.pow(2, attempts - 1) + jitter);
              console.warn(`[Prisma:NeonRetry] Transient error on ${model}.${operation} (attempt ${attempts}/${maxAttempts}). Retrying in ${Math.round(delay)}ms...`);
              await new Promise((res) => setTimeout(res, delay));
            }
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always keep singleton instance across development and production
globalForPrisma.prisma = prisma;

