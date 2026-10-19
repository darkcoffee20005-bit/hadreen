import { WEDDING_TIME_ZONE } from '@/lib/date/tz';
import { icsDate } from '@/lib/ics';

export function googleCalendarUrl(event: {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${icsDate(event.start)}/${icsDate(event.end)}`,
    ctz: WEDDING_TIME_ZONE,
  });
  if (event.details) params.set('details', event.details);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
