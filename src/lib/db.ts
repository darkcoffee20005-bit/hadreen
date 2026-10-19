import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { requireEnv } from '@/lib/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }) });
}

/** One client per process (and per hot reload in dev). Created on first use, not at import. */
export function db(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}
