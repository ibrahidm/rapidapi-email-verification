/**
 * Bulk Email Verification Endpoint
 * POST /api/v1/verify/bulk
 *
 * Max 100 emails per request
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3';
import type {
  ApiResponse,
  BulkVerifyData,
  BulkVerifySummary,
  ErrorCode,
} from '#shared/types';
import { VerificationError } from '#shared/types';
import { verifyEmails } from '../../../services/verifier';
import { validateEmailArray, sanitizeEmail } from '../../../utils/validation';
import { trackBulkUsage } from '../../../db/usage';

interface BulkVerifyRequest {
  emails: string[];
}

/**
 * Concurrency limit for parallel verification
 */
const CONCURRENCY_LIMIT = 10;

/**
 * Get error code from unknown error
 */
function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof VerificationError) {
    return error.code;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout')) {
      return 'TIMEOUT';
    }
  }
  return 'SMTP_ERROR';
}

/**
 * Deduplicate emails while preserving order
 */
function deduplicateEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((email) => {
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export default defineEventHandler(
  async (event): Promise<ApiResponse<BulkVerifyData>> => {
    const startTime = Date.now();

    // Parse request body
    let body: BulkVerifyRequest;
    try {
      body = await readBody<BulkVerifyRequest>(event);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid JSON body',
      });
    }

    // Validate emails array
    if (!body || !body.emails) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'emails array is required',
        },
      };
    }

    const validation = validateEmailArray(body.emails);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: validation.error,
        },
      };
    }

    // Sanitize and deduplicate emails
    const sanitized = validation.emails.map(sanitizeEmail);
    const emails = deduplicateEmails(sanitized);

    // Get RapidAPI user for tracking
    const rapidapiUser = getHeader(event, 'x-rapidapi-user');

    // Verify all emails with concurrency control
    try {
      const results = await verifyEmails(emails, { concurrency: CONCURRENCY_LIMIT });

      // Calculate summary
      const summary: BulkVerifySummary = {
        total: results.length,
        deliverable: 0,
        undeliverable: 0,
        risky: 0,
        unknown: 0,
      };

      for (const result of results) {
        switch (result.result) {
          case 'deliverable':
            summary.deliverable++;
            break;
          case 'undeliverable':
            summary.undeliverable++;
            break;
          case 'risky':
            summary.risky++;
            break;
          case 'unknown':
            summary.unknown++;
            break;
        }
      }

      const processingTime = Date.now() - startTime;

      // Track usage for all results (non-blocking)
      const avgProcessingTime = Math.round(processingTime / results.length);
      trackBulkUsage(
        results.map((result) => ({
          rapidapi_user: rapidapiUser,
          email_domain: result.provider.domain,
          result: result.result,
          processing_time_ms: avgProcessingTime,
        }))
      );

      return {
        success: true,
        data: {
          results,
          summary,
        },
        meta: {
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      // Log error type only, never log full error object
      const errorCode = getErrorCode(error);
      console.error(`Bulk verification failed: ${errorCode}`);

      return {
        success: false,
        error: {
          code: errorCode,
          message: 'Verification failed',
        },
      };
    }
  }
);
