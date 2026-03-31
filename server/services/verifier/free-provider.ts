/**
 * Free email provider detection
 * Identifies emails from Gmail, Yahoo, Outlook, etc.
 */

import { isFreeProvider } from '../../data/free-providers';

export { isFreeProvider };

/**
 * Check if email is from a free provider
 */
export function checkFreeProvider(email: string): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  const domain = email.substring(atIndex + 1).toLowerCase();
  return isFreeProvider(domain);
}
