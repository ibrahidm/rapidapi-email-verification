/**
 * Rate Limiting Middleware
 *
 * Applies rate limits based on:
 * 1. RapidAPI user (if authenticated)
 * 2. IP address (fallback)
 *
 * This provides burst protection. RapidAPI handles subscription-level limits.
 *
 * Set RATE_LIMIT_DISABLED=true to disable (for testing).
 */

import { defineEventHandler, getHeader, setHeader, createError } from 'h3';
import {
  verifyRateLimiter,
  bulkRateLimiter,
  healthRateLimiter,
} from '../utils/rate-limiter';

/**
 * Check if rate limiting is disabled
 */
const isRateLimitDisabled = process.env.RATE_LIMIT_DISABLED === 'true';

/**
 * Get client identifier for rate limiting
 * Priority: RapidAPI user > X-Forwarded-For > Remote IP
 */
function getClientId(event: { context: Record<string, unknown>; node: { req: { socket: { remoteAddress?: string } } } }, headers: { forwarded?: string; realIp?: string }): string {
  // Use RapidAPI user if available (set by rapidapi middleware)
  const rapidApiUser = event.context.rapidApiUser;
  if (typeof rapidApiUser === 'string' && rapidApiUser) {
    return `user:${rapidApiUser}`;
  }

  // Use X-Forwarded-For (first IP in chain)
  if (headers.forwarded) {
    const firstIp = headers.forwarded.split(',')[0]?.trim();
    if (firstIp) {
      return `ip:${firstIp}`;
    }
  }

  // Use X-Real-IP
  if (headers.realIp) {
    return `ip:${headers.realIp}`;
  }

  // Fallback to remote address
  const remoteAddress = event.node.req.socket.remoteAddress;
  return `ip:${remoteAddress ?? 'unknown'}`;
}

export default defineEventHandler((event) => {
  // Skip if rate limiting is disabled
  if (isRateLimitDisabled) {
    return;
  }

  // Only apply to API routes
  if (!event.path?.startsWith('/api/')) {
    return;
  }

  // Get headers for IP detection
  const forwardedFor = getHeader(event, 'x-forwarded-for');
  const realIp = getHeader(event, 'x-real-ip');

  const clientId = getClientId(event as Parameters<typeof getClientId>[0], {
    forwarded: forwardedFor,
    realIp: realIp,
  });

  // Select rate limiter based on endpoint
  let result;
  if (event.path === '/api/v1/verify/bulk') {
    result = bulkRateLimiter.check(clientId);
  } else if (event.path === '/api/v1/health') {
    result = healthRateLimiter.check(clientId);
  } else if (event.path?.startsWith('/api/v1/verify')) {
    result = verifyRateLimiter.check(clientId);
  } else {
    // Default rate limit for unknown API endpoints
    result = verifyRateLimiter.check(clientId);
  }

  // Set rate limit headers
  setHeader(event, 'X-RateLimit-Limit', result.limit.toString());
  setHeader(event, 'X-RateLimit-Remaining', result.remaining.toString());
  setHeader(event, 'X-RateLimit-Reset', result.resetIn.toString());

  // If rate limited, return 429
  if (!result.allowed) {
    setHeader(event, 'Retry-After', result.resetIn);
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
    });
  }
});
