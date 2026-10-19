import { zonedParts, zonedToUtc } from '@/lib/date/tz';

const DAY = 86_400_000;

/**
 * Demo weddings always look upcoming: the next Thursday at 20:00 Baghdad time that is at least
 * 45 days away, with RSVP closing a week before. Recomputed on every render.
 */
export function demoSchedule(now: Date): { date: Date; deadline: Date } {
  const p = zonedParts(new Date(now.getTime() + 45 * DAY));
  let day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  while (day.getUTCDay() !== 4) day = new Date(day.getTime() + DAY);
  const date = zonedToUtc({
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    day: day.getUTCDate(),
    hour: 20,
    minute: 0,
  });
  return { date, deadline: new Date(date.getTime() - 7 * DAY) };
}
