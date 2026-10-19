import type { Lang } from '@/lib/lang';
import { localizeDigits } from './numerals';
import { WEDDING_TIME_ZONE, zonedParts } from './tz';

// Gregorian month names only. Never Intl's Arabic month names: ar-IQ returns Syriac names
// ("كانون الأول"), which the brand rules forbid.
export const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

export const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export interface WeddingDateParts {
  weekday: string;
  day: string;
  month: string; // month number
  monthName: string;
  year: string;
}

export function weddingDateParts(date: Date, lang: Lang): WeddingDateParts {
  const p = zonedParts(date, WEDDING_TIME_ZONE);
  return {
    weekday: (lang === 'ar' ? WEEKDAYS_AR : WEEKDAYS_EN)[p.weekday]!,
    day: localizeDigits(p.day, lang),
    month: localizeDigits(p.month, lang),
    monthName: (lang === 'ar' ? MONTHS_AR : MONTHS_EN)[p.month - 1]!,
    year: localizeDigits(p.year, lang),
  };
}

/** "الخميس ١٠ / ١٢ (ديسمبر) ٢٠٢٦" · "Thursday 10 / 12 (December) 2026" */
export function formatWeddingDate(date: Date, lang: Lang = 'ar'): string {
  const d = weddingDateParts(date, lang);
  return `${d.weekday} ${d.day} / ${d.month} (${d.monthName}) ${d.year}`;
}

function arabicDayPeriod(hour: number): string {
  if (hour < 12) return 'صباحًا';
  if (hour < 15) return 'ظهرًا';
  if (hour < 18) return 'عصرًا';
  return 'مساءً';
}

/** "٨:٠٠ مساءً" · "8:00 PM" */
export function formatWeddingTime(date: Date, lang: Lang = 'ar'): string {
  const { hour, minute } = zonedParts(date, WEDDING_TIME_ZONE);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const clock = `${h12}:${String(minute).padStart(2, '0')}`;
  if (lang === 'en') return `${clock} ${hour < 12 ? 'AM' : 'PM'}`;
  return `${localizeDigits(clock, 'ar')} ${arabicDayPeriod(hour)}`;
}

/** "١٠ / ١٢ / ٢٠٢٦ · ٨:٠٠ مساءً", for tables and dashboards. */
export function formatShortDateTime(date: Date, lang: Lang = 'ar'): string {
  const p = zonedParts(date, WEDDING_TIME_ZONE);
  return `${localizeDigits(`${p.day} / ${p.month} / ${p.year}`, lang)} · ${formatWeddingTime(date, lang)}`;
}

/** "HH:mm" from the schedule → "٧:٣٠ مساءً". Returns the input untouched if it isn't a time. */
export function formatScheduleTime(value: string, lang: Lang = 'ar'): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const clock = `${h12}:${match[2]}`;
  if (lang === 'en') return `${clock} ${hour < 12 ? 'AM' : 'PM'}`;
  return `${localizeDigits(clock, 'ar')} ${arabicDayPeriod(hour)}`;
}

/** Calendar days from `now` to `date`, counted in Baghdad. 0 on the day itself, negative after. */
export function daysUntil(date: Date, now: Date): number {
  const a = zonedParts(now, WEDDING_TIME_ZONE);
  const b = zonedParts(date, WEDDING_TIME_ZONE);
  const dayA = Date.UTC(a.year, a.month - 1, a.day);
  const dayB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((dayB - dayA) / 86_400_000);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function countdownParts(target: Date, now: Date): CountdownParts {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: ms === 0,
  };
}
