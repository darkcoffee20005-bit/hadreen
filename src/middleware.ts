import { NextResponse, type NextRequest } from 'next/server';
import { SECRET_RE, SLUG_RE } from '@/lib/validation/patterns';

const COUPLE_COOKIE = 'hadreen_k';

/**
 * /d/<slug>?k=<secret>: moves the secret into an httpOnly cookie scoped to that dashboard and
 * redirects to the clean URL, so the secret doesn't linger in history, screenshots or referrers.
 * The dashboard itself verifies the cookie against the database.
 */
export function middleware(req: NextRequest) {
  const match = /^\/d\/([^/]+)\/?$/.exec(req.nextUrl.pathname);
  const secret = req.nextUrl.searchParams.get('k');
  if (!match || !secret) return NextResponse.next();

  const slug = match[1]!;
  const clean = req.nextUrl.clone();
  clean.searchParams.delete('k');
  const res = NextResponse.redirect(clean);
  res.headers.set('referrer-policy', 'no-referrer');
  if (SLUG_RE.test(slug) && SECRET_RE.test(secret)) {
    res.cookies.set(COUPLE_COOKIE, secret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      path: `/d/${slug}`,
      maxAge: 180 * 86_400,
    });
  }
  return res;
}

export const config = { matcher: ['/d/:path*'] };
