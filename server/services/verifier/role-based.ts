/**
 * Role-based email detection
 * Identifies emails like admin@, support@, info@
 */

import { isRoleBasedEmail } from '../../data/role-prefixes';

export { isRoleBasedEmail };

/**
 * Check if email is role-based
 */
export function checkRoleBased(email: string): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  const localPart = email.substring(0, atIndex).toLowerCase();
  return isRoleBasedEmail(localPart);
}
