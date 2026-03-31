/**
 * RapidAPI Middleware
 * Validates RapidAPI proxy headers for authentication
 */

import { defineEventHandler, getHeader, createError } from 'h3';
import { timingSafeEqual } from 'node:crypto';

/**
 * RapidAPI sends these headers with every request
 */
const RAPIDAPI_PROXY_SECRET_HEADER = 'x-rapidapi-proxy-secret';
const RAPIDAPI_USER_HEADER = 'x-rapidapi-user';

/**
 * Maximum allowed length for RapidAPI user header (prevent abuse)
 */
const MAX_USER_HEADER_LENGTH = 128;

/**
 * Track if we've logged the dev mode warning
 */
let devModeWarningLogged = false;

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const dummy = Buffer.from(a);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Middleware to validate RapidAPI requests
 *
 * Checks:
 * 1. X-RapidAPI-Proxy-Secret matches our configured secret
 * 2. X-RapidAPI-User is present (for usage tracking)
 *
 * If RAPIDAPI_PROXY_SECRET is not set, requests are allowed without auth.
 * This enables local development without configuring RapidAPI.
 */
export default defineEventHandler((event) => {
  // Skip middleware for health check
  if (event.path === '/api/v1/health') {
    return;
  }

  // Only apply to API routes
  if (!event.path?.startsWith('/api/')) {
    return;
  }

  const configuredSecret = process.env.RAPIDAPI_PROXY_SECRET;

  // If no secret configured, allow requests (dev mode)
  // Log warning once so operators know auth is disabled
  if (!configuredSecret) {
    if (!devModeWarningLogged) {
      console.warn(
        'RAPIDAPI_PROXY_SECRET not configured - RapidAPI authentication disabled'
      );
      devModeWarningLogged = true;
    }
    return;
  }

  // Validate proxy secret
  const proxySecret = getHeader(event, RAPIDAPI_PROXY_SECRET_HEADER);

  if (!proxySecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing RapidAPI proxy secret',
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!secureCompare(proxySecret, configuredSecret)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Invalid RapidAPI proxy secret',
    });
  }

  // Extract and validate user for tracking
  const rapidApiUser = getHeader(event, RAPIDAPI_USER_HEADER);
  if (rapidApiUser) {
    // Validate header length and characters
    if (
      rapidApiUser.length <= MAX_USER_HEADER_LENGTH &&
      /^[\w\-_.@]+$/.test(rapidApiUser)
    ) {
      event.context.rapidApiUser = rapidApiUser;
    }
    // Invalid headers are silently ignored (don't block request)
  }
});
