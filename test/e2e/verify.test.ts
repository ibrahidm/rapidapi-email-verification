import { describe, it, expect } from 'vitest';
import { $fetch, setup } from '@nuxt/test-utils/e2e';

describe('POST /api/v1/verify', async () => {
  await setup({
    server: true,
  });

  describe('input validation', () => {
    it('should reject missing email', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: {},
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('email is required');
    });

    it('should reject empty email', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: '' },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should reject non-string email', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 123 },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should reject email without @', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'invalidemail' },
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_SYNTAX');
    });
  });

  describe('syntax validation', () => {
    it('should detect invalid syntax', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'user@' },
      });

      expect(response.success).toBe(true);
      expect(response.data.valid).toBe(false);
      expect(response.data.result).toBe('undeliverable');
      expect(response.data.checks.syntax).toBe(false);
    });

    it('should pass valid syntax', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      expect(response.success).toBe(true);
      expect(response.data.checks.syntax).toBe(true);
    });
  });

  describe('response structure', () => {
    it('should return complete verification data', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('valid');
      expect(response.data).toHaveProperty('result');
      expect(response.data).toHaveProperty('checks');
      expect(response.data).toHaveProperty('provider');
      expect(response.data).toHaveProperty('confidence');
      expect(response.meta).toHaveProperty('processing_time_ms');
    });

    it('should return all check fields', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      const checks = response.data.checks;
      expect(checks).toHaveProperty('syntax');
      expect(checks).toHaveProperty('mx_records');
      expect(checks).toHaveProperty('smtp_valid');
      expect(checks).toHaveProperty('catch_all');
      expect(checks).toHaveProperty('disposable');
      expect(checks).toHaveProperty('role_based');
      expect(checks).toHaveProperty('free_provider');
      expect(checks).toHaveProperty('plus_addressed');
    });

    it('should return provider info', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      const provider = response.data.provider;
      expect(provider).toHaveProperty('domain');
      expect(provider).toHaveProperty('type');
      expect(provider.domain).toBe('gmail.com');
    });
  });

  describe('detection features', () => {
    it('should detect free providers', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      expect(response.data.checks.free_provider).toBe(true);
      expect(response.data.provider.type).toBe('free');
    });

    it('should detect role-based emails', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'admin@gmail.com' },
      });

      expect(response.data.checks.role_based).toBe(true);
    });

    it('should detect plus addressing', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'user+tag@gmail.com' },
      });

      expect(response.data.checks.plus_addressed).toBe(true);
      expect(response.data.normalized_email).toBe('user@gmail.com');
    });

    it('should detect disposable emails', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@10minutemail.com' },
      });

      expect(response.data.checks.disposable).toBe(true);
      expect(response.data.provider.type).toBe('disposable');
    });
  });

  describe('normalization', () => {
    it('should normalize email to lowercase', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'TEST@GMAIL.COM' },
      });

      expect(response.data.email).toBe('test@gmail.com');
    });

    it('should trim whitespace', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: '  test@gmail.com  ' },
      });

      expect(response.data.email).toBe('test@gmail.com');
    });
  });

  describe('trusted providers', () => {
    it('should mark trusted providers as deliverable', async () => {
      const response = await $fetch('/api/v1/verify', {
        method: 'POST',
        body: { email: 'test@gmail.com' },
      });

      expect(response.data.valid).toBe(true);
      expect(response.data.result).toBe('deliverable');
      expect(response.data.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });
});
