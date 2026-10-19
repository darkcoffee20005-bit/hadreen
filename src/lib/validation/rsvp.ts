import { z } from 'zod';
import { CLIENT_KEY_RE, SLUG_RE, TOKEN_RE } from './patterns';

export const RSVP_MESSAGE_MAX = 500;
export const RSVP_NAME_MAX = 60;

export const rsvpInputSchema = z
  .object({
    slug: z.string().regex(SLUG_RE),
    token: z.string().regex(TOKEN_RE).optional(),
    clientKey: z.string().regex(CLIENT_KEY_RE).optional(),
    name: z.string().trim().min(2).max(RSVP_NAME_MAX).optional(),
    attending: z.boolean(),
    seats: z.number().int().min(0).max(50),
    message: z.string().trim().max(RSVP_MESSAGE_MAX).default(''),
  })
  .superRefine((v, ctx) => {
    if (!v.token) {
      // Generic link: the guest types a name, and the browser's key keeps later edits on one record.
      if (!v.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'NAME_REQUIRED' });
      if (!v.clientKey) ctx.addIssue({ code: 'custom', path: ['clientKey'], message: 'CLIENT_KEY_REQUIRED' });
    }
    if (v.attending && v.seats < 1) ctx.addIssue({ code: 'custom', path: ['seats'], message: 'SEATS_MIN' });
  });

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export type RsvpErrorCode =
  | 'INVALID_INPUT'
  | 'NAME_REQUIRED'
  | 'SEATS_MIN'
  | 'SEATS_MAX'
  | 'DEADLINE_PASSED'
  | 'INVALID_LINK'
  | 'OPEN_RSVP_CLOSED'
  | 'RATE_LIMITED';

export type SeatCheck = { ok: true; seats: number } | { ok: false; error: 'SEATS_MIN' | 'SEATS_MAX' };

/** Declining always stores 0 seats; attending needs 1..maxSeats. */
export function checkSeats(attending: boolean, seats: number, maxSeats: number): SeatCheck {
  if (!attending) return { ok: true, seats: 0 };
  if (seats < 1) return { ok: false, error: 'SEATS_MIN' };
  if (seats > maxSeats) return { ok: false, error: 'SEATS_MAX' };
  return { ok: true, seats };
}

export function rsvpOpen(deadline: Date, now: Date): boolean {
  return now.getTime() <= deadline.getTime();
}
