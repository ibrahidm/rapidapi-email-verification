/**
 * Email Verification Orchestrator
 *
 * Pipeline order (fail fast on cheap checks):
 * 1. Syntax check      → Regex, instant, free
 * 2. Disposable check  → Set lookup, instant, free
 * 3. MX record lookup  → DNS query, ~100ms
 * 4. SMTP verification → TCP connection, ~500-2000ms
 */

import type {
  VerificationData,
  VerificationResult,
  VerificationChecks,
  ProviderInfo,
} from '#shared/types';
import { VerificationError } from '#shared/types';
import { validateSyntax } from './syntax';
import { lookupMx } from './mx';
import { verifySmtp } from './smtp';
import { checkDisposable } from './disposable';
import { checkRoleBased } from './role-based';
import { checkFreeProvider } from './free-provider';
import { isTrustedProvider } from '../../data/trusted-providers';
import { isTrustedInfrastructure, detectMxProvider } from './mx-provider';

/**
 * Configuration for email verification
 */
export interface VerifyOptions {
  /** SMTP timeout in milliseconds (default: 10000) */
  smtpTimeout?: number;
  /** Domain to use in MAIL FROM (from SMTP_FROM_DOMAIN env var) */
  fromDomain?: string;
  /** Whether to check for catch-all domains (default: true) */
  checkCatchAll?: boolean;
  /** Skip SMTP verification (faster but less accurate) */
  skipSmtp?: boolean;
  /** Concurrency limit for bulk verification */
  concurrency?: number;
}

/**
 * Calculate confidence score based on verification results
 */
function calculateConfidence(
  result: VerificationResult,
  checks: VerificationChecks
): number {
  // Base confidence
  let confidence = 0;

  if (result === 'deliverable') {
    confidence = 0.95;

    // Reduce confidence for catch-all
    if (checks.catch_all) {
      confidence = 0.6;
    }

    // Reduce confidence for disposable (but still deliverable)
    if (checks.disposable) {
      confidence = 0.7;
    }
  } else if (result === 'undeliverable') {
    // High confidence that email is bad
    confidence = 0.95;
  } else if (result === 'risky') {
    // Catch-all domains
    confidence = 0.5;
  } else {
    // Unknown - timeout or error
    confidence = 0.3;
  }

  return confidence;
}

/**
 * Determine provider type
 */
function getProviderType(
  domain: string,
  isDisposable: boolean,
  isFree: boolean
): ProviderInfo['type'] {
  if (isDisposable) {
    return 'disposable';
  }
  if (isFree) {
    return 'free';
  }
  // Could add more logic here to detect business domains
  return 'business';
}

/**
 * Verify a single email address
 *
 * Returns comprehensive verification data including all checks performed
 */
