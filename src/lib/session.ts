import 'server-only';
import { getIronSession } from 'iron-session';
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
