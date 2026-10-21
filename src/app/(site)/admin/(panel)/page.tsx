import Link from 'next/link';
import { db } from '@/lib/db';
import { formatShortDateTime } from '@/lib/date/format';
import { toEasternDigits } from '@/lib/date/numerals';
import { siteUrl } from '@/lib/env';
import { dashboardUrl, inviteUrl } from '@/lib/links';
import { ui } from '@/components/ui';
import { getTemplate } from '@/templates';
import { WeddingRowActions } from './WeddingRowActions';

export default async function AdminHome() {
  const weddings = await db().wedding.findMany({
    orderBy: [{ isDemo: 'asc' }, { dateTimeUtc: 'asc' }],
    include: { _count: { select: { guests: true } }, guests: { select: { rsvp: { select: { attending: true, seats: true } } } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-ink">الأعراس</h1>
        <Link href="/admin/weddings/new" className={ui.primary}>
          + عرس جديد
        </Link>
      </div>

      <ul className="mt-6 space-y-3">
        {weddings.map((w) => {
          const seats = w.guests.reduce((s, g) => s + (g.rsvp?.attending ? g.rsvp.seats : 0), 0);
          const answered = w.guests.filter((g) => g.rsvp).length;
          return (
            <li key={w.id} className={`${ui.card} flex flex-wrap items-center gap-x-6 gap-y-3 p-5`}>
              <div className="min-w-0 flex-1 basis-60">
                <p className="font-serif text-xl text-ink">
                  {w.groomName} و{w.brideName}
                  {w.isDemo && <span className="ms-2 rounded-full bg-ivory px-2 py-0.5 text-xs text-ink-soft">تجريبي</span>}
                </p>
                <p className="text-sm text-ink-soft">
                  {getTemplate(w.template).nameAr} · {formatShortDateTime(w.dateTimeUtc, 'ar')}
                </p>
                <p className="mt-1 text-xs text-ink-soft" dir="ltr">
                  /i/{w.slug}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${w.status === 'live' ? 'bg-emerald text-ivory' : 'bg-[#f6ecd6] text-gold-ink'}`}
              >
                {w.status === 'live' ? 'منشورة' : 'مسودة'}
              </span>
              <p className="text-sm text-ink-soft">
                {toEasternDigits(w._count.guests)} ضيف · {toEasternDigits(answered)} رد · {toEasternDigits(seats)} مقعد
              </p>
              <WeddingRowActions
                id={w.id}
                status={w.status}
                inviteLink={inviteUrl(siteUrl(), w.slug)}
                dashboardLink={dashboardUrl(siteUrl(), w.slug, w.coupleSecret)}
                pin={w.couplePin}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
