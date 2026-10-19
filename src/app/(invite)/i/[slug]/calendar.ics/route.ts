import { siteUrl } from '@/lib/env';
import { buildIcs, DEFAULT_EVENT_HOURS } from '@/lib/ics';
import { inviteUrl } from '@/lib/links';
import { SLUG_RE } from '@/lib/validation/patterns';
import { getPublicWedding } from '@/lib/wedding-cache';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = SLUG_RE.test(slug) ? await getPublicWedding(slug) : null;
  if (!w || w.status !== 'live') return new Response('Not found', { status: 404 });

  const start = new Date(w.dateTimeUtc);
  const link = inviteUrl(siteUrl(), w.slug);
  const ar = w.lang === 'ar';
  const ics = buildIcs({
    uid: `${w.id}@hadreen`,
    start,
    end: new Date(start.getTime() + DEFAULT_EVENT_HOURS * 3600_000),
    summary: ar ? `زفاف ${w.groomName} و${w.brideName}` : `${w.groomName} & ${w.brideName} wedding`,
    location: [w.venueName, w.venueArea].filter(Boolean).join(ar ? '، ' : ', '),
    description: `${ar ? 'الدعوة' : 'Invitation'}: ${link}`,
    url: link,
  });

  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="hadreen-${w.slug}.ics"`,
      'cache-control': 'no-store',
    },
  });
}
