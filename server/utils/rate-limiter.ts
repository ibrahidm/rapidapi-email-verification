/**
 * Rate Limiter
 *
 * Sliding window rate limiter for API protection.
 * Uses in-memory storage - suitable for single-instance or
 * as burst protection layer (RapidAPI handles subscription limits).
 *
 * For distributed rate limiting, upgrade to Redis/Vercel KV.
 */

interface RateLimitEntry {
  /** Timestamps of requests within the window */
  timestamps: number[];
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
  /** Seconds until the window resets */
  resetIn: number;
}

export interface RateLimiterConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Maximum entries to track (prevents memory bloat) */
  maxEntries?: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(config: RateLimiterConfig) {
    this.limit = config.limit;
    this.windowMs = config.windowSeconds * 1000;
    this.maxEntries = config.maxEntries ?? 10000;
  }

  /**
   * Check if a request is allowed and record it
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create entry
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.entries.set(key, entry);

      // Evict oldest entries if at capacity
      if (this.entries.size > this.maxEntries) {
        this.evictOldest();
      }
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Calculate remaining
    const currentCount = entry.timestamps.length;
    const remaining = Math.max(0, this.limit - currentCount);
    const allowed = currentCount < this.limit;

    // Record this request if allowed
    if (allowed) {
      entry.timestamps.push(now);
    }

    // Calculate reset time (when oldest request in window expires)
    let resetIn = Math.ceil(this.windowMs / 1000);
    if (entry.timestamps.length > 0) {
      const oldestInWindow = entry.timestamps[0];
      if (oldestInWindow !== undefined) {
        resetIn = Math.ceil((oldestInWindow + this.windowMs - now) / 1000);
      }
    }

    return {
      allowed,
      remaining: allowed ? remaining - 1 : remaining,
      limit: this.limit,
      resetIn: Math.max(1, resetIn),
    };
  }

  /**
   * Check without recording (peek at current state)
   */
  peek(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entry = this.entries.get(key);
    if (!entry) {
      return {
        allowed: true,
        remaining: this.limit,
        limit: this.limit,
        resetIn: Math.ceil(this.windowMs / 1000),
      };
    }

    // Count valid timestamps
    const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
    const currentCount = validTimestamps.length;
    const remaining = Math.max(0, this.limit - currentCount);

    let resetIn = Math.ceil(this.windowMs / 1000);
    if (validTimestamps.length > 0) {
      const oldest = validTimestamps[0];
      if (oldest !== undefined) {
        resetIn = Math.ceil((oldest + this.windowMs - now) / 1000);
      }
    }

    return {
      allowed: currentCount < this.limit,
      remaining,
      limit: this.limit,
      resetIn: Math.max(1, resetIn),
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get current number of tracked keys
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Evict oldest entries when at capacity
   */
  private evictOldest(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // First, remove completely expired entries
    for (const [key, entry] of this.entries) {
      const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (validTimestamps.length === 0) {
        this.entries.delete(key);
      } else {
        entry.timestamps = validTimestamps;
      }
    }

    // If still at capacity, remove oldest by last request time
    if (this.entries.size > this.maxEntries) {
      const entries = Array.from(this.entries.entries());
      entries.sort((a, b) => {
        const aLast = a[1].timestamps[a[1].timestamps.length - 1] ?? 0;
        const bLast = b[1].timestamps[b[1].timestamps.length - 1] ?? 0;
        return aLast - bLast;
      });

      // Remove oldest 10%
      const toRemove = Math.ceil(this.maxEntries * 0.1);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        const entry = entries[i];
        if (entry) {
          this.entries.delete(entry[0]);
        }
      }
    }
  }
}

/**
 * Default rate limiters for different endpoints
 */

// Single email verification: 100 requests per minute
export const verifyRateLimiter = new RateLimiter({
  limit: 100,
  windowSeconds: 60,
});

// Bulk verification: 10 requests per minute (each can have up to 100 emails)
export const bulkRateLimiter = new RateLimiter({
  limit: 10,
  windowSeconds: 60,
});

// Health check: 60 requests per minute
export const healthRateLimiter = new RateLimiter({
  limit: 60,
  windowSeconds: 60,
});
