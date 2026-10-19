import { execSync } from 'node:child_process';
import 'dotenv/config';

/**
 * Brings the e2e database up to date (non-destructive) and refreshes the demo weddings.
 * Tests create their own uniquely named fixtures, so nothing needs wiping between runs.
 */
export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error('E2E_DATABASE_URL is not set (see .env.example)');
  const env = { ...process.env, DATABASE_URL: url };
  execSync('pnpm exec prisma migrate deploy', { stdio: 'pipe', env });
  execSync('pnpm exec tsx prisma/seed.ts', { stdio: 'pipe', env });
}
