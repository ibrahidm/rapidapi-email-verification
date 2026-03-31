/**
 * Disposable email detection
 * Wrapper around static domain list
 */

import { isDisposableDomain } from '../../data/disposable-domains';

export { isDisposableDomain };

/**
 * Check if email is from a disposable provider
 */
export function checkDisposable(email: string): boolean {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  const domain = email.substring(atIndex + 1).toLowerCase();
  return isDisposableDomain(domain);
}
