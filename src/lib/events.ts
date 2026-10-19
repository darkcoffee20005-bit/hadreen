import 'server-only';
import { db } from '@/lib/db';
import { isNonGuestAgent, type EventsInput } from '@/lib/validation/events';

const OPENED_DEDUPE_MS = 30 * 60 * 1000;

/** Stores a batch of beacons. Returns how many events were written. */
export async function recordEvents(input: EventsInput, userAgent: string | null, now = new Date()): Promise<number> {
  if (isNonGuestAgent(userAgent)) return 0;
  const prisma = db();
  const wedding = await prisma.wedding.findUnique({ where: { slug: input.slug }, select: { id: true } });
  if (!wedding) return 0;

  const guest = input.token
    ? await prisma.guest.findFirst({ where: { token: input.token, weddingId: wedding.id }, select: { id: true } })
    : null;

  let types = [...new Set(input.events.map((e) => e.type))];

  // One "opened" per guest per half hour, however often the page is reloaded.
  if (guest && types.includes('opened')) {
    const recent = await prisma.event.findFirst({
      where: { guestId: guest.id, type: 'opened', createdAt: { gte: new Date(now.getTime() - OPENED_DEDUPE_MS) } },
      select: { id: true },
    });
    if (recent) types = types.filter((t) => t !== 'opened');
  }
  if (types.length === 0) return 0;

  const res = await prisma.event.createMany({
    data: types.map((type) => ({
      weddingId: wedding.id,
      guestId: guest?.id ?? null,
      type,
      userAgent: (userAgent ?? '').slice(0, 300),
      createdAt: now,
    })),
  });
  return res.count;
}
