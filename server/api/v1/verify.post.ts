/**
 * Single Email Verification Endpoint
 * POST /api/v1/verify
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3';
import type { ApiResponse, VerificationData, ErrorCode } from '#shared/types';
import { VerificationError } from '#shared/types';
import { verifyEmail } from '../../services/verifier';
import { isNonEmptyString, sanitizeEmail } from '../../utils/validation';
import { trackUsage } from '../../db/usage';

interface VerifyRequest {
  email: string;
}

/**
 * Extract domain from email safely (for tracking only, not the full email)
 */
function extractDomain(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return 'invalid';
  return email.substring(atIndex + 1) || 'invalid';
}

/**
 * Get error code from unknown error
 */
function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof VerificationError) {
    return error.code;
  }
  // Check for timeout-related errors
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout')) {
      return 'TIMEOUT';
    }
  }
  return 'SMTP_ERROR';
}

export default defineEventHandler(
  async (event): Promise<ApiResponse<VerificationData>> => {
    const startTime = Date.now();

    // Parse request body
    let body: VerifyRequest;
    try {
      body = await readBody<VerifyRequest>(event);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Invalid JSON body',
      });
    }

    // Validate email input
    if (!body || !isNonEmptyString(body.email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'email is required and must be a non-empty string',
        },
      };
    }

    const email = sanitizeEmail(body.email);

    // Early validation: check if email is empty after sanitization
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: {
          code: 'INVALID_SYNTAX',
          message: 'Invalid email format',
        },
      };
    }

    // Get RapidAPI user for tracking
    const rapidapiUser = getHeader(event, 'x-rapidapi-user');

    // Verify the email
    try {
      const result = await verifyEmail(email);

      const processingTime = Date.now() - startTime;

      // Track usage (non-blocking)
      trackUsage({
        rapidapi_user: rapidapiUser,
        email_domain: result.provider.domain,
        result: result.result,
        processing_time_ms: processingTime,
      });

      return {
        success: true,
        data: result,
        meta: {
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      // Log error type only, never log email or full error object
      const errorCode = getErrorCode(error);
      console.error(`Verification failed: ${errorCode}`);

      const processingTime = Date.now() - startTime;
      const domain = extractDomain(email);

      // Track failed verification
      trackUsage({
        rapidapi_user: rapidapiUser,
        email_domain: domain,
        result: 'unknown',
        processing_time_ms: processingTime,
        error_code: errorCode,
      });

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
