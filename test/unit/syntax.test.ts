import { describe, it, expect } from 'vitest';
import { validateSyntax } from '#server/services/verifier/syntax';

describe('validateSyntax', () => {
  describe('valid emails', () => {
    const validEmails = [
      'simple@example.com',
      'very.common@example.com',
      'user.name+tag@example.com',
      'user-name@example.com',
      'user_name@example.com',
      'user123@example.com',
      'user@subdomain.example.com',
      'user@example.co.uk',
      '1234567890@example.com',
      'user@123.123.123.com',
      "user!#$%&'*+/=?^`{|}~@example.com",
    ];

    validEmails.forEach((email) => {
      it(`should accept: ${email}`, () => {
        const result = validateSyntax(email);
        expect(result.valid).toBe(true);
        expect(result.localPart).toBeDefined();
        expect(result.domain).toBeDefined();
      });
    });
  });

  describe('invalid emails', () => {
    const invalidEmails = [
      { email: '', error: 'empty' },
      { email: 'plainaddress', error: 'no @' },
      { email: '@example.com', error: 'no local part' },
      { email: 'user@', error: 'no domain' },
      { email: 'user@.com', error: 'domain starts with dot' },
      { email: 'user..name@example.com', error: 'consecutive dots in local' },
      { email: '.user@example.com', error: 'local starts with dot' },
      { email: 'user.@example.com', error: 'local ends with dot' },
      { email: 'user@example..com', error: 'consecutive dots in domain' },
      { email: 'user@example', error: 'no TLD' },
      { email: 'user@example.c', error: 'TLD too short' },
      { email: 'user@example.123', error: 'numeric TLD' },
      { email: 'a'.repeat(65) + '@example.com', error: 'local part too long' },
      { email: 'user@' + 'a'.repeat(250) + '.com', error: 'email too long' },
    ];

    invalidEmails.forEach(({ email, error }) => {
      it(`should reject (${error}): ${email.substring(0, 30)}...`, () => {
        const result = validateSyntax(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('plus addressing detection', () => {
    it('should detect plus addressing in user+tag@example.com', () => {
      const result = validateSyntax('user+tag@example.com');
      expect(result.valid).toBe(true);
      expect(result.plusAddressed).toBe(true);
      expect(result.localPart).toBe('user+tag');
      expect(result.normalizedLocalPart).toBe('user');
    });

    it('should detect plus addressing with multiple + chars', () => {
      const result = validateSyntax('user+tag+more@example.com');
      expect(result.valid).toBe(true);
      expect(result.plusAddressed).toBe(true);
      expect(result.normalizedLocalPart).toBe('user');
    });

    it('should not flag normal emails as plus addressed', () => {
      const result = validateSyntax('user@example.com');
      expect(result.valid).toBe(true);
      expect(result.plusAddressed).toBe(false);
      expect(result.normalizedLocalPart).toBe('user');
    });

    it('should not flag email starting with + as plus addressed', () => {
      // + at start means no local part before it
      const result = validateSyntax('+tag@example.com');
      expect(result.valid).toBe(true);
      expect(result.plusAddressed).toBe(false);
    });
  });

  describe('normalization', () => {
    it('should lowercase the email', () => {
      const result = validateSyntax('User@EXAMPLE.COM');
      expect(result.valid).toBe(true);
      expect(result.localPart).toBe('user');
      expect(result.domain).toBe('example.com');
    });

    it('should trim whitespace', () => {
      const result = validateSyntax('  user@example.com  ');
      expect(result.valid).toBe(true);
      expect(result.localPart).toBe('user');
    });
  });

  describe('edge cases', () => {
    it('should handle email with multiple @ signs (use last)', () => {
      // RFC allows @ in quoted local part, but we use lastIndexOf
      const result = validateSyntax('user@name@example.com');
      // This will fail because "user@name" isn't a valid local part format
      // for our regex (@ not allowed unquoted)
      expect(result.valid).toBe(false);
    });

    it('should accept long but valid TLDs', () => {
      const result = validateSyntax('user@example.photography');
      expect(result.valid).toBe(true);
      expect(result.domain).toBe('example.photography');
    });

    it('should accept two-char country TLDs', () => {
      const result = validateSyntax('user@example.io');
      expect(result.valid).toBe(true);
    });
  });
});
