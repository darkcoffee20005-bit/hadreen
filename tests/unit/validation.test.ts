import { describe, expect, it } from 'vitest';
import { normalizeArabic, matchesQuery } from '@/lib/arabic';
import { isNonGuestAgent, eventsInputSchema } from '@/lib/validation/events';
import { TOKEN_ALPHABET, TOKEN_RE, SECRET_RE, SLUG_RE } from '@/lib/validation/patterns';
import { checkSeats, rsvpInputSchema, rsvpOpen } from '@/lib/validation/rsvp';
import { readDressCode, readSchedule, weddingInputSchema, type WeddingFormInput } from '@/lib/validation/wedding';
import { newCoupleSecret, newGuestToken, safeEqual } from '@/lib/tokens';

describe('tokens', () => {
  it('generates tokens that match the patterns', () => {
    for (let i = 0; i < 200; i++) {
      expect(newGuestToken()).toMatch(TOKEN_RE);
      expect(newCoupleSecret()).toMatch(SECRET_RE);
    }
  });

  it('accepts every alphabet character and rejects look-alikes', () => {
    expect(new RegExp(`^[${TOKEN_ALPHABET}]+$`).test(TOKEN_ALPHABET)).toBe(true);
    for (const ch of TOKEN_ALPHABET) expect(`${ch.repeat(10)}`).toMatch(TOKEN_RE);
    for (const ch of '01lIoO') expect(ch.repeat(10)).not.toMatch(TOKEN_RE);
  });

  it('compares secrets safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('validates slugs', () => {
    expect('demo-royal-gold').toMatch(SLUG_RE);
    expect('-bad').not.toMatch(SLUG_RE);
    expect('Bad').not.toMatch(SLUG_RE);
    expect('عرس').not.toMatch(SLUG_RE);
  });
});

describe('rsvp validation', () => {
  const base = { slug: 'demo-royal-gold', attending: true, seats: 2, message: '' };

  it('accepts a personal-link RSVP', () => {
    const r = rsvpInputSchema.safeParse({ ...base, token: 'Hadreen234' });
    expect(r.success).toBe(true);
  });

  it('needs a name and a device key on the generic link', () => {
    const r = rsvpInputSchema.safeParse(base);
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message);
    expect(messages).toContain('NAME_REQUIRED');
    expect(messages).toContain('CLIENT_KEY_REQUIRED');
    expect(
      rsvpInputSchema.safeParse({ ...base, name: 'عائلة أبو حسين', clientKey: 'k'.repeat(20) }).success,
    ).toBe(true);
  });

  it('requires at least one seat when attending', () => {
    const r = rsvpInputSchema.safeParse({ ...base, token: 'Hadreen234', seats: 0 });
    expect(r.error?.issues[0]?.message).toBe('SEATS_MIN');
  });

  it('limits message length and trims it', () => {
    expect(rsvpInputSchema.safeParse({ ...base, token: 'Hadreen234', message: 'x'.repeat(501) }).success).toBe(false);
    expect(rsvpInputSchema.parse({ ...base, token: 'Hadreen234', message: '  مبروك  ' }).message).toBe('مبروك');
  });

  it('caps seats at the guest maximum', () => {
    expect(checkSeats(true, 3, 4)).toEqual({ ok: true, seats: 3 });
    expect(checkSeats(true, 5, 4)).toEqual({ ok: false, error: 'SEATS_MAX' });
    expect(checkSeats(true, 0, 4)).toEqual({ ok: false, error: 'SEATS_MIN' });
    expect(checkSeats(false, 3, 4)).toEqual({ ok: true, seats: 0 });
  });

  it('closes after the deadline', () => {
    const deadline = new Date('2026-12-03T21:00:00Z');
    expect(rsvpOpen(deadline, new Date('2026-12-03T20:59:59Z'))).toBe(true);
    expect(rsvpOpen(deadline, new Date('2026-12-03T21:00:01Z'))).toBe(false);
  });
});

