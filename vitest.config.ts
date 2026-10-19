import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // `server-only` throws outside React Server Components; tests run in plain Node.
      'server-only': fromRoot('./tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Integration tests share one database, so files run one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      SITE_URL: 'https://hadreen.test',
      ADMIN_PASSWORD: 'test-admin-password',
      SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars',
    },
  },
});
