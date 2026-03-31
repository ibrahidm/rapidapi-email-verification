/**
 * Known role-based email prefixes
 * These are typically not personal mailboxes
 */

export const ROLE_PREFIXES: Set<string> = new Set([
  // Administrative
  'admin',
  'administrator',
  'postmaster',
  'webmaster',
  'hostmaster',
  'root',
  'sysadmin',

  // Contact/Support
  'info',
  'information',
  'contact',
  'contactus',
  'hello',
  'hi',
  'help',
  'helpdesk',
  'support',
  'service',
  'customerservice',
  'customercare',
  'feedback',
  'enquiry',
  'enquiries',
  'inquiry',
  'inquiries',

  // Sales/Business
  'sales',
  'marketing',
  'advertising',
  'ads',
  'press',
  'media',
  'pr',
  'partnerships',
  'partner',
  'partners',
  'business',
  'biz',
  'careers',
  'jobs',
  'recruitment',
  'hr',
  'hiring',
  'talent',

  // Billing/Finance
  'billing',
  'accounts',
  'accounting',
  'finance',
  'payments',
  'invoices',
  'invoice',
  'orders',

  // Technical
  'abuse',
  'security',
  'privacy',
  'legal',
  'compliance',
  'dmca',
  'copyright',
  'spam',
  'noc',
  'ops',
  'operations',
  'devops',
  'tech',
  'technical',
  'engineering',
  'dev',
  'developers',
  'api',

  // No-reply
  'noreply',
  'no-reply',
  'no_reply',
  'donotreply',
  'do-not-reply',
  'do_not_reply',
  'mailer',
  'mailer-daemon',
  'bounce',
  'bounces',
  'notifications',
  'notification',
  'alerts',
  'alert',
  'news',
  'newsletter',
  'updates',

  // Team/Group
  'team',
  'staff',
  'office',
  'reception',
  'all',
  'everyone',
  'group',
  'members',

  // Other common
  'subscribe',
  'unsubscribe',
  'register',
  'registration',
  'signup',
  'signin',
  'login',
  'www',
  'ftp',
  'mail',
  'email',
  'test',
  'testing',
  'demo',
]);

/**
 * Check if an email local part is role-based
 */
export function isRoleBasedEmail(localPart: string): boolean {
  const normalized = localPart.toLowerCase();

  // Exact match
  if (ROLE_PREFIXES.has(normalized)) {
    return true;
  }

  // Check if starts with a role prefix followed by common separators
  for (const prefix of ROLE_PREFIXES) {
    if (
      normalized.startsWith(`${prefix}.`) ||
      normalized.startsWith(`${prefix}-`) ||
      normalized.startsWith(`${prefix}_`)
    ) {
      return true;
    }
  }

  return false;
}
