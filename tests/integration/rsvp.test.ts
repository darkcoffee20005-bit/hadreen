import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { loadDashboard } from '@/lib/dashboard';
import { recordEvents } from '@/lib/events';
import { submitRsvp } from '@/lib/rsvp';
import { addGuest, duplicateWedding, importGuests, loadInviteGuest, rotateGuestToken, weddingForCouple } from '@/lib/weddings';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36';
const NOW = new Date('2026-11-01T12:00:00Z');

async function makeWedding(overrides: Record<string, unknown> = {}) {
  return db().wedding.create({
    data: {
      slug: 'test-wedding',
      template: 'royal-gold',
      groomName: 'أحمد',
      brideName: 'سارة',
      monogram: 'أ & س',
      dateTimeUtc: new Date('2026-12-10T17:00:00Z'),
      venueName: 'قاعة الاحتفالات',
      venueArea: 'بغداد',
      rsvpDeadline: new Date('2026-12-03T21:00:00Z'),
      musicTrack: 'strings-qanun',
      status: 'live',
      coupleSecret: 'SecretSecretSecretSecret',
      ...overrides,
    },
  });
}

describe.skipIf(!enabled)('RSVP, events and dashboard (Postgres)', () => {
  beforeEach(async () => {
    await db().$executeRawUnsafe('TRUNCATE "Event", "Rsvp", "Guest", "Wedding" CASCADE');
  });
  afterAll(async () => {
    await db().$disconnect();
  });

  it('upserts a personal-link RSVP idempotently and caps seats', async () => {
    const w = await makeWedding();
    const g = await addGuest(w.id, { displayName: 'عائلة أبو حسين', maxSeats: 4, group: '' });
    const input = { slug: w.slug, token: g.token, attending: true, seats: 3, message: 'مبروك' };

    const first = await submitRsvp(input, { now: NOW, userAgent: PHONE_UA });
    const second = await submitRsvp(input, { now: NOW, userAgent: PHONE_UA });
    expect(first.ok && second.ok).toBe(true);
    expect(await db().rsvp.count()).toBe(1);

    expect(await submitRsvp({ ...input, seats: 5 }, { now: NOW })).toEqual({ ok: false, status: 422, error: 'SEATS_MAX' });

    const changed = await submitRsvp({ ...input, attending: false, seats: 3 }, { now: NOW });
    expect(changed.ok && changed.rsvp).toEqual({ attending: false, seats: 0, message: 'مبروك' });
    expect((await loadInviteGuest(w.slug, g.token))?.rsvp?.attending).toBe(false);
  });

  it('rejects tokens from another wedding, drafts and late answers', async () => {
    const w = await makeWedding();
    const other = await makeWedding({ slug: 'other', coupleSecret: 'OtherOtherOtherOtherOthe' });
    const g = await addGuest(other.id, { displayName: 'ضيف', maxSeats: 2, group: '' });
    const input = { slug: w.slug, token: g.token, attending: true, seats: 1, message: '' };
    expect(await submitRsvp(input, { now: NOW })).toMatchObject({ ok: false, error: 'INVALID_LINK' });

    const mine = await addGuest(w.id, { displayName: 'ضيف', maxSeats: 2, group: '' });
    const late = new Date('2026-12-04T00:00:00Z');
    expect(await submitRsvp({ ...input, token: mine.token }, { now: late })).toMatchObject({ error: 'DEADLINE_PASSED' });

    await db().wedding.update({ where: { id: w.id }, data: { status: 'draft' } });
    expect(await submitRsvp({ ...input, token: mine.token }, { now: NOW })).toMatchObject({ error: 'INVALID_LINK' });
  });

  it('creates one open guest per browser key on the generic link', async () => {
    const w = await makeWedding({ openRsvpMaxSeats: 2 });
    const input = { slug: w.slug, clientKey: 'browser-key-123456', name: 'بيت أبو علي', attending: true, seats: 2, message: '' };
    const a = await submitRsvp(input, { now: NOW });
    const b = await submitRsvp({ ...input, name: 'بيت أبو علي الكرام', seats: 1 }, { now: NOW });
    expect(a.ok && b.ok && a.token === b.token).toBe(true);
    const guests = await db().guest.findMany();
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({ source: 'open', displayName: 'بيت أبو علي الكرام', maxSeats: 2 });

    expect(await submitRsvp({ ...input, clientKey: 'other-browser-1234', seats: 3 }, { now: NOW })).toMatchObject({
      error: 'SEATS_MAX',
    });
    await db().wedding.update({ where: { id: w.id }, data: { openRsvpMaxSeats: 0 } });
    expect(await submitRsvp({ ...input, clientKey: 'third-browser-1234' }, { now: NOW })).toMatchObject({
      error: 'OPEN_RSVP_CLOSED',
    });
  });

  it('records beacons, ignores bots and de-duplicates opens', async () => {
    const w = await makeWedding();
    const g = await addGuest(w.id, { displayName: 'ضيف', maxSeats: 2, group: '' });
    const batch = { slug: w.slug, token: g.token, events: [{ type: 'opened' as const }, { type: 'map' as const }] };
    expect(await recordEvents(batch, PHONE_UA, NOW)).toBe(2);
    expect(await recordEvents(batch, PHONE_UA, new Date(NOW.getTime() + 60_000))).toBe(1); // map only
    expect(await recordEvents(batch, 'WhatsApp/2.23.20.0 A', NOW)).toBe(0);
    expect(await recordEvents({ ...batch, slug: 'missing' }, PHONE_UA, NOW)).toBe(0);
  });

  it('computes dashboard totals', async () => {
    const w = await makeWedding();
    await importGuests(w.id, [
      { line: 2, displayName: 'حاضرين ٤', maxSeats: 4, group: 'أهل' },
      { line: 3, displayName: 'معتذرين', maxSeats: 2, group: '' },
      { line: 4, displayName: 'فتحوا وما ردّوا', maxSeats: 2, group: '' },
      { line: 5, displayName: 'ما فتحوا', maxSeats: 2, group: '' },
    ]);
    const byName = Object.fromEntries((await db().guest.findMany()).map((g) => [g.displayName, g]));
    await submitRsvp({ slug: w.slug, token: byName['حاضرين ٤']!.token, attending: true, seats: 4, message: 'ألف مبروك' }, { now: NOW });
    await submitRsvp({ slug: w.slug, token: byName['معتذرين']!.token, attending: false, seats: 0, message: '' }, { now: NOW });
    await recordEvents({ slug: w.slug, token: byName['فتحوا وما ردّوا']!.token, events: [{ type: 'opened' }] }, PHONE_UA, NOW);
    await submitRsvp(
      { slug: w.slug, clientKey: 'open-guest-key-0001', name: 'ضيف من الرابط العام', attending: true, seats: 2, message: '' },
      { now: NOW },
    );

    const { totals, guests } = await loadDashboard(w.id);
    expect(totals).toEqual({
      invitedHouseholds: 4,
      confirmedSeats: 6,
      attendingHouseholds: 2,
      declined: 1,
      noReply: 2,
      openedNoReply: 1,
    });
    expect(guests.find((g) => g.displayName === 'فتحوا وما ردّوا')?.status).toBe('opened');
    expect(guests.find((g) => g.displayName === 'حاضرين ٤')?.message).toBe('ألف مبروك');
  });

  it('checks the couple secret, duplicates without guests and rotates tokens', async () => {
    const w = await makeWedding();
    expect(await weddingForCouple(w.slug, 'SecretSecretSecretSecret')).not.toBeNull();
    expect(await weddingForCouple(w.slug, 'wrong')).toBeNull();
    expect(await weddingForCouple(w.slug, undefined)).toBeNull();

    const g = await addGuest(w.id, { displayName: 'ضيف', maxSeats: 2, group: '' });
    expect(await rotateGuestToken(w.id, g.id)).toBe(true);
    expect((await db().guest.findUnique({ where: { id: g.id } }))?.token).not.toBe(g.token);

    const copy = await duplicateWedding(w.id);
    expect(copy).toMatchObject({ slug: 'test-wedding-copy', status: 'draft', groomName: 'أحمد' });
    expect(copy.coupleSecret).not.toBe(w.coupleSecret);
    expect(await db().guest.count({ where: { weddingId: copy.id } })).toBe(0);
    expect((await duplicateWedding(w.id)).slug).toBe('test-wedding-copy-2');
  });
});
