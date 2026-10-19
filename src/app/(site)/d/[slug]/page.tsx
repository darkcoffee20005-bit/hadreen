import type { Metadata } from 'next';
import { loadDashboard } from '@/lib/dashboard';
import { daysUntil, formatWeddingDate, formatWeddingTime } from '@/lib/date/format';
import { siteUrl } from '@/lib/env';
import { dashboardUrl } from '@/lib/links';
import { coupleSecretFromCookie } from '@/lib/session';
import { SLUG_RE } from '@/lib/validation/patterns';
import { toPublicWedding, weddingForCouple, withLiveDates } from '@/lib/weddings';
import { Dashboard } from './Dashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'لوحة العروسين', robots: { index: false, follow: false } };

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const secret = await coupleSecretFromCookie();
  const row = SLUG_RE.test(slug) ? await weddingForCouple(slug, secret) : null;

  if (!row || !secret) {
    return (
      <main className="grid min-h-svh place-items-center p-8 text-center">
        <div>
          <p className="font-display text-5xl leading-display text-gold-ink">حاضرين</p>
          <h1 className="mt-4 text-xl font-medium">الرابط غير صالح</h1>
          <p className="mt-2 text-ink-soft">افتحوا لوحة العروسين من الرابط الكامل اللي وصلكم.</p>
        </div>
      </main>
    );
  }

  const wedding = withLiveDates(toPublicWedding(row));
  const { guests, totals } = await loadDashboard(row.id);
  const date = new Date(wedding.dateTimeUtc);

  return (
    <Dashboard
      wedding={{
        slug: wedding.slug,
        lang: wedding.lang,
        groomName: wedding.groomName,
        brideName: wedding.brideName,
        dateLine: `${formatWeddingDate(date, 'ar')} · ${formatWeddingTime(date, 'ar')}`,
        daysLeft: daysUntil(date, new Date()),
        isDemo: wedding.isDemo,
        live: wedding.status === 'live',
      }}
      guests={guests}
      totals={totals}
      baseUrl={siteUrl()}
      dashboardLink={dashboardUrl(siteUrl(), slug, secret)}
    />
  );
}
