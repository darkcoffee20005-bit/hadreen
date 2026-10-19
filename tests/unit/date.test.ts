import { describe, expect, it } from 'vitest';
import {
  countdownParts,
  daysUntil,
  formatScheduleTime,
  formatShortDateTime,
  formatWeddingDate,
  formatWeddingTime,
  MONTHS_AR,
  weddingDateParts,
} from '@/lib/date/format';
import { localizeDigits, toEasternDigits, toWesternDigits } from '@/lib/date/numerals';
import { parseLocalDateTime, toLocalInputValue, zonedToUtc } from '@/lib/date/tz';

const SYRIAC_MONTHS = ['كانون', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين'];

describe('numerals', () => {
  it('converts to Eastern Arabic digits and back', () => {
    expect(toEasternDigits(2026)).toBe('٢٠٢٦');
    expect(toEasternDigits('19:30')).toBe('١٩:٣٠');
    expect(toWesternDigits('٤٩ ألف')).toBe('49 ألف');
    expect(toWesternDigits('۱۲')).toBe('12'); // Persian digits
    expect(localizeDigits(7, 'en')).toBe('7');
    expect(localizeDigits(7, 'ar')).toBe('٧');
  });
});

describe('formatWeddingDate', () => {
  it('matches the brand example exactly', () => {
    const date = new Date('2026-12-10T17:00:00Z'); // 20:00 in Baghdad
    expect(formatWeddingDate(date, 'ar')).toBe('الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦');
    expect(formatWeddingTime(date, 'ar')).toBe('٨:٠٠ مساءً');
  });

  it('uses the Baghdad calendar day, not the UTC day', () => {
    const date = new Date('2026-12-10T22:30:00Z'); // 01:30 on Friday in Baghdad
    expect(formatWeddingDate(date, 'ar')).toBe('الجمعة ١١ / ١٢ (ديسمبر) ٢٠٢٦');
    expect(formatWeddingTime(date, 'ar')).toBe('١:٣٠ صباحًا');
  });

  it('never uses Syriac month names', () => {
    for (let month = 0; month < 12; month++) {
      const text = formatWeddingDate(new Date(Date.UTC(2027, month, 15, 12)), 'ar');
      expect(text).toContain(`(${MONTHS_AR[month]})`);
      for (const syriac of SYRIAC_MONTHS) expect(text).not.toContain(syriac);
    }
  });

  it('formats English weddings with Western digits', () => {
    const date = new Date('2026-12-10T17:00:00Z');
    expect(formatWeddingDate(date, 'en')).toBe('Thursday 10 / 12 (December) 2026');
    expect(formatWeddingTime(date, 'en')).toBe('8:00 PM');
  });

  it('exposes the parts used by scratch tiles', () => {
    expect(weddingDateParts(new Date('2027-03-04T16:00:00Z'), 'ar')).toEqual({
      weekday: 'الخميس',
      day: '٤',
      month: '٣',
      monthName: 'مارس',
      year: '٢٠٢٧',
    });
  });

  it('labels the time of day', () => {
    expect(formatWeddingTime(new Date('2026-12-10T09:00:00Z'), 'ar')).toBe('١٢:٠٠ ظهرًا');
    expect(formatWeddingTime(new Date('2026-12-10T13:30:00Z'), 'ar')).toBe('٤:٣٠ عصرًا');
    expect(formatScheduleTime('19:30', 'ar')).toBe('٧:٣٠ مساءً');
    expect(formatScheduleTime('09:05', 'en')).toBe('9:05 AM');
  });

  it('formats short date-times for tables', () => {
    expect(formatShortDateTime(new Date('2026-12-10T17:00:00Z'), 'ar')).toBe('١٠ / ١٢ / ٢٠٢٦ · ٨:٠٠ مساءً');
  });
});

describe('Baghdad wall-clock conversion', () => {
  it('turns datetime-local input into UTC', () => {
    expect(parseLocalDateTime('2026-12-10T20:00')?.toISOString()).toBe('2026-12-10T17:00:00.000Z');
    expect(parseLocalDateTime('٢٠٢٦-١٢-١٠T20:00')?.toISOString()).toBe('2026-12-10T17:00:00.000Z');
    expect(zonedToUtc({ year: 2027, month: 1, day: 1, hour: 0, minute: 0 }).toISOString()).toBe(
      '2026-12-31T21:00:00.000Z',
    );
  });

  it('rejects impossible dates', () => {
    expect(parseLocalDateTime('2026-02-31T20:00')).toBeNull();
    expect(parseLocalDateTime('2026-12-10 20:00')).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  });

  it('round-trips through the input value', () => {
    const date = new Date('2026-12-10T17:45:00Z');
    expect(toLocalInputValue(date)).toBe('2026-12-10T20:45');
    expect(parseLocalDateTime(toLocalInputValue(date))?.getTime()).toBe(date.getTime());
  });
});

describe('countdown', () => {
  it('counts calendar days in Baghdad', () => {
    const now = new Date('2026-12-09T20:59:00Z'); // 23:59 on the 9th in Baghdad
    expect(daysUntil(new Date('2026-12-10T17:00:00Z'), now)).toBe(1);
    expect(daysUntil(new Date('2026-12-10T17:00:00Z'), new Date('2026-12-09T21:01:00Z'))).toBe(0);
  });

  it('splits the remaining time and stops at zero', () => {
    const target = new Date('2026-12-10T17:00:00Z');
    expect(countdownParts(target, new Date('2026-12-08T15:58:30Z'))).toEqual({
      days: 2,
      hours: 1,
      minutes: 1,
      seconds: 30,
      done: false,
    });
    expect(countdownParts(target, new Date('2027-01-01T00:00:00Z')).done).toBe(true);
  });
});
