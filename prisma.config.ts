import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // The CLI (migrations, seed) prefers a direct connection when one is set: Neon's pooled
  // endpoint (PgBouncer, transaction mode) can't hold migration locks. The app itself always
  // uses DATABASE_URL (src/lib/db.ts).
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
});
