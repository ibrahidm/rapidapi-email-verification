/**
 * Input validation helpers
 */

/**
 * Validate that the input is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate email array for bulk requests
 */
export function validateEmailArray(
  emails: unknown
): { valid: true; emails: string[] } | { valid: false; error: string } {
  if (!Array.isArray(emails)) {
    return { valid: false, error: 'emails must be an array' };
  }

  if (emails.length === 0) {
    return { valid: false, error: 'emails array cannot be empty' };
  }

  if (emails.length > 100) {
    return { valid: false, error: 'emails array cannot exceed 100 items' };
  }

  const validEmails: string[] = [];
  for (let i = 0; i < emails.length; i++) {
    if (!isNonEmptyString(emails[i])) {
      return { valid: false, error: `emails[${i}] must be a non-empty string` };
    }
    validEmails.push(emails[i].trim());
  }

  return { valid: true, emails: validEmails };
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
