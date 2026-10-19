import 'dotenv/config';
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    locale: 'ar-IQ',
    timezoneId: 'Asia/Baghdad',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    // A regular phone UA: the events API ignores headless and bot user agents.
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
      SITE_URL: baseURL,
    },
  },
});
