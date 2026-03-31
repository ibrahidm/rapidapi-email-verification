/**
 * Health Check Endpoint
 * GET /api/v1/health
 *
 * Performs actual health checks:
 * - DNS resolution capability
 * - Database connectivity (if configured)
 */

import { defineEventHandler } from 'h3';
import { resolveMx } from 'node:dns/promises';
import { isDatabaseConfigured, getDb } from '../../db';
import { getMxCacheSize } from '../../services/verifier/mx';
import { getCatchAllCacheSize } from '../../services/verifier/smtp';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    dns: boolean;
    database: boolean | null; // null if not configured
  };
  cache: {
    mx_entries: number;
    catchall_entries: number;
  };
}

/**
 * Test DNS resolution capability
 */
async function checkDns(): Promise<boolean> {
  try {
    // Test with a known domain
    await resolveMx('google.com');
    return true;
  } catch {
    return false;
  }
}

/**
 * Test database connectivity
 */
async function checkDatabase(): Promise<boolean | null> {
  if (!isDatabaseConfigured()) {
    return null; // Not configured
  }

  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default defineEventHandler(async (): Promise<HealthStatus> => {
  const [dnsOk, dbOk] = await Promise.all([checkDns(), checkDatabase()]);

  // Determine overall status
  let status: HealthStatus['status'] = 'ok';
  if (!dnsOk) {
    status = 'unhealthy'; // DNS is critical
  } else if (dbOk === false) {
    status = 'degraded'; // DB failure is degraded (tracking fails but verification works)
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      dns: dnsOk,
      database: dbOk,
    },
    cache: {
      mx_entries: getMxCacheSize(),
      catchall_entries: getCatchAllCacheSize(),
    },
  };
});
