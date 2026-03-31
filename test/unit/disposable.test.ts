import { describe, it, expect } from 'vitest';
import { checkDisposable, isDisposableDomain } from '#server/services/verifier/disposable';

describe('checkDisposable', () => {
  describe('known disposable domains', () => {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.de',
      'guerrillamail.com',
      'mailinator.com',
      '0-mail.com',
      '10mail.org',
    ];

    disposableDomains.forEach((domain) => {
      it(`should detect ${domain} as disposable`, () => {
        expect(checkDisposable(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('legitimate domains', () => {
    const legitimateDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'company.com',
      'university.edu',
      'government.gov',
    ];

    legitimateDomains.forEach((domain) => {
      it(`should not flag ${domain} as disposable`, () => {
        expect(checkDisposable(`user@${domain}`)).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should return false for email without @', () => {
      expect(checkDisposable('invalidemail')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(checkDisposable('user@10MINUTEMAIL.COM')).toBe(true);
      expect(checkDisposable('user@GUERRILLAMAIL.COM')).toBe(true);
    });

    it('should use last @ for domain extraction', () => {
      // In case of multiple @ (invalid but should still work)
      expect(checkDisposable('user@fake@10minutemail.com')).toBe(true);
    });

    it('should handle empty domain after @', () => {
      expect(checkDisposable('user@')).toBe(false);
    });
  });
});

describe('isDisposableDomain', () => {
  it('should return true for known disposable domains', () => {
    expect(isDisposableDomain('10minutemail.com')).toBe(true);
    expect(isDisposableDomain('guerrillamail.com')).toBe(true);
  });

  it('should return false for legitimate domains', () => {
    expect(isDisposableDomain('gmail.com')).toBe(false);
    expect(isDisposableDomain('example.com')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isDisposableDomain('10MINUTEMAIL.COM')).toBe(true);
    expect(isDisposableDomain('GMAIL.COM')).toBe(false);
  });
});
