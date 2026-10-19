import { formatWeddingDate, formatWeddingTime, formatShortDateTime } from '@/lib/date/format';
import { googleCalendarUrl } from '@/lib/gcal';
import { DEFAULT_EVENT_HOURS } from '@/lib/ics';
import { calendarIcsPath, venueMapsUrl } from '@/lib/links';
import { resolvePalette } from '@/lib/palette';
import type { InviteGuest, PublicWedding } from '@/lib/wedding-types';
import { getTemplate } from '@/templates';
import type { PaletteTokens, TemplateMeta } from './types';

/** Everything the invitation content needs, computed once (server page or admin preview). */
export interface InviteView {
  wedding: PublicWedding;
  guest: InviteGuest | null;
  template: TemplateMeta;
  palette: PaletteTokens;
  dateLine: string;
  timeLine: string;
  deadlineLine: string;
  rsvpClosed: boolean;
  links: { maps: string; ics: string; google: string };
  nowIso: string;
  draft: boolean;
  preview: boolean;
}

export function buildInviteView(
  wedding: PublicWedding,
  guest: InviteGuest | null,
  options: { now?: Date; preview?: boolean } = {},
): InviteView {
  const now = options.now ?? new Date();
  const template = getTemplate(wedding.template);
  const start = new Date(wedding.dateTimeUtc);
  const end = new Date(start.getTime() + DEFAULT_EVENT_HOURS * 3600_000);
  const deadline = new Date(wedding.rsvpDeadline);
  const title =
    wedding.lang === 'ar'
      ? `زفاف ${wedding.groomName} و${wedding.brideName}`
      : `${wedding.groomName} & ${wedding.brideName} wedding`;
  return {
    wedding,
    guest,
    template,
    palette: resolvePalette(template, wedding.paletteOverrides),
    dateLine: formatWeddingDate(start, wedding.lang),
    timeLine: formatWeddingTime(start, wedding.lang),
    deadlineLine: formatShortDateTime(deadline, wedding.lang),
    rsvpClosed: now.getTime() > deadline.getTime(),
    links: {
      maps: venueMapsUrl(wedding),
      ics: calendarIcsPath(wedding.slug),
      google: googleCalendarUrl({
        title,
        start,
        end,
        location: [wedding.venueName, wedding.venueArea].filter(Boolean).join('، '),
      }),
    },
    nowIso: now.toISOString(),
    draft: wedding.status === 'draft',
    preview: options.preview ?? false,
  };
}
