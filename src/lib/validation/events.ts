import { z } from 'zod';
import { SLUG_RE, TOKEN_RE } from './patterns';

/** Events the browser may send. `rsvp` is recorded by the server when an RSVP is saved. */
export const CLIENT_EVENT_TYPES = ['opened', 'intro_completed', 'calendar', 'map'] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export const eventsInputSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  token: z.string().regex(TOKEN_RE).optional(),
  events: z
    .array(z.object({ type: z.enum(CLIENT_EVENT_TYPES) }))
    .min(1)
    .max(20),
});

export type EventsInput = z.infer<typeof eventsInputSchema>;

/** Link-preview fetchers, crawlers and headless browsers never count as guests opening a link. */
const NON_GUEST_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegrambot|headless|lighthouse/i;

export function isNonGuestAgent(userAgent: string | null | undefined): boolean {
  return !userAgent || NON_GUEST_UA.test(userAgent);
}
