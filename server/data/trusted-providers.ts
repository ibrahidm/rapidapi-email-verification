/**
 * Trusted email providers
 *
 * These providers have strict signup processes that prevent creating
 * arbitrary mailboxes. If syntax is valid and MX exists, the email
 * is highly likely to be deliverable.
 *
 * Note: These providers block SMTP verification, so we trust syntax + MX.
 */

export const TRUSTED_PROVIDERS: Set<string> = new Set([
  // Google
  'gmail.com',
  'googlemail.com',

  // Microsoft
  'outlook.com',
  'outlook.co.uk',
  'outlook.fr',
  'outlook.de',
  'outlook.es',
  'outlook.it',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.es',
  'hotmail.it',
  'live.com',
  'live.co.uk',
  'live.fr',
  'live.de',
  'msn.com',

  // Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.co.in',
  'yahoo.co.jp',
  'aol.com',
  'aol.co.uk',

  // Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // ProtonMail (strict signup with verification)
  'protonmail.com',
  'protonmail.ch',
  'proton.me',
]);

/**
 * Check if a domain is a trusted provider
 */
export function isTrustedProvider(domain: string): boolean {
  return TRUSTED_PROVIDERS.has(domain.toLowerCase());
}
