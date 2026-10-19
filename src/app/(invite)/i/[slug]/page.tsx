import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InviteContent } from '@/lib/invite/content/InviteContent';
import { InviteShell } from '@/lib/invite/shell/InviteShell';
import { buildInviteView } from '@/lib/invite/view';
import { isAdmin } from '@/lib/session';
import { SLUG_RE, TOKEN_RE } from '@/lib/validation/patterns';
import { getPublicWedding } from '@/lib/wedding-cache';
import { loadInviteGuest } from '@/lib/weddings';
import { formatWeddingDate } from '@/lib/date/format';
import { labEnabled, siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ g?: string | string[]; lab?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const w = SLUG_RE.test(slug) ? await getPublicWedding(slug) : null;
  if (!w) return { robots: { index: false } };
  const date = formatWeddingDate(new Date(w.dateTimeUtc), w.lang);
  const title =
    w.lang === 'ar' ? `دعوة زفاف ${w.groomName} و${w.brideName}` : `${w.groomName} & ${w.brideName} | Wedding invitation`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { absolute: title },
    description: date,
    // Personal invitations stay out of search engines; demos are part of the showcase.
    robots: w.isDemo && w.status === 'live' ? undefined : { index: false, follow: false },
    openGraph: { title, description: date, type: 'website', locale: w.lang === 'ar' ? 'ar_IQ' : 'en_US' },
  };
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { g, lab } = await searchParams;
  if (!SLUG_RE.test(slug)) notFound();

  const wedding = await getPublicWedding(slug);
  if (!wedding) notFound();
  if (wedding.status === 'draft' && !(await isAdmin())) notFound();

  const token = typeof g === 'string' && TOKEN_RE.test(g) ? g : null;
  // A token from another wedding (or a typo) quietly falls back to the generic greeting.
  const guest = token ? await loadInviteGuest(wedding.slug, token) : null;

  const view = buildInviteView(wedding, guest);
  return (
    <InviteShell view={view} lab={lab === '1' && labEnabled()}>
      <InviteContent view={view} stage />
    </InviteShell>
  );
}
