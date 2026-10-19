import { toCsv } from '@/lib/csv';
import { loadDashboard } from '@/lib/dashboard';
import { zonedParts } from '@/lib/date/tz';
import { siteUrl } from '@/lib/env';
import { inviteUrl } from '@/lib/links';
import { coupleSecretFromCookie } from '@/lib/session';
import { SLUG_RE } from '@/lib/validation/patterns';
import type { GuestStatus } from '@/lib/wedding-types';
import { weddingForCouple } from '@/lib/weddings';

const STATUS: Record<GuestStatus, string> = {
  attending: 'حاضرين',
  declined: 'معتذرين',
  opened: 'فتحوا وما ردّوا',
  pending: 'بلا رد',
};

/** Baghdad time as "2026-12-10 20:00": Western digits so spreadsheets can sort it. */
function stamp(iso: string | null): string {
  if (!iso) return '';
  const p = zonedParts(new Date(iso));
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wedding = SLUG_RE.test(slug) ? await weddingForCouple(slug, await coupleSecretFromCookie()) : null;
  if (!wedding) return new Response('Unauthorized', { status: 401 });

  const { guests } = await loadDashboard(wedding.id);
  const csv = toCsv([
    ['الاسم', 'المجموعة', 'المقاعد المسموحة', 'الحالة', 'المقاعد المؤكدة', 'الرسالة', 'آخر فتح', 'تاريخ الرد', 'الرابط'],
    ...guests.map((g) => [
      g.displayName,
      g.group,
      g.maxSeats,
      STATUS[g.status],
      g.status === 'attending' ? g.seats : 0,
      g.message,
      stamp(g.lastOpenedAt),
      stamp(g.respondedAt),
      inviteUrl(siteUrl(), slug, g.token),
    ]),
  ]);

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="hadreen-${slug}-guests.csv"`,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}
