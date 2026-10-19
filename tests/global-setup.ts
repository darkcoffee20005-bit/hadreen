import { execSync } from 'node:child_process';

// Applies migrations to the test database once per run. Integration tests are skipped without it.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