describe('wedding form validation', () => {
  const form: WeddingFormInput = {
    slug: 'Ahmed-Sara',
    template: 'royal-gold',
    lang: 'ar',
    groomName: 'أحمد',
    brideName: 'سارة',
    monogram: 'أ ♡ س',
    dateLocal: '2026-12-10T20:00',
    verse: '',
    intro: '',
    venueName: 'قاعة الاحتفالات',
    venueArea: 'بغداد',
    mapsUrl: '',
    dressCode: { label: 'رسمي', swatches: ['#0B3D2E'], ladies: '', gentlemen: '' },
    notes: '',
    rsvpDeadlineLocal: '2026-12-03T23:59',
    schedule: [{ time: '19:30', title: 'الاستقبال', subtitle: '' }],
    musicTrack: 'strings-qanun',
    paletteOverrides: { variant: 'gold' },
    originCity: '',
    destinationCity: '',
    status: 'draft',
    openRsvpMaxSeats: 2,
  };

  it('parses dates as Baghdad time and lowercases the slug', () => {
    const v = weddingInputSchema.parse(form);
    expect(v.slug).toBe('ahmed-sara');
    expect(v.dateLocal.toISOString()).toBe('2026-12-10T17:00:00.000Z');
  });

  it('rejects a deadline after the wedding and bad URLs', () => {
    expect(weddingInputSchema.safeParse({ ...form, rsvpDeadlineLocal: '2026-12-11T10:00' }).success).toBe(false);
    expect(weddingInputSchema.safeParse({ ...form, mapsUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(weddingInputSchema.safeParse({ ...form, mapsUrl: 'https://maps.app.goo.gl/abc' }).success).toBe(true);
    expect(weddingInputSchema.safeParse({ ...form, paletteOverrides: { accent: 'red' } }).success).toBe(false);
  });

  it('reads stored JSON defensively', () => {
    expect(readSchedule([{ time: '19:30', title: 'العشاء', subtitle: '' }, { time: 'bad' }, 5])).toHaveLength(1);
    expect(readSchedule('nope')).toEqual([]);
    expect(readDressCode({ label: 'رسمي' })).toEqual({ label: 'رسمي', swatches: [], ladies: '', gentlemen: '' });
    expect(readDressCode(null).label).toBe('');
  });
});

describe('events validation', () => {
  it('accepts browser event types only', () => {
    expect(eventsInputSchema.safeParse({ slug: 'demo-royal-gold', events: [{ type: 'opened' }] }).success).toBe(true);
    expect(eventsInputSchema.safeParse({ slug: 'demo-royal-gold', events: [{ type: 'rsvp' }] }).success).toBe(false);
    expect(eventsInputSchema.safeParse({ slug: 'demo-royal-gold', events: [] }).success).toBe(false);
  });

  it('ignores previews, crawlers and headless browsers', () => {
    expect(isNonGuestAgent('WhatsApp/2.23.20.0 A')).toBe(true);
    expect(isNonGuestAgent('facebookexternalhit/1.1')).toBe(true);
    expect(isNonGuestAgent('Mozilla/5.0 HeadlessChrome/141.0')).toBe(true);
    expect(isNonGuestAgent('')).toBe(true);
    expect(
      isNonGuestAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
      ),
    ).toBe(false);
  });
});

describe('Arabic normalisation', () => {
  it('folds spelling variants', () => {
    expect(normalizeArabic('أحْمَد')).toBe('احمد');
    expect(normalizeArabic('عائلة  أبو   حسين')).toBe('عايله ابو حسين');
    expect(normalizeArabic('مصطفى')).toBe('مصطفي');
    expect(normalizeArabic('ﻻ')).toBe('لا'); // presentation form
    expect(matchesQuery('عائلة الحاج كريم', 'الحاج كريم')).toBe(true);
    expect(matchesQuery('عائلة الحاج كريم', 'عايله')).toBe(true);
    expect(matchesQuery('عائلة الحاج كريم', '')).toBe(true);
    expect(matchesQuery('عائلة الحاج كريم', 'سامر')).toBe(false);
  });
});
