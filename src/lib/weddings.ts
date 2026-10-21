import 'server-only';
import type { Prisma, Wedding } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { demoSchedule } from '@/lib/demo';
import { readOverrides } from '@/lib/palette';
import { newCouplePin, newCoupleSecret, newGuestToken, safeEqual } from '@/lib/tokens';
import { readDressCode, readSchedule, type WeddingInput } from '@/lib/validation/wedding';
import type { GuestInput } from '@/lib/validation/guest';
import type { CsvGuestRow } from '@/lib/csv';
import type { InviteGuest, PublicWedding } from '@/lib/wedding-types';
import { isTemplateId } from '@/templates';

export function toPublicWedding(w: Wedding): PublicWedding {
  return {
    id: w.id,
    slug: w.slug,
    template: isTemplateId(w.template) ? w.template : 'sacred-garden',
    lang: w.lang,
    groomName: w.groomName,
    brideName: w.brideName,
    monogram: w.monogram,
    dateTimeUtc: w.dateTimeUtc.toISOString(),
    verse: w.verse ?? '',
    intro: w.intro,
    venueName: w.venueName,
    venueArea: w.venueArea,
    mapsUrl: w.mapsUrl,
    dressCode: readDressCode(w.dressCode),
    notes: w.notes,
    rsvpDeadline: w.rsvpDeadline.toISOString(),
    schedule: readSchedule(w.schedule),
    musicTrack: w.musicTrack,
    paletteOverrides: readOverrides(w.paletteOverrides),
    originCity: w.originCity ?? '',
    destinationCity: w.destinationCity ?? '',
    status: w.status,
    isDemo: w.isDemo,
    openRsvpMaxSeats: w.openRsvpMaxSeats,
  };
}

/** Demo weddings get a date that is always upcoming. Applied after caching, on every request. */
export function withLiveDates(w: PublicWedding, now = new Date()): PublicWedding {
  if (!w.isDemo) return w;
  const { date, deadline } = demoSchedule(now);
  return { ...w, dateTimeUtc: date.toISOString(), rsvpDeadline: deadline.toISOString() };
}

export async function loadPublicWedding(slug: string): Promise<PublicWedding | null> {
  const w = await db().wedding.findUnique({ where: { slug } });
  return w ? toPublicWedding(w) : null;
}

/** By slug, not id: the cached wedding may predate a re-seed, and the slug is what the link carries. */
export async function loadInviteGuest(slug: string, token: string): Promise<InviteGuest | null> {
  const g = await db().guest.findFirst({ where: { token, wedding: { slug } }, include: { rsvp: true } });
  if (!g) return null;
  return {
    displayName: g.displayName,
    token: g.token,
    maxSeats: g.maxSeats,
    rsvp: g.rsvp ? { attending: g.rsvp.attending, seats: g.rsvp.seats, message: g.rsvp.message } : null,
  };
}

/** Looks up a wedding for the couple dashboard. Secret comparison is constant-time. */
export async function weddingForCouple(slug: string, secret: string | undefined): Promise<Wedding | null> {
  if (!secret) return null;
  const w = await db().wedding.findUnique({ where: { slug } });
  return w && safeEqual(secret, w.coupleSecret) ? w : null;
}

// ---------------------------------------------------------------- admin

function weddingData(input: WeddingInput) {
  return {
    slug: input.slug,
    template: input.template,
    lang: input.lang,
    groomName: input.groomName,
    brideName: input.brideName,
    monogram: input.monogram || `${[...input.groomName][0] ?? ''} & ${[...input.brideName][0] ?? ''}`,
    dateTimeUtc: input.dateLocal,
    verse: input.verse || null,
    intro: input.intro,
    venueName: input.venueName,
    venueArea: input.venueArea,
    mapsUrl: input.mapsUrl,
    dressCode: input.dressCode as Prisma.InputJsonValue,
    notes: input.notes,
    rsvpDeadline: input.rsvpDeadlineLocal,
    schedule: input.schedule as Prisma.InputJsonValue,
    musicTrack: input.musicTrack,
    paletteOverrides: input.paletteOverrides as Prisma.InputJsonValue,
    originCity: input.originCity || null,
    destinationCity: input.destinationCity || null,
    status: input.status,
    openRsvpMaxSeats: input.openRsvpMaxSeats,
  };
}

export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; error: 'SLUG_TAKEN' };

export async function saveWedding(input: WeddingInput, id?: string): Promise<SaveResult> {
  const clash = await db().wedding.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (clash && clash.id !== id) return { ok: false, error: 'SLUG_TAKEN' };
  const data = weddingData(input);
  const w = id
    ? await db().wedding.update({ where: { id }, data })
    : await db().wedding.create({ data: { ...data, coupleSecret: newCoupleSecret(), couplePin: newCouplePin() } });
  return { ok: true, id: w.id, slug: w.slug };
}

/** Copies a wedding's details (not its guests) into a new draft with a fresh secret. */
export async function duplicateWedding(id: string): Promise<Wedding> {
  const src = await db().wedding.findUniqueOrThrow({ where: { id } });
  const { id: _id, createdAt: _c, updatedAt: _u, coupleSecret: _s, couplePin: _p, slug, ...rest } = src;
  let copySlug = `${slug.slice(0, 40)}-copy`;
  for (let n = 2; await db().wedding.findUnique({ where: { slug: copySlug } }); n++) {
    copySlug = `${slug.slice(0, 40)}-copy-${n}`;
  }
  return db().wedding.create({
    data: {
      ...rest,
      dressCode: rest.dressCode as Prisma.InputJsonValue,
      schedule: rest.schedule as Prisma.InputJsonValue,
      paletteOverrides: rest.paletteOverrides as Prisma.InputJsonValue,
      slug: copySlug,
      status: 'draft',
      isDemo: false,
      coupleSecret: newCoupleSecret(),
      couplePin: newCouplePin(),
    },
  });
}

/** A new dashboard code; browsers unlocked with the old one have to type the new one. */
export async function rotateCouplePin(id: string): Promise<void> {
  await db().wedding.update({ where: { id }, data: { couplePin: newCouplePin() } });
}

// ---------------------------------------------------------------- guests

export async function addGuest(weddingId: string, input: GuestInput) {
  return db().guest.create({
    data: { weddingId, displayName: input.displayName, maxSeats: input.maxSeats, group: input.group || null, token: newGuestToken() },
  });
}

export async function updateGuest(weddingId: string, guestId: string, input: GuestInput) {
  const res = await db().guest.updateMany({
    where: { id: guestId, weddingId },
    data: { displayName: input.displayName, maxSeats: input.maxSeats, group: input.group || null },
  });
  return res.count === 1;
}

export async function deleteGuest(weddingId: string, guestId: string) {
  return (await db().guest.deleteMany({ where: { id: guestId, weddingId } })).count === 1;
}

/** New personal link for a guest (e.g. the old one was forwarded around). */
export async function rotateGuestToken(weddingId: string, guestId: string) {
  return (await db().guest.updateMany({ where: { id: guestId, weddingId }, data: { token: newGuestToken() } })).count === 1;
}

export async function existingGuestNames(weddingId: string): Promise<string[]> {
  const guests = await db().guest.findMany({ where: { weddingId }, select: { displayName: true } });
  return guests.map((g) => g.displayName);
}

export async function importGuests(weddingId: string, rows: CsvGuestRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const res = await db().guest.createMany({
    data: rows.map((r) => ({
      weddingId,
      displayName: r.displayName,
      maxSeats: r.maxSeats,
      group: r.group || null,
      token: newGuestToken(),
    })),
  });
  return res.count;
}
