import 'server-only';

/** Public origin used in links, share messages, OG images and the sitemap. Read at runtime. */
export function siteUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export function requireEnv(name: 'DATABASE_URL' | 'ADMIN_PASSWORD' | 'SESSION_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export function labEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.LAB_ENABLED === 'true';
}
