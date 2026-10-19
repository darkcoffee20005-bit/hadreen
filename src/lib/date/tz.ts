import { toWesternDigits } from './numerals';

/** Weddings are stored in UTC and always displayed in Baghdad time. */
export const WEDDING_TIME_ZONE = 'Asia/Baghdad';

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // Only numbers are read from Intl; every visible word comes from our own tables.
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function zonedParts(date: Date, timeZone = WEDDING_TIME_ZONE): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Wall-clock time in `timeZone` → the UTC instant. Two passes settle DST edges. */
export function zonedToUtc(local: WallClock, timeZone = WEDDING_TIME_ZONE): Date {
  const target = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += target - seen;
  }
  return new Date(guess);
}

/** "2026-12-10T20:00" read as Baghdad wall-clock time (the value of <input type="datetime-local">). */
export function parseLocalDateTime(value: string, timeZone = WEDDING_TIME_ZONE): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(toWesternDigits(value.trim()));
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1) return null; // e.g. 31 / 02
  return zonedToUtc({ year, month, day, hour, minute }, timeZone);
}

/** Date → "2026-12-10T20:00" in Baghdad time, for <input type="datetime-local">. */
export function toLocalInputValue(date: Date, timeZone = WEDDING_TIME_ZONE): string {
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