export async function verifyEmail(
  email: string,
  options: VerifyOptions = {}
): Promise<VerificationData> {
  const startTime = Date.now();
  const normalizedEmail = email.trim().toLowerCase();

  // Initialize checks
  const checks: VerificationChecks = {
    syntax: false,
    mx_records: false,
    smtp_valid: false,
    catch_all: false,
    disposable: false,
    role_based: false,
    free_provider: false,
    plus_addressed: false,
  };

  // Default provider info
  let providerInfo: ProviderInfo = {
    domain: '',
    type: 'unknown',
  };

  // 1. Syntax validation (instant, free)
  const syntaxResult = validateSyntax(normalizedEmail);

  if (!syntaxResult.valid) {
    return {
      email: normalizedEmail,
      valid: false,
      result: 'undeliverable',
      checks,
      provider: providerInfo,
      confidence: 0.99, // Very confident about syntax errors
    };
  }

  checks.syntax = true;
  const { localPart, domain, normalizedLocalPart, plusAddressed } = syntaxResult as {
    localPart: string;
    domain: string;
    normalizedLocalPart: string;
    plusAddressed: boolean;
  };
  providerInfo.domain = domain;
  checks.plus_addressed = plusAddressed;

  // Build normalized email (without plus tag) if plus addressing was used
  const normalizedBaseEmail = plusAddressed
    ? `${normalizedLocalPart}@${domain}`
    : undefined;

  // 2. Disposable check (instant, free)
  checks.disposable = checkDisposable(normalizedEmail);

  // 3. Role-based check (instant, free)
  checks.role_based = checkRoleBased(normalizedEmail);

  // 4. Free provider check (instant, free)
  checks.free_provider = checkFreeProvider(normalizedEmail);

  // Update provider type
  providerInfo.type = getProviderType(
    domain,
    checks.disposable,
    checks.free_provider
  );

  // 5. MX record lookup (~100ms)
  const mxResult = await lookupMx(domain);
  checks.mx_records = mxResult.valid;

  if (!mxResult.valid) {
    return {
      email: normalizedEmail,
      normalized_email: normalizedBaseEmail,
      valid: false,
      result: 'undeliverable',
      checks,
      provider: providerInfo,
      confidence: 0.95, // High confidence - no MX means no email
    };
  }

  // 6. Trusted provider shortcut
  // Major providers (Gmail, Microsoft, Yahoo, etc.) block SMTP verification
  // but have strict signup - if syntax + MX pass, trust it
  // Check both domain (gmail.com) and MX infrastructure (wayne.edu → Microsoft 365)
  const isTrusted = isTrustedProvider(domain) || isTrustedInfrastructure(mxResult.records);

  if (isTrusted) {
    checks.smtp_valid = true; // Assumed valid for trusted providers
    return {
      email: normalizedEmail,
      normalized_email: normalizedBaseEmail,
      valid: true,
      result: checks.disposable ? 'risky' : 'deliverable',
      checks,
      provider: providerInfo,
      confidence: 0.85, // High but not certain (account could be deleted)
    };
  }

  // 7. SMTP verification (~500-2000ms)
  if (options.skipSmtp) {
    // If skipping SMTP, return based on MX check only
    // MX exists, so return risky (not unknown) with moderate confidence
    const result: VerificationResult = checks.disposable ? 'risky' : 'risky';
    return {
      email: normalizedEmail,
      normalized_email: normalizedBaseEmail,
      valid: true,
      result,
      checks,
      provider: providerInfo,
      confidence: 0.5, // Moderate confidence - MX exists but no SMTP check
    };
  }

  const smtpTimeout =
    options.smtpTimeout ?? parseInt(process.env.SMTP_TIMEOUT_MS ?? '10000', 10);
  const fromDomain = options.fromDomain ?? process.env.SMTP_FROM_DOMAIN;

  // If no fromDomain configured, skip SMTP and return risky
  // This allows the API to function without SMTP verification
  if (!fromDomain) {
    console.warn('SMTP_FROM_DOMAIN not configured - skipping SMTP verification');
    return {
      email: normalizedEmail,
      normalized_email: normalizedBaseEmail,
      valid: true,
      result: checks.disposable ? 'risky' : 'risky',
      checks,
      provider: providerInfo,
      confidence: 0.5,
    };
  }

  const smtpResult = await verifySmtp(normalizedEmail, mxResult.records, {
    timeout: smtpTimeout,
    fromDomain,
    checkCatchAll: options.checkCatchAll ?? true,
  });

  checks.smtp_valid = smtpResult.valid && smtpResult.deliverable;
  checks.catch_all = smtpResult.catchAll;

  // Determine final result
  let result: VerificationResult;

  if (!smtpResult.valid) {
    // SMTP connection failed or timed out
    // But MX exists, so return risky instead of unknown
    result = 'risky';
  } else if (smtpResult.catchAll) {
    // Catch-all domain - can't confirm individual mailbox
    result = 'risky';
  } else if (smtpResult.deliverable) {
    result = 'deliverable';
  } else {
    result = 'undeliverable';
  }

  // If disposable but deliverable, mark as risky
  if (checks.disposable && result === 'deliverable') {
    result = 'risky';
  }

  const confidence = calculateConfidence(result, checks);

  return {
    email: normalizedEmail,
    normalized_email: normalizedBaseEmail,
    valid: result === 'deliverable' || result === 'risky',
    result,
    checks,
    provider: providerInfo,
    confidence,
  };
}

/**
 * Verify multiple emails with concurrency control
 */
export async function verifyEmails(
  emails: string[],
  options: VerifyOptions = {}
): Promise<VerificationData[]> {
  const concurrency = options.concurrency ?? 5;

  if (concurrency <= 1 || emails.length <= 1) {
    // Sequential processing
    const results: VerificationData[] = [];
    for (const email of emails) {
      const result = await verifyEmail(email, options);
      results.push(result);
    }
    return results;
  }

  // Parallel processing with concurrency limit
  const results: VerificationData[] = new Array(emails.length);
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < emails.length) {
      const index = currentIndex++;
      const email = emails[index];
      if (email !== undefined) {
        results[index] = await verifyEmail(email, options);
      }
    }
  }

  // Start concurrent workers
  const workers = Array.from({ length: Math.min(concurrency, emails.length) }, () =>
    processNext()
  );

  await Promise.all(workers);
  return results;
}

// Re-export individual modules for testing
export { validateSyntax } from './syntax';
export { lookupMx, clearMxCache, getMxCacheSize } from './mx';
export { verifySmtp, clearCatchAllCache, getCatchAllCacheSize } from './smtp';
export { checkDisposable } from './disposable';
export { checkRoleBased } from './role-based';
export { checkFreeProvider } from './free-provider';
export { detectMxProvider, isTrustedInfrastructure } from './mx-provider';
