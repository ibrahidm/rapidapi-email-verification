import { describe, it, expect } from 'vitest';
import { detectMxProvider, isTrustedInfrastructure } from '#server/services/verifier/mx-provider';
import type { MxRecord } from '#shared/types';

function makeMx(exchange: string, priority = 10): MxRecord {
  return { exchange, priority };
}

describe('detectMxProvider', () => {
  describe('Google infrastructure', () => {
    it('should detect Google Workspace MX records', () => {
      const records = [
        makeMx('aspmx.l.google.com', 1),
        makeMx('alt1.aspmx.l.google.com', 5),
      ];
      expect(detectMxProvider(records)).toBe('google');
    });

    it('should detect googlemail.com MX', () => {
      const records = [makeMx('mx.googlemail.com')];
      expect(detectMxProvider(records)).toBe('google');
    });

    it('should detect smtp.google.com', () => {
      const records = [makeMx('smtp.google.com')];
      expect(detectMxProvider(records)).toBe('google');
    });
  });

  describe('Microsoft infrastructure', () => {
    it('should detect Microsoft 365 MX records', () => {
      const records = [makeMx('company-com.mail.protection.outlook.com')];
      expect(detectMxProvider(records)).toBe('microsoft');
    });

    it('should detect hotmail MX', () => {
      const records = [makeMx('mx1.hotmail.com')];
      expect(detectMxProvider(records)).toBe('microsoft');
    });

    it('should detect outlook.com MX', () => {
      const records = [makeMx('outlook-com.olc.protection.outlook.com')];
      expect(detectMxProvider(records)).toBe('microsoft');
    });

    it('should NOT match domains containing but not ending with pattern', () => {
      // "not-protection.outlook.com.fake.com" should NOT match
      const records = [makeMx('protection.outlook.com.attacker.com')];
      expect(detectMxProvider(records)).toBe('unknown');
    });
  });

  describe('Yahoo infrastructure', () => {
    it('should detect Yahoo MX records', () => {
      const records = [makeMx('mx-biz.mail.am0.yahoodns.net')];
      expect(detectMxProvider(records)).toBe('yahoo');
    });

    it('should detect yahoo.com MX', () => {
      const records = [makeMx('mta5.am0.yahoo.com')];
      expect(detectMxProvider(records)).toBe('yahoo');
    });
  });

  describe('iCloud infrastructure', () => {
    it('should detect iCloud MX records', () => {
      const records = [makeMx('mx1.mail.icloud.com')];
      expect(detectMxProvider(records)).toBe('icloud');
    });

    it('should detect me.com MX', () => {
      const records = [makeMx('mx.me.com')];
      expect(detectMxProvider(records)).toBe('icloud');
    });
  });

  describe('Zoho infrastructure', () => {
    it('should detect Zoho MX records', () => {
      const records = [makeMx('mx.zoho.com')];
      expect(detectMxProvider(records)).toBe('zoho');
    });

    it('should detect zohomail.com MX', () => {
      const records = [makeMx('mx2.zohomail.com')];
      expect(detectMxProvider(records)).toBe('zoho');
    });
  });

  describe('Fastmail infrastructure', () => {
    it('should detect Fastmail MX records', () => {
      const records = [makeMx('in1-smtp.messagingengine.com')];
      expect(detectMxProvider(records)).toBe('fastmail');
    });

    it('should detect fastmail.com MX', () => {
      const records = [makeMx('mx.fastmail.com')];
      expect(detectMxProvider(records)).toBe('fastmail');
    });
  });

  describe('Security providers (not trusted)', () => {
    it('should detect Proofpoint MX records', () => {
      const records = [makeMx('mx1.company.pphosted.com')];
      expect(detectMxProvider(records)).toBe('proofpoint');
    });

    it('should detect Mimecast MX records', () => {
      const records = [makeMx('us-smtp-inbound-1.mimecast.com')];
      expect(detectMxProvider(records)).toBe('mimecast');
    });

    it('should detect Barracuda MX records', () => {
      const records = [makeMx('mx.barracudanetworks.com')];
      expect(detectMxProvider(records)).toBe('barracuda');
    });
  });

  describe('Unknown providers', () => {
    it('should return unknown for custom MX', () => {
      const records = [makeMx('mail.customdomain.com')];
      expect(detectMxProvider(records)).toBe('unknown');
    });

    it('should return unknown for empty records', () => {
      expect(detectMxProvider([])).toBe('unknown');
    });
  });

  describe('case insensitivity', () => {
    it('should handle uppercase MX hostnames', () => {
      const records = [makeMx('ASPMX.L.GOOGLE.COM')];
      expect(detectMxProvider(records)).toBe('google');
    });

    it('should handle mixed case', () => {
      const records = [makeMx('Company-Com.Mail.Protection.Outlook.Com')];
      expect(detectMxProvider(records)).toBe('microsoft');
    });
  });

  describe('multiple MX records', () => {
    it('should detect provider from any MX record', () => {
      const records = [
        makeMx('backup.customserver.com', 20),
        makeMx('aspmx.l.google.com', 1),
      ];
      expect(detectMxProvider(records)).toBe('google');
    });
  });
});

describe('isTrustedInfrastructure', () => {
  describe('trusted providers', () => {
    it('should trust Google infrastructure', () => {
      const records = [makeMx('aspmx.l.google.com')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });

    it('should trust Microsoft infrastructure', () => {
      const records = [makeMx('mail.protection.outlook.com')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });

    it('should trust Yahoo infrastructure', () => {
      const records = [makeMx('mx.yahoodns.net')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });

    it('should trust iCloud infrastructure', () => {
      const records = [makeMx('mx.icloud.com')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });

    it('should trust Zoho infrastructure', () => {
      const records = [makeMx('mx.zoho.com')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });

    it('should trust Fastmail infrastructure', () => {
      const records = [makeMx('in1-smtp.messagingengine.com')];
      expect(isTrustedInfrastructure(records)).toBe(true);
    });
  });

  describe('untrusted providers', () => {
    it('should NOT trust Proofpoint (security gateway)', () => {
      const records = [makeMx('mx.pphosted.com')];
      expect(isTrustedInfrastructure(records)).toBe(false);
    });

    it('should NOT trust Mimecast (security gateway)', () => {
      const records = [makeMx('us-smtp.mimecast.com')];
      expect(isTrustedInfrastructure(records)).toBe(false);
    });

    it('should NOT trust Barracuda (security gateway)', () => {
      const records = [makeMx('mx.barracudanetworks.com')];
      expect(isTrustedInfrastructure(records)).toBe(false);
    });

    it('should NOT trust unknown infrastructure', () => {
      const records = [makeMx('mail.customserver.com')];
      expect(isTrustedInfrastructure(records)).toBe(false);
    });

    it('should NOT trust empty MX records', () => {
      expect(isTrustedInfrastructure([])).toBe(false);
    });
  });
});
