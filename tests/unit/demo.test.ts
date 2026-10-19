import { describe, expect, it } from 'vitest';
import { formatWeddingDate, formatWeddingTime } from '@/lib/date/format';
import { demoSchedule } from '@/lib/demo';

describe('demo schedule', () => {
  it('is a Thursday at 20:00 Baghdad, 45+ days ahead, with RSVP closing a week before', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    const { date, deadline } = demoSchedule(now);
    expect(formatWeddingDate(date, 'ar').startsWith('الخميس')).toBe(true);
    expect(formatWeddingTime(date, 'ar')).toBe('٨:٠٠ مساءً');
    expect(date.getTime() - now.getTime()).toBeGreaterThanOrEqual(45 * 86_400_000 - 86_400_000);
    expect(date.getTime() - deadline.getTime()).toBe(7 * 86_400_000);
  });
});
