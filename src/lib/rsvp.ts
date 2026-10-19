import 'server-only';
import { db } from '@/lib/db';
import { demoSchedule } from '@/lib/demo';
import { newGuestToken } from '@/lib/tokens';
import { checkSeats, rsvpOpen, type RsvpErrorCode, type RsvpInput } from '@/lib/validation/rsvp';

export type RsvpResult =
  | {
      ok: true;
      token: string;
      guestName: string;
      rsvp: { attending: boolean; seats: number; message: string };
    }
  | { ok: false; status: number; error: RsvpErrorCode };

const fail = (status: number, error: RsvpErrorCode): RsvpResult => ({ ok: false, status, error });

/**
 * Saves a guest's answer. Idempotent: a personal link upserts by guest, and a generic-link
 * RSVP upserts by the browser's key, so retries and edits never create duplicates.
 */
export async function submitRsvp(
  input: RsvpInput,
  options: { now?: Date; userAgent?: string; allowDraft?: boolean } = {},
): Promise<RsvpResult> {
  const now = options.now ?? new Date();
  const prisma = db();
  const wedding = await prisma.wedding.findUnique({
    where: { slug: input.slug },
    select: { id: true, status: true, rsvpDeadline: true, openRsvpMaxSeats: true, isDemo: true },
  });
  if (!wedding || (wedding.status !== 'live' && !options.allowDraft)) return fail(404, 'INVALID_LINK');

  const deadline = wedding.isDemo ? demoSchedule(now).deadline : wedding.rsvpDeadline;
  if (!rsvpOpen(deadline, now)) return fail(409, 'DEADLINE_PASSED');

  let guest = input.token
    ? await prisma.guest.findFirst({ where: { token: input.token, weddingId: wedding.id } })
    : await prisma.guest.findUnique({
        where: { weddingId_clientKey: { weddingId: wedding.id, clientKey: input.clientKey! } },
      });

  if (input.token && !guest) return fail(404, 'INVALID_LINK');
  if (!input.token && wedding.openRsvpMaxSeats < 1) return fail(403, 'OPEN_RSVP_CLOSED');

  const seats = checkSeats(input.attending, input.seats, guest?.maxSeats ?? wedding.openRsvpMaxSeats);
  if (!seats.ok) return fail(422, seats.error);

  if (!input.token) {
    // Generic link: the guest record is keyed by the browser and named by the guest.
    guest = await prisma.guest.upsert({
      where: { weddingId_clientKey: { weddingId: wedding.id, clientKey: input.clientKey! } },
      create: {
        weddingId: wedding.id,
        clientKey: input.clientKey!,
        displayName: input.name!,
        maxSeats: wedding.openRsvpMaxSeats,
        source: 'open',
        token: newGuestToken(),
      },
      update: { displayName: input.name! },
    });
  }
  const g = guest!;

  const data = { attending: input.attending, seats: seats.seats, message: input.message };
  await prisma.$transaction([
    prisma.rsvp.upsert({ where: { guestId: g.id }, create: { guestId: g.id, ...data }, update: data }),
    prisma.event.create({
      data: { weddingId: wedding.id, guestId: g.id, type: 'rsvp', userAgent: (options.userAgent ?? '').slice(0, 300) },
    }),
  ]);

  return { ok: true, token: g.token, guestName: g.displayName, rsvp: data };
}
