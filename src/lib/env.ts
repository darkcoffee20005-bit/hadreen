import 'server-only';

/** Public origin used in links, share messages, OG images and the sitemap. Read at runtime. */
export function siteUrl(): string {
  // On Vercel without a custom domain yet, fall back to the project's production URL.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || (vercel ? `https://${vercel}` : 'http://localhost:3000')).replace(/\/+$/, '');
}

export function requireEnv(name: 'DATABASE_URL' | 'ADMIN_PASSWORD' | 'SESSION_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export function labEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.LAB_ENABLED === 'true';
}
