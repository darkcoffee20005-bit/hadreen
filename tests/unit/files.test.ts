import { describe, expect, it } from 'vitest';
import { csvCell, parseGuestsCsv, toCsv } from '@/lib/csv';
import { googleCalendarUrl } from '@/lib/gcal';
import { buildIcs, escapeIcsText, foldIcsLine, icsDate } from '@/lib/ics';
import { buildShareMessage } from '@/lib/share';
import { findCity, parseLatLon } from '@/lib/geo';
import { venueMapsUrl } from '@/lib/links';

describe('guest CSV import', () => {
  it('reads Arabic headers, Eastern digits and default seats', () => {
    const csv = '﻿الاسم,عدد المقاعد,المجموعة\nعائلة أبو حسين,٤,أهل العريس\nبيت أبو علي,,أصدقاء\n';
    const { rows, issues } = parseGuestsCsv(csv, { defaultSeats: 2 });
    expect(issues).toEqual([]);
    expect(rows).toEqual([
      { line: 2, displayName: 'عائلة أبو حسين', maxSeats: 4, group: 'أهل العريس' },
      { line: 3, displayName: 'بيت أبو علي', maxSeats: 2, group: 'أصدقاء' },
    ]);
  });

  it('reads English headers in any order, semicolons and quotes', () => {
    const csv = 'group;seats;name\nFriends;3;"Al-Hassan, family"\n';
    const { rows } = parseGuestsCsv(csv, { defaultSeats: 2 });
    expect(rows[0]).toMatchObject({ displayName: 'Al-Hassan, family', maxSeats: 3, group: 'Friends' });
  });

  it('works without a header row', () => {
    const { rows } = parseGuestsCsv('عائلة الدكتور سامر,5\nالأستاذ مصطفى\n', { defaultSeats: 2 });
    expect(rows.map((r) => [r.displayName, r.maxSeats])).toEqual([
      ['عائلة الدكتور سامر', 5],
      ['الأستاذ مصطفى', 2],
    ]);
  });

  it('reports bad seats and duplicates, including names already invited', () => {
    const csv = 'الاسم,المقاعد\nعائلة أبو حسين,0\nبيت أبو علي,2\nبيت ابو علي,2\nعائلة الحاج كريم,3\n';
    const { rows, issues } = parseGuestsCsv(csv, { defaultSeats: 2, existingNames: ['عائلة الحاج كريم'] });
    expect(rows.map((r) => r.displayName)).toEqual(['بيت أبو علي']);
    expect(issues).toEqual([
      { line: 2, code: 'INVALID_SEATS', value: '0' },
      { line: 4, code: 'DUPLICATE', value: 'بيت ابو علي' },
      { line: 5, code: 'DUPLICATE', value: 'عائلة الحاج كريم' },
    ]);
  });
});

describe('CSV export', () => {
  it('adds a BOM, CRLF and quotes when needed', () => {
    expect(toCsv([['الاسم', 'المقاعد'], ['عائلة, أبو حسين', 4]])).toBe(
      '﻿الاسم,المقاعد\r\n"عائلة, أبو حسين",4\r\n',
    );
  });

  it('neutralises spreadsheet formulas from guest input', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+964')).toBe("'+964");
    expect(csvCell(-1)).toBe('-1');
  });
});

describe('calendar', () => {
  const start = new Date('2026-12-10T17:00:00Z');
  const end = new Date('2026-12-10T21:00:00Z');

  it('formats UTC dates and escapes text', () => {
    expect(icsDate(start)).toBe('20261210T170000Z');
    expect(escapeIcsText('قاعة; بغداد, الكرادة\nملاحظة')).toBe('قاعة\\; بغداد\\, الكرادة\\nملاحظة');
  });

  it('folds long Arabic lines at 75 octets without breaking characters', () => {
    const line = `DESCRIPTION:${'يسعدنا دعوتكم لحفل زفاف أحمد وسارة '.repeat(6)}`;
    const folded = foldIcsLine(line);
    const encoder = new TextEncoder();
    for (const physical of folded.split('\r\n')) expect(encoder.encode(physical).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('builds a complete event', () => {
    const ics = buildIcs({
      uid: 'w1@hadreen',
      start,
      end,
      summary: 'زفاف أحمد وسارة',
      location: 'قاعة الاحتفالات، بغداد',
      url: 'https://hadreen.test/i/ahmed-sara',
      stamp: start,
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261210T170000Z\r\n');
    expect(ics).toContain('DTEND:20261210T210000Z\r\n');
    expect(ics).toContain('SUMMARY:زفاف أحمد وسارة\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('builds a Google Calendar link', () => {
    const url = new URL(googleCalendarUrl({ title: 'زفاف أحمد وسارة', start, end, location: 'بغداد' }));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261210T170000Z/20261210T210000Z');
    expect(url.searchParams.get('text')).toBe('زفاف أحمد وسارة');
    expect(url.searchParams.get('ctz')).toBe('Asia/Baghdad');
  });
});

describe('share message', () => {
  it('uses the exact Arabic wording', () => {
    expect(
      buildShareMessage({
        lang: 'ar',
        guestName: 'عائلة أبو حسين',
        groomName: 'أحمد',
        brideName: 'سارة',
        link: 'https://hadreen.test/i/a?g=x',
      }),
    ).toBe('أهلاً عائلة أبو حسين، يسعدنا دعوتكم لحفل زفاف أحمد وسارة. افتحوا الدعوة: https://hadreen.test/i/a?g=x');
  });
});

describe('places', () => {
  it('finds cities by id or name and parses coordinates', () => {
    expect(findCity('إسطنبول')?.id).toBe('istanbul');
    expect(findCity('istanbul')?.en).toBe('Istanbul');
    expect(findCity('Stockholm')?.ar).toBe('ستوكهولم');
    expect(parseLatLon('٣٣.٣، ٤٤.٤')).toEqual({ lat: 33.3, lon: 44.4 });
    expect(parseLatLon('200, 10')).toBeNull();
  });

  it('falls back to a maps search for the venue', () => {
    expect(venueMapsUrl({ mapsUrl: '', venueName: 'قاعة', venueArea: 'بغداد' })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('قاعة، بغداد')}`,
    );
    expect(venueMapsUrl({ mapsUrl: 'https://maps.app.goo.gl/x', venueName: '', venueArea: '' })).toBe(
      'https://maps.app.goo.gl/x',
    );
  });
});
