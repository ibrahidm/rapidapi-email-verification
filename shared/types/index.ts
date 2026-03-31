/**
 * Email Verification API - Shared Types
 */

// Verification result types
export type VerificationResult =
  | 'deliverable'    // Mailbox exists, accepts mail
  | 'undeliverable'  // Mailbox doesn't exist
  | 'risky'          // Catch-all domain, can't confirm
  | 'unknown';       // Timeout or error, inconclusive

// Error codes
export type ErrorCode =
  | 'INVALID_SYNTAX'
  | 'INVALID_DOMAIN'
  | 'NO_MX_RECORDS'
  | 'SMTP_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT';

// Individual check results
export interface VerificationChecks {
  syntax: boolean;
  mx_records: boolean;
  smtp_valid: boolean;
  catch_all: boolean;
  disposable: boolean;
  role_based: boolean;
  free_provider: boolean;
}

// Provider info
export interface ProviderInfo {
  domain: string;
  type: 'business' | 'free' | 'disposable' | 'unknown';
}

// Full verification data
export interface VerificationData {
  email: string;
  valid: boolean;
  result: VerificationResult;
  checks: VerificationChecks;
  provider: ProviderInfo;
  confidence: number;
}

// API success response
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    processing_time_ms: number;
  };
}

// API error response
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

// Union type for API responses
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Bulk verification request
export interface BulkVerifyRequest {
  emails: string[];
}

// Bulk verification summary
export interface BulkVerifySummary {
  total: number;
  deliverable: number;
  undeliverable: number;
  risky: number;
  unknown: number;
}

// Bulk verification response data
export interface BulkVerifyData {
  results: VerificationData[];
  summary: BulkVerifySummary;
}

// MX Record
export interface MxRecord {
  exchange: string;
  priority: number;
}

// MX lookup result
export interface MxResult {
  valid: boolean;
  records: MxRecord[];
}

// SMTP verification result
export interface SmtpResult {
  valid: boolean;
  deliverable: boolean;
  catchAll: boolean;
  error?: string;
}

// Syntax check result
export interface SyntaxResult {
  valid: boolean;
  localPart?: string;
  domain?: string;
  error?: string;
}

/**
 * Verification error with typed error codes.
 * Thrown by verifier modules to propagate specific error types.
 */
export class VerificationError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}
