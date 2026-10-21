import { notFound } from 'next/navigation';
import { customAlphabet } from 'nanoid';
import { db } from '@/lib/db';
import { toLocalInputValue } from '@/lib/date/tz';
import { siteUrl } from '@/lib/env';
import { dashboardUrl } from '@/lib/links';
import { readOverrides } from '@/lib/palette';
import { readDressCode, readSchedule, type WeddingFormInput } from '@/lib/validation/wedding';
import { getTemplate, isTemplateId } from '@/templates';
import { WeddingEditor } from './WeddingEditor';

const shortSlug = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 8);
const DAY = 86_400_000;

function blankForm(): WeddingFormInput {
  const date = new Date(Date.now() + 60 * DAY);
  date.setUTCHours(17, 0, 0, 0); // 20:00 Baghdad
  const template = getTemplate('royal-gold');
  return {
    slug: shortSlug(),
    template: template.id,
    lang: 'ar',
    groomName: '',
    brideName: '',
    monogram: '',
    dateLocal: toLocalInputValue(date),
    verse: '',
    intro: '',
    venueName: '',
    venueArea: 'بغداد',
    mapsUrl: '',
    dressCode: { label: '', swatches: [], ladies: '', gentlemen: '' },
    notes: '',
    rsvpDeadlineLocal: toLocalInputValue(new Date(date.getTime() - 7 * DAY)),
    schedule: [],
    musicTrack: template.music.placeholder,
    paletteOverrides: {},
    originCity: '',
    destinationCity: '',
    status: 'draft',
    openRsvpMaxSeats: 2,
  };
}

export default async function EditWeddingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const justCreated = (await searchParams).saved === '1';
  if (id === 'new') return <WeddingEditor id={null} initial={blankForm()} guestCount={0} dashboardLink={null} />;

  const w = await db().wedding.findUnique({ where: { id }, include: { _count: { select: { guests: true } } } });
  if (!w) notFound();

  const initial: WeddingFormInput = {
    slug: w.slug,
    template: isTemplateId(w.template) ? w.template : 'royal-gold',
    lang: w.lang,
    groomName: w.groomName,
    brideName: w.brideName,
    monogram: w.monogram,
    dateLocal: toLocalInputValue(w.dateTimeUtc),
    verse: w.verse ?? '',
    intro: w.intro,
    venueName: w.venueName,
    venueArea: w.venueArea,
    mapsUrl: w.mapsUrl,
    dressCode: readDressCode(w.dressCode),
    notes: w.notes,
    rsvpDeadlineLocal: toLocalInputValue(w.rsvpDeadline),
    schedule: readSchedule(w.schedule),
    musicTrack: w.musicTrack,
    paletteOverrides: readOverrides(w.paletteOverrides),
    originCity: w.originCity ?? '',
    destinationCity: w.destinationCity ?? '',
    status: w.status,
    openRsvpMaxSeats: w.openRsvpMaxSeats,
  };
  return (
    <WeddingEditor
      id={w.id}
      initial={initial}
      guestCount={w._count.guests}
      dashboardLink={dashboardUrl(siteUrl(), w.slug, w.coupleSecret)}
      pin={w.couplePin}
      justCreated={justCreated}
    />
  );
}
