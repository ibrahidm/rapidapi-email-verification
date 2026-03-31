/**
 * MX-based Provider Detection
 *
 * Detects email infrastructure from MX records.
 * Domains using Google Workspace, Microsoft 365, etc. can be identified
 * by their MX hostnames, even with custom domains.
 */

import type { MxRecord } from '#shared/types';

export type InfrastructureProvider =
  | 'google'
  | 'microsoft'
  | 'yahoo'
  | 'proofpoint'
  | 'mimecast'
  | 'barracuda'
  | 'zoho'
  | 'fastmail'
  | 'icloud'
  | 'unknown';

interface ProviderPattern {
  provider: InfrastructureProvider;
  patterns: string[];
}

/**
 * Known MX patterns for major email providers
 */
const PROVIDER_PATTERNS: ProviderPattern[] = [
  {
    provider: 'google',
    patterns: [
      'google.com',
      'googlemail.com',
      'aspmx.l.google.com',
      'smtp.google.com',
    ],
  },
  {
    provider: 'microsoft',
    patterns: [
      'protection.outlook.com',
      'mail.protection.outlook.com',
      'outlook.com',
      'hotmail.com',
      'olc.protection.outlook.com',
      'pamx1.hotmail.com',
    ],
  },
  {
    provider: 'yahoo',
    patterns: [
      'yahoodns.net',
      'yahoo.com',
      'yahoomail.com',
    ],
  },
  {
    provider: 'icloud',
    patterns: [
      'icloud.com',
      'me.com',
      'apple.com',
    ],
  },
  {
    provider: 'zoho',
    patterns: [
      'zoho.com',
      'zohomail.com',
    ],
  },
  {
    provider: 'fastmail',
    patterns: [
      'fastmail.com',
      'messagingengine.com',
    ],
  },
  {
    provider: 'proofpoint',
    patterns: [
      'pphosted.com',
      'proofpoint.com',
    ],
  },
  {
    provider: 'mimecast',
    patterns: [
      'mimecast.com',
    ],
  },
  {
    provider: 'barracuda',
    patterns: [
      'barracudanetworks.com',
      'cuda-inc.com',
    ],
  },
];

/**
 * Providers that have strict signup and block SMTP verification.
 * We can trust syntax + MX for these.
 */
const TRUSTED_INFRASTRUCTURE: Set<InfrastructureProvider> = new Set([
  'google',
  'microsoft',
  'yahoo',
  'icloud',
  'zoho',
  'fastmail',
]);

/**
 * Check if hostname matches a pattern
 * Uses endsWith for domain matching to avoid false positives
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  // Exact match
  if (hostname === pattern) {
    return true;
  }
  // Subdomain match (hostname ends with .pattern)
  if (hostname.endsWith(`.${pattern}`)) {
    return true;
  }
  return false;
}

/**
 * Detect infrastructure provider from MX records
 */
export function detectMxProvider(mxRecords: MxRecord[]): InfrastructureProvider {
  for (const mx of mxRecords) {
    const hostname = mx.exchange.toLowerCase();

    for (const { provider, patterns } of PROVIDER_PATTERNS) {
      for (const pattern of patterns) {
        if (matchesPattern(hostname, pattern)) {
          return provider;
        }
      }
    }
  }

  return 'unknown';
}

/**
 * Check if the MX infrastructure is trusted (strict signup, blocks SMTP)
 */
export function isTrustedInfrastructure(mxRecords: MxRecord[]): boolean {
  const provider = detectMxProvider(mxRecords);
  return TRUSTED_INFRASTRUCTURE.has(provider);
}
