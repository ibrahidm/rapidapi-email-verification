import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '#server/utils/rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic rate limiting', () => {
    it('should allow requests under the limit', () => {
      const limiter = new RateLimiter({ limit: 5, windowSeconds: 60 });

      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests over the limit', () => {
      const limiter = new RateLimiter({ limit: 3, windowSeconds: 60 });

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        limiter.check('user1');
      }

      // Next request should be blocked
      const result = limiter.check('user1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different keys separately', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      // Use up user1's limit
      limiter.check('user1');
      limiter.check('user1');

      // user2 should still have requests available
      const result = limiter.check('user2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('sliding window', () => {
    it('should reset after window expires', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      // Use up the limit
      limiter.check('user1');
      limiter.check('user1');
      expect(limiter.check('user1').allowed).toBe(false);

      // Advance past the window
      vi.advanceTimersByTime(61000);

      // Should allow requests again
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should use sliding window (partial expiry)', () => {
      const limiter = new RateLimiter({ limit: 3, windowSeconds: 60 });

      // Make 3 requests
      limiter.check('user1');
      vi.advanceTimersByTime(20000); // +20s
      limiter.check('user1');
      vi.advanceTimersByTime(20000); // +40s
      limiter.check('user1');

      // At this point, all 3 slots used
      expect(limiter.check('user1').allowed).toBe(false);

      // Advance 25s more (first request expires at 60s)
      vi.advanceTimersByTime(25000); // +65s total

      // First request expired, should allow one more
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('response values', () => {
    it('should return correct limit', () => {
      const limiter = new RateLimiter({ limit: 10, windowSeconds: 60 });
      const result = limiter.check('user1');
      expect(result.limit).toBe(10);
    });

    it('should return correct resetIn', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      limiter.check('user1');
      vi.advanceTimersByTime(30000); // +30s

      const result = limiter.check('user1');
      // First request was at t=0, expires at t=60, current is t=30
      // resetIn should be approximately 30 seconds
      expect(result.resetIn).toBeGreaterThanOrEqual(29);
      expect(result.resetIn).toBeLessThanOrEqual(31);
    });

    it('should return remaining 0 when at limit', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      limiter.check('user1');
      limiter.check('user1');

      const result = limiter.check('user1');
      expect(result.remaining).toBe(0);
    });
  });

  describe('peek', () => {
    it('should not count as a request', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      // Peek multiple times
      limiter.peek('user1');
      limiter.peek('user1');
      limiter.peek('user1');

      // All requests should still be available
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should return correct state', () => {
      const limiter = new RateLimiter({ limit: 3, windowSeconds: 60 });

      limiter.check('user1');
      limiter.check('user1');

      const peek = limiter.peek('user1');
      expect(peek.allowed).toBe(true);
      expect(peek.remaining).toBe(1);
      expect(peek.limit).toBe(3);
    });
  });

  describe('reset', () => {
    it('should clear rate limit for a key', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      limiter.check('user1');
      limiter.check('user1');
      expect(limiter.check('user1').allowed).toBe(false);

      limiter.reset('user1');

      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should not affect other keys', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      limiter.check('user1');
      limiter.check('user2');

      limiter.reset('user1');

      // user2 should still have one used
      const result = limiter.check('user2');
      expect(result.remaining).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });

      limiter.check('user1');
      limiter.check('user2');
      limiter.check('user3');

      expect(limiter.size).toBe(3);

      limiter.clear();

      expect(limiter.size).toBe(0);
    });
  });

  describe('memory management', () => {
    it('should respect maxEntries', () => {
      const limiter = new RateLimiter({
        limit: 10,
        windowSeconds: 60,
        maxEntries: 5,
      });

      // Add more entries than max
      for (let i = 0; i < 10; i++) {
        limiter.check(`user${i}`);
      }

      // Should have evicted some entries
      expect(limiter.size).toBeLessThanOrEqual(5);
    });

    it('should evict expired entries first', () => {
      const limiter = new RateLimiter({
        limit: 10,
        windowSeconds: 60,
        maxEntries: 3,
      });

      // Add 2 entries
      limiter.check('user1');
      limiter.check('user2');

      // Expire them
      vi.advanceTimersByTime(61000);

      // Add 3 more entries (should evict expired ones first)
      limiter.check('user3');
      limiter.check('user4');
      limiter.check('user5');

      // Expired entries should be gone
      expect(limiter.size).toBeLessThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty key', () => {
      const limiter = new RateLimiter({ limit: 2, windowSeconds: 60 });
      const result = limiter.check('');
      expect(result.allowed).toBe(true);
    });

    it('should handle very short window', () => {
      const limiter = new RateLimiter({ limit: 1, windowSeconds: 1 });

      limiter.check('user1');
      expect(limiter.check('user1').allowed).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(limiter.check('user1').allowed).toBe(true);
    });

    it('should handle high limit', () => {
      const limiter = new RateLimiter({ limit: 10000, windowSeconds: 60 });

      for (let i = 0; i < 100; i++) {
        expect(limiter.check('user1').allowed).toBe(true);
      }
    });
  });
});
