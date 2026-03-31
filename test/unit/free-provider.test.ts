import { describe, it, expect } from 'vitest';
import { checkFreeProvider, isFreeProvider } from '#server/services/verifier/free-provider';

describe('checkFreeProvider', () => {
  describe('major providers', () => {
    const majorProviders = [
      'gmail.com',
      'googlemail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'live.com',
      'msn.com',
      'aol.com',
    ];

    majorProviders.forEach((domain) => {
      it(`should detect ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('regional Yahoo variants', () => {
    const yahooVariants = [
      'yahoo.co.uk',
      'yahoo.fr',
      'yahoo.de',
      'yahoo.es',
      'yahoo.it',
      'yahoo.ca',
      'yahoo.com.au',
    ];

    yahooVariants.forEach((domain) => {
      it(`should detect ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('Apple domains', () => {
    const appleDomains = ['icloud.com', 'me.com', 'mac.com'];

    appleDomains.forEach((domain) => {
      it(`should detect ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('privacy-focused providers', () => {
    const privacyProviders = [
      'protonmail.com',
      'protonmail.ch',
      'proton.me',
      'tutanota.com',
      'tutanota.de',
    ];

    privacyProviders.forEach((domain) => {
      it(`should detect ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('other popular free providers', () => {
    const otherProviders = [
      'mail.com',
      'zoho.com',
      'yandex.com',
      'yandex.ru',
      'gmx.com',
      'gmx.net',
      'gmx.de',
      'mail.ru',
      'qq.com',
      '163.com',
    ];

    otherProviders.forEach((domain) => {
      it(`should detect ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(true);
      });
    });
  });

  describe('business/custom domains (not free)', () => {
    const businessDomains = [
      'company.com',
      'enterprise.io',
      'business.co',
      'startup.tech',
      'university.edu',
      'government.gov',
      'organization.org',
    ];

    businessDomains.forEach((domain) => {
      it(`should not flag ${domain} as free provider`, () => {
        expect(checkFreeProvider(`user@${domain}`)).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should return false for email without @', () => {
      expect(checkFreeProvider('invalidemail')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(checkFreeProvider('user@GMAIL.COM')).toBe(true);
      expect(checkFreeProvider('user@Gmail.Com')).toBe(true);
      expect(checkFreeProvider('user@YAHOO.CO.UK')).toBe(true);
    });

    it('should use last @ for domain extraction', () => {
      expect(checkFreeProvider('user@fake@gmail.com')).toBe(true);
    });

    it('should handle empty domain after @', () => {
      expect(checkFreeProvider('user@')).toBe(false);
    });

    it('should not match subdomains of free providers', () => {
      // mail.gmail.com is not in the list
      expect(checkFreeProvider('user@mail.gmail.com')).toBe(false);
    });
  });
});

describe('isFreeProvider', () => {
  it('should return true for known free providers', () => {
    expect(isFreeProvider('gmail.com')).toBe(true);
    expect(isFreeProvider('yahoo.com')).toBe(true);
    expect(isFreeProvider('outlook.com')).toBe(true);
  });

  it('should return false for business domains', () => {
    expect(isFreeProvider('company.com')).toBe(false);
    expect(isFreeProvider('example.com')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isFreeProvider('GMAIL.COM')).toBe(true);
    expect(isFreeProvider('Yahoo.Com')).toBe(true);
  });
});
