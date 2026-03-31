import { describe, it, expect } from 'vitest';
import { $fetch, setup } from '@nuxt/test-utils/e2e';

describe('POST /api/v1/verify/bulk', async () => {
  await setup({
    server: true,
  });

  describe('input validation', () => {
    it('should reject missing emails array', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {},
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('emails array is required');
    });

    it('should reject empty emails array', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: { emails: [] },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should reject non-array emails', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: { emails: 'not-an-array' },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should reject array exceeding 100 emails', async () => {
      const emails = Array.from({ length: 101 }, (_, i) => `user${i}@example.com`);
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: { emails },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('successful verification', () => {
    it('should verify multiple emails', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com', 'admin@yahoo.com'],
        },
      });

      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(2);
      expect(response.data.summary).toBeDefined();
      expect(response.meta.processing_time_ms).toBeGreaterThan(0);
    });

    it('should return correct summary counts', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com', 'invalid@', 'test@10minutemail.com'],
        },
      });

      expect(response.success).toBe(true);
      const { summary } = response.data;
      expect(summary.total).toBe(3);
      expect(summary.deliverable + summary.undeliverable + summary.risky + summary.unknown).toBe(3);
    });
  });

  describe('response structure', () => {
    it('should return complete data structure', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com'],
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('results');
      expect(response.data).toHaveProperty('summary');
      expect(response.data.summary).toHaveProperty('total');
      expect(response.data.summary).toHaveProperty('deliverable');
      expect(response.data.summary).toHaveProperty('undeliverable');
      expect(response.data.summary).toHaveProperty('risky');
      expect(response.data.summary).toHaveProperty('unknown');
    });

    it('should return verification data for each email', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com'],
        },
      });

      const result = response.data.results[0];
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('deduplication', () => {
    it('should deduplicate identical emails', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com', 'test@gmail.com', 'test@gmail.com'],
        },
      });

      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(1);
      expect(response.data.summary.total).toBe(1);
    });

    it('should deduplicate case-insensitive emails', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: ['test@gmail.com', 'TEST@GMAIL.COM', 'Test@Gmail.Com'],
        },
      });

      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(1);
    });
  });

  describe('mixed results', () => {
    it('should handle mix of valid and invalid emails', async () => {
      const response = await $fetch('/api/v1/verify/bulk', {
        method: 'POST',
        body: {
          emails: [
            'valid@gmail.com',
            'invalid@',
            'disposable@10minutemail.com',
          ],
        },
      });

      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(3);

      // Check each result has proper structure
      for (const result of response.data.results) {
        expect(result.email).toBeDefined();
        expect(result.valid).toBeDefined();
        expect(result.result).toBeDefined();
      }
    });
  });
});
