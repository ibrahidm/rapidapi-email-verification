import { describe, it, expect } from 'vitest';
import { $fetch, setup } from '@nuxt/test-utils/e2e';

describe('GET /api/v1/health', async () => {
  await setup({
    server: true,
  });

  it('should return health status', async () => {
    const response = await $fetch('/api/v1/health');

    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('timestamp');
    expect(response).toHaveProperty('version');
    expect(response).toHaveProperty('checks');
    expect(response).toHaveProperty('cache');
  });

  it('should have valid status value', async () => {
    const response = await $fetch('/api/v1/health');

    expect(['ok', 'degraded', 'unhealthy']).toContain(response.status);
  });

  it('should return ISO timestamp', async () => {
    const response = await $fetch('/api/v1/health');

    const timestamp = new Date(response.timestamp);
    expect(timestamp.toISOString()).toBe(response.timestamp);
  });

  it('should return version string', async () => {
    const response = await $fetch('/api/v1/health');

    expect(typeof response.version).toBe('string');
    expect(response.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should return check results', async () => {
    const response = await $fetch('/api/v1/health');

    const { checks } = response;
    expect(checks).toHaveProperty('dns');
    expect(checks).toHaveProperty('database');
    expect(typeof checks.dns).toBe('boolean');
    // database can be boolean or null
    expect(checks.database === null || typeof checks.database === 'boolean').toBe(true);
  });

  it('should return cache stats', async () => {
    const response = await $fetch('/api/v1/health');

    const { cache } = response;
    expect(cache).toHaveProperty('mx_entries');
    expect(cache).toHaveProperty('catchall_entries');
    expect(typeof cache.mx_entries).toBe('number');
    expect(typeof cache.catchall_entries).toBe('number');
    expect(cache.mx_entries).toBeGreaterThanOrEqual(0);
    expect(cache.catchall_entries).toBeGreaterThanOrEqual(0);
  });

  it('should have DNS check pass (when network available)', async () => {
    const response = await $fetch('/api/v1/health');

    // In a test environment with network, DNS should work
    expect(response.checks.dns).toBe(true);
  });
});
