import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
        resolve: {
          alias: {
            '#shared': resolve(__dirname, './shared'),
            '#server': resolve(__dirname, './server'),
          },
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.test.ts'],
          environment: 'node',
        },
        resolve: {
          alias: {
            '#shared': resolve(__dirname, './shared'),
            '#server': resolve(__dirname, './server'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
});
