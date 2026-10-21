'use server';

import { revalidatePath } from 'next/cache';
import { parseGuestsCsv, type CsvIssue } from '@/lib/csv';
import { headers } from 'next/headers';
import { coupleAccess, coupleWedding } from '@/lib/couple-access';
import { clientIp, limits } from '@/lib/ratelimit';
import { rememberCouplePin } from '@/lib/session';
import { safeEqual } from '@/lib/tokens';
import { guestInputSchema, type GuestInput } from '@/lib/validation/guest';
import {
  addGuest,
  deleteGuest,
  existingGuestNames,
  importGuests,
  rotateGuestToken,
  updateGuest,
} from '@/lib/weddings';

export type ActionResult = { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'NOT_FOUND' };

async function authorize(slug: string) {
  return coupleWedding(slug);
}

export type UnlockResult = { ok: true } | { ok: false; error: 'WRONG' | 'LIMITED' | 'UNAUTHORIZED' };

/** The dashboard code. Needs the secret link's cookie first; remembered in this browser after. */
export async function unlockDashboardAction(slug: string, pin: string): Promise<UnlockResult> {
  const access = await coupleAccess(slug);
  if (access.state === 'denied') return { ok: false, error: 'UNAUTHORIZED' };
  if (access.state === 'open') return { ok: true };
  if (!(await limits.pinByIp(clientIp(await headers()))) || !(await limits.pinBySlug(slug))) {
    return { ok: false, error: 'LIMITED' };
  }
  const code = String(pin).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const expected = access.wedding.couplePin;
  if (!/^\d{6}$/.test(code) || !expected || !safeEqual(code, expected)) return { ok: false, error: 'WRONG' };
  await rememberCouplePin(slug, expected);
  revalidatePath(`/d/${slug}`);
  return { ok: true };
}

function done(slug: string): ActionResult {
  revalidatePath(`/d/${slug}`);
  return { ok: true };
}

export async function addGuestAction(slug: string, input: GuestInput): Promise<ActionResult> {
  const w = await authorize(slug);
  if (!w) return { ok: false, error: 'UNAUTHORIZED' };
  const parsed = guestInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  await addGuest(w.id, parsed.data);
  return done(slug);
}

export async function updateGuestAction(slug: string, guestId: string, input: GuestInput): Promise<ActionResult> {
  const w = await authorize(slug);
  if (!w) return { ok: false, error: 'UNAUTHORIZED' };
  const parsed = guestInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  return (await updateGuest(w.id, guestId, parsed.data)) ? done(slug) : { ok: false, error: 'NOT_FOUND' };
}

export async function deleteGuestAction(slug: string, guestId: string): Promise<ActionResult> {
  const w = await authorize(slug);
  if (!w) return { ok: false, error: 'UNAUTHORIZED' };
  return (await deleteGuest(w.id, guestId)) ? done(slug) : { ok: false, error: 'NOT_FOUND' };
}

export async function rotateTokenAction(slug: string, guestId: string): Promise<ActionResult> {
  const w = await authorize(slug);
  if (!w) return { ok: false, error: 'UNAUTHORIZED' };
  return (await rotateGuestToken(w.id, guestId)) ? done(slug) : { ok: false, error: 'NOT_FOUND' };
}

export type ImportResult =
  | { ok: true; imported: number; issues: CsvIssue[] }
  | { ok: false; error: 'UNAUTHORIZED' | 'INVALID_INPUT' };

export async function importGuestsAction(slug: string, csv: string, defaultSeats: number): Promise<ImportResult> {
  const w = await authorize(slug);
  if (!w) return { ok: false, error: 'UNAUTHORIZED' };
  if (csv.length > 200_000 || !Number.isInteger(defaultSeats) || defaultSeats < 1 || defaultSeats > 20) {
    return { ok: false, error: 'INVALID_INPUT' };
  }
  const { rows, issues } = parseGuestsCsv(csv, { defaultSeats, existingNames: await existingGuestNames(w.id) });
  const imported = await importGuests(w.id, rows);
  revalidatePath(`/d/${slug}`);
  return { ok: true, imported, issues };
}
