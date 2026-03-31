import { describe, it, expect } from 'vitest';
import { checkRoleBased, isRoleBasedEmail } from '#server/services/verifier/role-based';

describe('checkRoleBased', () => {
  describe('administrative prefixes', () => {
    const adminPrefixes = [
      'admin',
      'administrator',
      'postmaster',
      'webmaster',
      'hostmaster',
      'root',
      'sysadmin',
    ];

    adminPrefixes.forEach((prefix) => {
      it(`should detect ${prefix}@ as role-based`, () => {
        expect(checkRoleBased(`${prefix}@example.com`)).toBe(true);
      });
    });
  });

  describe('contact/support prefixes', () => {
    const contactPrefixes = [
      'info',
      'contact',
      'help',
      'support',
      'service',
      'feedback',
    ];

    contactPrefixes.forEach((prefix) => {
      it(`should detect ${prefix}@ as role-based`, () => {
        expect(checkRoleBased(`${prefix}@example.com`)).toBe(true);
      });
    });
  });

  describe('sales/business prefixes', () => {
    const businessPrefixes = [
      'sales',
      'marketing',
      'press',
      'hr',
      'careers',
      'billing',
    ];

    businessPrefixes.forEach((prefix) => {
      it(`should detect ${prefix}@ as role-based`, () => {
        expect(checkRoleBased(`${prefix}@example.com`)).toBe(true);
      });
    });
  });

  describe('no-reply prefixes', () => {
    const noreplyPrefixes = [
      'noreply',
      'no-reply',
      'no_reply',
      'donotreply',
      'do-not-reply',
      'mailer-daemon',
      'bounce',
    ];

    noreplyPrefixes.forEach((prefix) => {
      it(`should detect ${prefix}@ as role-based`, () => {
        expect(checkRoleBased(`${prefix}@example.com`)).toBe(true);
      });
    });
  });

  describe('personal emails (not role-based)', () => {
    const personalEmails = [
      'john@example.com',
      'jane.doe@example.com',
      'jsmith@example.com',
      'user123@example.com',
      'firstname.lastname@example.com',
    ];

    personalEmails.forEach((email) => {
      it(`should not flag ${email} as role-based`, () => {
        expect(checkRoleBased(email)).toBe(false);
      });
    });
  });

  describe('prefix with separators', () => {
    it('should detect prefixes followed by dot separator', () => {
      expect(checkRoleBased('admin.team@example.com')).toBe(true);
      expect(checkRoleBased('support.us@example.com')).toBe(true);
    });

    it('should detect prefixes followed by hyphen separator', () => {
      expect(checkRoleBased('admin-team@example.com')).toBe(true);
      expect(checkRoleBased('support-desk@example.com')).toBe(true);
    });

    it('should detect prefixes followed by underscore separator', () => {
      expect(checkRoleBased('admin_team@example.com')).toBe(true);
      expect(checkRoleBased('support_desk@example.com')).toBe(true);
    });

    it('should not flag if prefix is part of a larger word', () => {
      // 'administrator' is in the list, but 'administrative' is not
      expect(checkRoleBased('administrative@example.com')).toBe(false);
      // 'info' is in the list, but 'information' is also in the list
      expect(checkRoleBased('information@example.com')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for email without @', () => {
      expect(checkRoleBased('invalidemail')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(checkRoleBased('ADMIN@example.com')).toBe(true);
      expect(checkRoleBased('Admin@example.com')).toBe(true);
      expect(checkRoleBased('NoReply@example.com')).toBe(true);
    });

    it('should handle empty local part', () => {
      expect(checkRoleBased('@example.com')).toBe(false);
    });
  });
});

describe('isRoleBasedEmail', () => {
  it('should return true for exact role prefix matches', () => {
    expect(isRoleBasedEmail('admin')).toBe(true);
    expect(isRoleBasedEmail('support')).toBe(true);
    expect(isRoleBasedEmail('noreply')).toBe(true);
  });

  it('should return true for prefix with separators', () => {
    expect(isRoleBasedEmail('admin.team')).toBe(true);
    expect(isRoleBasedEmail('support-desk')).toBe(true);
    expect(isRoleBasedEmail('info_department')).toBe(true);
  });

  it('should return false for personal names', () => {
    expect(isRoleBasedEmail('john')).toBe(false);
    expect(isRoleBasedEmail('jane.doe')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isRoleBasedEmail('ADMIN')).toBe(true);
    expect(isRoleBasedEmail('NoReply')).toBe(true);
  });
});
