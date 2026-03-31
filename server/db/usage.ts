/**
 * Usage Tracking Database Queries
 *
 * Tracks verification requests for analytics and billing.
 * Note: Only stores domain, not full email address (privacy).
 */

import { getDb, isDatabaseConfigured } from './index';
import type { VerificationResult, ErrorCode } from '#shared/types';

export interface UsageRecord {
  rapidapi_user?: string;
  email_domain: string;
  result: VerificationResult;
  processing_time_ms: number;
  error_code?: ErrorCode;
}

/**
 * Track a verification request.
 * Non-blocking - errors are logged but don't affect the response.
 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  // Skip if database not configured (dev mode without DB)
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    const sql = getDb();

    await sql`
      INSERT INTO usage (
        rapidapi_user,
        email_domain,
        result,
        processing_time_ms,
        error_code
      ) VALUES (
        ${record.rapidapi_user ?? null},
        ${record.email_domain},
        ${record.result},
        ${record.processing_time_ms},
        ${record.error_code ?? null}
      )
    `;
  } catch (error) {
    // Log but don't throw - tracking shouldn't break verification
    console.error('Failed to track usage:', error);
  }
}

/**
 * Track multiple verification requests (for bulk endpoint).
 * Non-blocking - errors are logged but don't affect the response.
 */
export async function trackBulkUsage(records: UsageRecord[]): Promise<void> {
  if (!isDatabaseConfigured() || records.length === 0) {
    return;
  }

  try {
    const sql = getDb();

    // Batch insert all records
    await sql`
      INSERT INTO usage ${sql(
        records.map((r) => ({
          rapidapi_user: r.rapidapi_user ?? null,
          email_domain: r.email_domain,
          result: r.result,
          processing_time_ms: r.processing_time_ms,
          error_code: r.error_code ?? null,
        }))
      )}
    `;
  } catch (error) {
    console.error('Failed to track bulk usage:', error);
  }
}
