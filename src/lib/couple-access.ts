import 'server-only';
import type { Wedding } from '@/generated/prisma/client';
import { coupleSecretFromCookie, couplePinMatches, isAdmin } from '@/lib/session';
import { SLUG_RE } from '@/lib/validation/patterns';
import { weddingForCouple } from '@/lib/weddings';

export type CoupleAccess =
  | { state: 'denied' }
  | { state: 'locked'; wedding: Wedding; secret: string }
  | { state: 'open'; wedding: Wedding; secret: string };

/** Secret link (cookie) first, then the dashboard code. The signed-in admin skips the code. */
export async function coupleAccess(slug: string): Promise<CoupleAccess> {
  if (!SLUG_RE.test(slug)) return { state: 'denied' };
  const secret = await coupleSecretFromCookie();
  const wedding = await weddingForCouple(slug, secret);
  if (!wedding || !secret) return { state: 'denied' };
  const open = (await couplePinMatches(slug, wedding.couplePin)) || (await isAdmin());
  return { state: open ? 'open' : 'locked', wedding, secret };
}

/** For actions and downloads: the wedding only when both the link and the code check out. */
export async function coupleWedding(slug: string): Promise<Wedding | null> {
  const access = await coupleAccess(slug);
  return access.state === 'open' ? access.wedding : null;
}
