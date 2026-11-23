/**
 * Enterprise In-Memory Tag-Aware LRU Cache
 * Standard Roofs Books (SR-Books) Platform Infrastructure
 *
 * Provides sub-15ms response times for read-heavy endpoints:
 * - /api/attendance
 * - /api/labour
 * - /api/price-catalog
 * - /api/settings
 * - /api/chart-of-accounts
 *
 * Automatically invalidates entries when data is modified via POST/PUT/PATCH/DELETE.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: Set<string>;
  createdAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxItems = 1000;
  private hits = 0;
  private misses = 0;

  /**
   * Retrieve a cached item if present and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Refresh access order (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value as T;
  }

  /**
   * Store an item with TTL (in seconds) and associated tags
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60, tags: string[] = []): void {
    // Evict oldest item if capacity reached
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags: new Set(tags),
      createdAt: Date.now(),
    });
  }

  /**
   * Invalidate all keys matching a specific tag
   * e.g. invalidateTag("attendance") clears all cached attendance grids
   */
  invalidateTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.has(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all keys matching any of the given tags
   */
  invalidateTags(tags: string[]): number {
    let count = 0;
    for (const tag of tags) {
      count += this.invalidateTag(tag);
    }
    return count;
  }

  /**
   * Invalidate a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Flush all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Telemetry stats for /api/health
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRatio: number;
    tags: Record<string, number>;
  } {
    const tagCounts: Record<string, number> = {};
    for (const entry of this.cache.values()) {
      for (const tag of entry.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? Math.round((this.hits / total) * 100) : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      tags: tagCounts,
    };
  }
}

// Global singleton instance preserved across HMR in development
const globalForCache = globalThis as unknown as { appCache?: MemoryCache };
export const serverCache = globalForCache.appCache ?? new MemoryCache();
if (process.env.NODE_ENV !== "production") {
  globalForCache.appCache = serverCache;
}

/**
 * Cache-aside wrapper: Fetches from cache, or runs fetcher and caches result
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60,
  tags: string[] = []
): Promise<T> {
  const cached = serverCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  serverCache.set(key, fresh, ttlSeconds, tags);
  return fresh;
}

/**
 * Helper to auto-invalidate relevant tags based on mutation route
 */
export function invalidateRouteCache(pathname: string): void {
  if (pathname.includes("/attendance") || pathname.includes("/leave-requests")) {
    serverCache.invalidateTags(["attendance", "dashboard"]);
  } else if (pathname.includes("/labour") || pathname.includes("/contractors")) {
    serverCache.invalidateTags(["labour", "attendance", "dashboard"]);
  } else if (pathname.includes("/inventory") || pathname.includes("/price-catalog")) {
    serverCache.invalidateTags(["inventory", "catalog", "dashboard"]);
  } else if (pathname.includes("/invoices") || pathname.includes("/bills") || pathname.includes("/vouchers")) {
    serverCache.invalidateTags(["finance", "reports", "dashboard"]);
  } else if (pathname.includes("/settings") || pathname.includes("/users")) {
    serverCache.invalidateTags(["settings", "users"]);
  }
}
