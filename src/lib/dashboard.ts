import 'server-only';
import { db } from '@/lib/db';
import type { DashboardGuest, DashboardTotals, GuestStatus } from '@/lib/wedding-types';

export function computeTotals(guests: DashboardGuest[]): DashboardTotals {
  const invited = guests.filter((g) => g.source === 'invited');
  return {
    invitedHouseholds: invited.length,
    confirmedSeats: guests.reduce((sum, g) => sum + (g.status === 'attending' ? g.seats : 0), 0),
    attendingHouseholds: guests.filter((g) => g.status === 'attending').length,
    declined: guests.filter((g) => g.status === 'declined').length,
    noReply: invited.filter((g) => g.status === 'pending' || g.status === 'opened').length,
    openedNoReply: guests.filter((g) => g.status === 'opened').length,
  };
}

export async function loadDashboard(weddingId: string): Promise<{ guests: DashboardGuest[]; totals: DashboardTotals }> {
  const prisma = db();
  const [guests, opens] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId }, include: { rsvp: true }, orderBy: { createdAt: 'asc' } }),
    prisma.event.groupBy({
      by: ['guestId'],
      where: { weddingId, type: 'opened', guestId: { not: null } },
      _max: { createdAt: true },
    }),
  ]);
  const lastOpened = new Map(opens.map((o) => [o.guestId, o._max.createdAt]));

  const rows: DashboardGuest[] = guests.map((g) => {
    const opened = lastOpened.get(g.id) ?? null;
    const status: GuestStatus = g.rsvp ? (g.rsvp.attending ? 'attending' : 'declined') : opened ? 'opened' : 'pending';
    return {
      id: g.id,
      displayName: g.displayName,
      group: g.group ?? '',
      maxSeats: g.maxSeats,
      token: g.token,
      source: g.source,
      status,
      seats: g.rsvp?.seats ?? 0,
      message: g.rsvp?.message ?? '',
      respondedAt: g.rsvp?.updatedAt.toISOString() ?? null,
      lastOpenedAt: opened?.toISOString() ?? null,
    };
  });
  return { guests: rows, totals: computeTotals(rows) };
}
