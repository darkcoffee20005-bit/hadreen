import 'server-only';
import { getIronSession, sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireEnv } from '@/lib/env';
import { safeEqual } from '@/lib/tokens';

interface AdminSession {
  admin?: boolean;
}

const ADMIN_TTL = 12 * 3600;

async function adminSession() {
  return getIronSession<AdminSession>(await cookies(), {
    password: requireEnv('SESSION_SECRET'),
    cookieName: 'hadreen_admin',
    ttl: ADMIN_TTL,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  });
}

export async function isAdmin(): Promise<boolean> {
  return (await adminSession()).admin === true;
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

export async function logInAdmin(password: string): Promise<boolean> {
  if (!safeEqual(password, requireEnv('ADMIN_PASSWORD'))) return false;
  const session = await adminSession();
  session.admin = true;
  await session.save();
  return true;
}

export async function logOutAdmin(): Promise<void> {
  (await adminSession()).destroy();
}

/** Cookie the middleware sets from /d/<slug>?k=…, scoped to that dashboard. */
export const COUPLE_COOKIE = 'hadreen_k';

export async function coupleSecretFromCookie(): Promise<string | undefined> {
  return (await cookies()).get(COUPLE_COOKIE)?.value;
}

/**
 * The dashboard code: the secret link alone isn't enough, the couple also types a 6-digit code
 * once per browser. The cookie holds the code they typed, sealed and scoped to that dashboard, so
 * a new code from the admin locks out every browser that had the old one.
 */
const PIN_COOKIE = 'hadreen_pin';
const PIN_TTL = 90 * 86_400;

async function sealPin(slug: string, pin: string) {
  return sealData({ slug, pin }, { password: requireEnv('SESSION_SECRET'), ttl: PIN_TTL });
}

export async function couplePinMatches(slug: string, pin: string): Promise<boolean> {
  const sealed = (await cookies()).get(PIN_COOKIE)?.value;
  if (!sealed || !pin) return false;
  try {
    const data = await unsealData<{ slug?: string; pin?: string }>(sealed, { password: requireEnv('SESSION_SECRET'), ttl: PIN_TTL });
    return data.slug === slug && typeof data.pin === 'string' && safeEqual(data.pin, pin);
  } catch {
    return false;
  }
}

export async function rememberCouplePin(slug: string, pin: string): Promise<void> {
  (await cookies()).set(PIN_COOKIE, await sealPin(slug, pin), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: `/d/${slug}`,
    maxAge: PIN_TTL,
  });
}
