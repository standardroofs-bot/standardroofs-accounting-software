/**
 * Enterprise Circuit Breaker & Exponential Backoff Retry Resilience
 * Standard Roofs Books (SR-Books) Platform Infrastructure
 *
 * Protects critical database operations (Neon Cloud PostgreSQL) and external
 * integrations (Cloudflare, notification endpoints) from cascading failures.
 *
 * States:
 * - CLOSED: Normal state. Requests pass through.
 * - OPEN: Tripped due to failure threshold. Fast-fails or runs fallback.
 * - HALF_OPEN: Cooldown expired. Trial requests test if downstream recovered.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;     // Number of consecutive failures to trip (default: 5)
  recoveryTimeMs?: number;       // Cooldown duration in ms before HALF_OPEN (default: 30,000ms)
  halfOpenSuccessThreshold?: number; // Consecutive successes in HALF_OPEN to close (default: 2)
  timeoutMs?: number;            // Request timeout in ms (default: 10,000ms)
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();

  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly timeoutMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeMs = options.recoveryTimeMs ?? 30_000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  public getState(): CircuitState {
    // Check if OPEN cooldown period has expired to transition to HALF_OPEN
    if (this.state === "OPEN" && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.transitionTo("HALF_OPEN");
      }
    }
    return this.state;
  }

  private transitionTo(newState: CircuitState) {
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === "HALF_OPEN") {
      this.successCount = 0;
    } else if (newState === "CLOSED") {
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
    }
  }

  /**
   * Execute an operation wrapped in the circuit breaker
   */
  public async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      if (fallback) {
        return await fallback();
      }
      throw new Error(
        `[CircuitBreaker:${this.name}] Circuit is OPEN. Fast-failing downstream call to protect system stability. Cooldown remaining: ${Math.max(
          0,
          Math.ceil((this.recoveryTimeMs - (Date.now() - (this.lastFailureTime || 0))) / 1000)
        )}s`
      );
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[CircuitBreaker:${this.name}] Operation timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error);
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.transitionTo("CLOSED");
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: any) {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.transitionTo("OPEN");
    }
  }

  /**
   * Status metrics for /api/health
   */
  public getMetrics() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
    };
  }
}

/**
 * Exponential backoff retry utility
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryableCondition?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 300;
  const maxDelayMs = options.maxDelayMs ?? 3000;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRetryable = options.retryableCondition ? options.retryableCondition(error) : true;
      if (attempt > maxRetries || !isRetryable) {
        throw error;
      }

      // Exponential backoff with jitter: delay * 2^(attempt - 1) + jitter
      const jitter = Math.random() * 100;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1) + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Global singleton instance for database operations
const globalForBreakers = globalThis as unknown as {
  dbCircuitBreaker?: CircuitBreaker;
};

export const dbCircuitBreaker =
  globalForBreakers.dbCircuitBreaker ??
  new CircuitBreaker({
    name: "NeonPostgreSQL",
    failureThreshold: 5,
    recoveryTimeMs: 25_000,
    timeoutMs: 12_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForBreakers.dbCircuitBreaker = dbCircuitBreaker;
}
