/**
 * MX Record lookup
 * Uses Node.js dns/promises for DNS resolution
 */

import { resolveMx } from 'node:dns/promises';
import type { MxResult, MxRecord } from '#shared/types';
import { LRUCache } from '../../utils/lru-cache';

/**
 * LRU cache for MX records
 * Max 1000 domains, 1 hour TTL
 */
const mxCache = new LRUCache<MxResult>(1000, 60 * 60 * 1000);

/**
 * Lookup MX records for a domain
 *
 * Returns records sorted by priority (lowest first = preferred)
 * Uses caching to avoid repeated DNS lookups
 */
export async function lookupMx(domain: string): Promise<MxResult> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = mxCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  try {
    const records = await resolveMx(normalizedDomain);

    // Sort by priority (lowest = preferred)
    const sortedRecords: MxRecord[] = records
      .map((r) => ({
        exchange: r.exchange.toLowerCase(),
        priority: r.priority,
      }))
      .sort((a, b) => a.priority - b.priority);

    const result: MxResult = {
      valid: sortedRecords.length > 0,
      records: sortedRecords,
    };

    mxCache.set(normalizedDomain, result);
    return result;
  } catch (error) {
    // DNS errors: ENOTFOUND, ENODATA, SERVFAIL, etc.
    const result: MxResult = {
      valid: false,
      records: [],
    };

    // Cache negative results too (but they'll expire same as positive)
    mxCache.set(normalizedDomain, result);
    return result;
  }
}

/**
 * Clear the MX cache (useful for testing)
 */
export function clearMxCache(): void {
  mxCache.clear();
}

/**
 * Get cache size (useful for monitoring)
 */
export function getMxCacheSize(): number {
  return mxCache.size;
}

/**
 * Prune expired cache entries (useful for monitoring)
 */
export function pruneMxCache(): number {
  return mxCache.prune();
}
