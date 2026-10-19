import { formatScheduleTime } from '@/lib/date/format';
import { inviteDict } from '@/lib/i18n';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/links';
import { dirOf } from '@/lib/lang';
import { paletteCssVars } from '@/lib/palette';
import type { InviteView } from '@/lib/invite/view';
import { Countdown } from './Countdown';
import { InviteTracker } from './InviteTracker';
import { Ornament, Section } from './parts';
import { RsvpCard } from './RsvpCard';
import { VenueActions } from './VenueActions';

/**
 * The invitation's readable content. Always in the DOM: in Phase 2 the 3D stage plays behind
 * and before it, but every word a guest needs is here.
 */
export function InviteContent({ view }: { view: InviteView }) {
  const { wedding: w, guest, template } = view;
  const t = inviteDict(w.lang);
  const ribbon = w.isDemo ? t.demoRibbon : view.draft ? t.draftRibbon : null;
  const dress = w.dressCode;
  const hasDress = dress.label || dress.ladies || dress.gentlemen || dress.swatches.length > 0;

  return (
    <div
      dir={dirOf(w.lang)}
      lang={w.lang}
      style={paletteCssVars(view.palette) as React.CSSProperties}
      className={`invite-lang-${w.lang} min-h-svh bg-inv-bg font-inv-ui text-inv-ink`}
      data-template={template.id}
    >
      {!view.preview && <InviteTracker slug={w.slug} token={guest?.token ?? null} />}
      <a href="#details" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-inv-surface focus:px-4 focus:py-2">
        {t.skipToContent}
      </a>

      {ribbon && (
        <p className="sticky top-0 z-40 bg-inv-band px-4 py-2 text-center text-xs text-inv-on-band">{ribbon}</p>
      )}

      <header className="relative flex min-h-svh flex-col items-center justify-center px-8 py-20 text-center">
        <div className="gold-frame pointer-events-none absolute inset-3 rounded-[2rem]" aria-hidden="true" />
        <p className="text-lg text-inv-gold-ink">{guest ? t.greetingGuest(guest.displayName) : t.greetingGeneric}</p>
        <Ornament className="my-6" />
        <p className="font-inv-serif text-lg text-inv-ink-soft">{t.invitationLead}</p>
        <h1 className="mt-4 font-inv-display text-[clamp(3.2rem,15vw,5.75rem)] leading-display text-inv-gold-ink">
          <span className="block">{w.groomName}</span>
          <span className="block font-inv-serif text-[0.4em] leading-normal text-inv-ink-soft">{t.and}</span>
          <span className="block">{w.brideName}</span>
        </h1>
        <Ornament className="my-6" />
        <p className="font-inv-serif text-xl text-inv-ink">{view.dateLine}</p>
        <p className="mt-2 text-inv-ink-soft">
          {view.timeLine} · {w.venueName}
        </p>
        <a
          href="#details"
          className="mt-12 rounded-full bg-inv-accent px-8 py-3.5 font-medium text-inv-on-accent shadow-lg shadow-black/10 transition hover:opacity-90"
        >
          {t.openInvitation}
        </a>
      </header>

      <main id="details">
        {(w.verse || w.intro) && (
          <Section className="text-center">
            {w.verse && <p className="font-inv-serif text-xl leading-loose text-inv-gold-ink">{w.verse}</p>}
            {w.verse && w.intro && <Ornament className="my-8" />}
            {w.intro && <p className="text-lg leading-loose whitespace-pre-line text-inv-ink">{w.intro}</p>}
          </Section>
        )}

        <Countdown target={w.dateTimeUtc} nowIso={view.nowIso} lang={w.lang} />

        {w.schedule.length > 0 && (
          <Section id="programme" title={t.programme}>
            <ol className="relative mx-auto max-w-sm space-y-8 border-s border-inv-gold/60 ps-8">
              {w.schedule.map((item, i) => (
                <li key={`${item.time}-${i}`} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -start-[2.3rem] top-1.5 size-3 rotate-45 border border-inv-gold bg-inv-bg"
                  />
                  <p className="text-sm text-inv-gold-ink">{formatScheduleTime(item.time, w.lang)}</p>
                  <p className="font-inv-serif text-xl text-inv-ink">{item.title}</p>
                  {item.subtitle && <p className="text-inv-ink-soft">{item.subtitle}</p>}
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section id="venue" title={t.venue.title}>
          <div className="gold-frame rounded-[2rem] border border-inv-line bg-inv-surface px-6 py-10 text-center">
            <div className="relative">
              <p className="font-inv-serif text-2xl text-inv-ink">{w.venueName}</p>
              {w.venueArea && <p className="mt-1 text-inv-ink-soft">{w.venueArea}</p>}
              <p className="mt-4 text-inv-gold-ink">
                {view.dateLine} · {view.timeLine}
              </p>
              <VenueActions {...view.links} labels={t.venue} />
            </div>
          </div>
        </Section>

        {hasDress && (
          <Section id="dress" title={t.dressCode.title} className="text-center">
            {dress.label && <p className="font-inv-serif text-xl text-inv-ink">{dress.label}</p>}
            {dress.swatches.length > 0 && (
              <ul className="mt-5 flex justify-center gap-3" aria-hidden="true">
                {dress.swatches.map((hex) => (
                  <li key={hex} className="size-10 rounded-full border border-inv-line shadow-inner" style={{ background: hex }} />
                ))}
              </ul>
            )}
            {(dress.ladies || dress.gentlemen) && (
              <dl className="mt-8 grid gap-4 text-start sm:grid-cols-2">
                {dress.ladies && (
                  <div className="rounded-2xl border border-inv-line bg-inv-surface p-4">
                    <dt className="text-sm text-inv-gold-ink">{t.dressCode.ladies}</dt>
                    <dd className="mt-1 text-inv-ink">{dress.ladies}</dd>
                  </div>
                )}
                {dress.gentlemen && (
                  <div className="rounded-2xl border border-inv-line bg-inv-surface p-4">
                    <dt className="text-sm text-inv-gold-ink">{t.dressCode.gentlemen}</dt>
                    <dd className="mt-1 text-inv-ink">{dress.gentlemen}</dd>
                  </div>
                )}
              </dl>
            )}
          </Section>
        )}

        {w.notes && (
          <Section id="notes" title={t.notes} className="text-center">
            <p className="leading-loose whitespace-pre-line text-inv-ink">{w.notes}</p>
          </Section>
        )}

        <Section id="rsvp" title={t.rsvp.title}>
          <RsvpCard
            slug={w.slug}
            lang={w.lang}
            guest={guest}
            openRsvpMaxSeats={w.openRsvpMaxSeats}
            closed={view.rsvpClosed}
            deadlineLine={view.deadlineLine}
            preview={view.preview}
          />
        </Section>

        <Section className="text-center">
          <p className="font-inv-display text-4xl leading-display text-inv-gold-ink">
            {w.lang === 'ar' ? template.closingAr : template.closingEn}
          </p>
        </Section>
      </main>

      <footer className="border-t border-inv-line px-6 py-8 text-center text-sm text-inv-ink-soft">
        {t.footer.text}{' '}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-medium text-inv-gold-ink underline-offset-4 hover:underline">
          @{INSTAGRAM_HANDLE}
        </a>
      </footer>
    </div>
  );
}
