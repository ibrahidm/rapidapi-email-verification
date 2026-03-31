/**
 * Email syntax validation
 * RFC 5322 compliant with additional sanity checks
 */

import type { SyntaxResult } from '#shared/types';

/**
 * RFC 5322 compliant email regex
 * Allows: letters, numbers, and special chars !#$%&'*+/=?^_`{|}~- in local part
 * Domain: alphanumeric with hyphens, dot-separated labels
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Minimum TLD length (e.g., .co, .io)
 */
const MIN_TLD_LENGTH = 2;

/**
 * Maximum email length per RFC 5321
 */
const MAX_EMAIL_LENGTH = 254;

/**
 * Maximum local part length per RFC 5321
 */
const MAX_LOCAL_PART_LENGTH = 64;

/**
 * Validate email syntax
 *
 * Checks:
 * 1. Basic regex match (RFC 5322)
 * 2. Length constraints
 * 3. No consecutive dots
 * 4. No leading/trailing dots in local part
 * 5. Valid TLD (2+ chars, alphabetic)
 * 6. Domain has at least one dot
 */
export function validateSyntax(email: string): SyntaxResult {
  // Trim and lowercase
  const normalizedEmail = email.trim().toLowerCase();

  // Check overall length
  if (normalizedEmail.length === 0) {
    return { valid: false, error: 'Email address is empty' };
  }

  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Email address exceeds maximum length' };
  }

  // Split into local and domain parts
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1) {
    return { valid: false, error: 'Email address must contain @' };
  }

  const localPart = normalizedEmail.substring(0, atIndex);
  const domain = normalizedEmail.substring(atIndex + 1);

  // Validate local part length
  if (localPart.length === 0) {
    return { valid: false, error: 'Local part cannot be empty' };
  }

  if (localPart.length > MAX_LOCAL_PART_LENGTH) {
    return { valid: false, error: 'Local part exceeds maximum length' };
  }

  // Validate domain is present
  if (domain.length === 0) {
    return { valid: false, error: 'Domain cannot be empty' };
  }

  // Check for consecutive dots in local part
  if (localPart.includes('..')) {
    return { valid: false, error: 'Local part cannot contain consecutive dots' };
  }

  // Check for leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, error: 'Local part cannot start or end with a dot' };
  }

  // Check for consecutive dots in domain
  if (domain.includes('..')) {
    return { valid: false, error: 'Domain cannot contain consecutive dots' };
  }

  // Domain must have at least one dot (TLD required)
  if (!domain.includes('.')) {
    return { valid: false, error: 'Domain must include a TLD' };
  }

  // Validate TLD
  const tld = domain.substring(domain.lastIndexOf('.') + 1);
  if (tld.length < MIN_TLD_LENGTH) {
    return { valid: false, error: 'TLD must be at least 2 characters' };
  }

  // TLD should be alphabetic only
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { valid: false, error: 'TLD must contain only letters' };
  }

  // Final regex check for overall format
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { valid: false, error: 'Email address format is invalid' };
  }

  return {
    valid: true,
    localPart,
    domain,
  };
}
