import { formatScheduleTime } from '@/lib/date/format';
import { inviteDict } from '@/lib/i18n';
import { dirOf } from '@/lib/lang';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/links';
import { paletteCssVars } from '@/lib/palette';
import type { InviteView } from '@/lib/invite/view';
import '@/templates/content.css';
import { Choreography } from './Choreography';
import { FlipCountdown } from './FlipCountdown';
import { InviteTracker } from './InviteTracker';
import { Ornament } from './parts';
import { RsvpCard } from './RsvpCard';
import { TemplateExtras } from './TemplateExtras';
import { TiltCard } from './TiltCard';
import { VenueActions } from './VenueActions';

/** A content panel: paper on top of the living backdrop, with room for the stage to show between. */
function Panel({ id, title, children, className = '' }: { id?: string; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={title && id ? `${id}-title` : undefined} className="px-4 py-3" data-reveal>
      <div className={`mx-auto max-w-xl rounded-[2rem] bg-[color-mix(in_srgb,var(--c-bg)_95%,transparent)] px-6 py-12 shadow-2xl shadow-black/15 ring-1 ring-inv-line/60 sm:px-10 ${className}`}>
        {title && (
          <header className="mb-8 text-center">
            <h2 id={id ? `${id}-title` : undefined} className="font-inv-serif text-2xl text-inv-gold-ink">
              {title}
            </h2>
            <Ornament className="mt-3" />
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * The invitation's readable content. Always in the DOM: the 3D (or 2D) stage plays behind and
 * before it, but every word a guest needs is here. `stage` = rendered inside the InviteShell,
 * over the living backdrop; without it (admin preview) it paints its own background.
 */
export function InviteContent({ view, stage = false }: { view: InviteView; stage?: boolean }) {
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
      className={`invite-lang-${w.lang} min-h-svh font-inv-ui text-inv-ink ${stage ? '' : 'bg-inv-band'}`}
      data-template={template.id}
    >
      {!view.preview && <InviteTracker slug={w.slug} token={guest?.token ?? null} />}
      <Choreography enabled={stage} />

      {ribbon && (
        <p className="sticky top-0 z-20 bg-black/55 px-4 py-2 text-center text-xs text-white backdrop-blur-sm">{ribbon}</p>
      )}

      <header className="relative flex min-h-svh flex-col items-center justify-center px-8 py-24 text-center text-inv-on-band">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_50%,rgba(0,0,0,0.35),transparent)]" />
        <p className="text-lg text-inv-gold">{guest ? t.greetingGuest(guest.displayName) : t.greetingGeneric}</p>
        <Ornament className="my-6" />
        <p className="font-inv-serif text-lg text-inv-on-band/85">{t.invitationLead}</p>
        <h1 id="invite-hero" tabIndex={-1} className="mt-4 font-inv-display text-[clamp(3.2rem,15vw,5.75rem)] leading-display text-inv-gold outline-none [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
          <span className="block">{w.groomName}</span>
          <span className="block font-inv-serif text-[0.4em] leading-normal text-inv-on-band/80">{t.and}</span>
          <span className="block">{w.brideName}</span>
        </h1>
        <Ornament className="my-6" />
        <p className="font-inv-serif text-xl">{view.dateLine}</p>
        <p className="mt-2 text-inv-on-band/80">
          {view.timeLine} · {w.venueName}
        </p>
        <a
          href="#details"
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-inv-gold/60 px-6 py-3 text-sm text-inv-on-band transition hover:bg-white/10"
        >
          <span aria-hidden="true" className="invite-scroll-cue">↓</span>
          {t.skipToContent}
        </a>
      </header>

      <TemplateExtras view={view} />

      <main id="details" className="pb-10">
        {(w.verse || w.intro) && (
          <Panel className="text-center">
            {w.verse && <p className="font-inv-serif text-xl leading-loose text-inv-gold-ink">{w.verse}</p>}
            {w.verse && w.intro && <Ornament className="my-8" />}
            {w.intro && <p className="text-lg leading-loose whitespace-pre-line text-inv-ink">{w.intro}</p>}
          </Panel>
        )}

        <FlipCountdown target={w.dateTimeUtc} nowIso={view.nowIso} lang={w.lang} />

        {w.schedule.length > 0 && (
          <Panel id="programme" title={t.programme}>
            <div className="relative mx-auto max-w-sm">
              <span aria-hidden="true" className="absolute inset-y-1 start-[0.3rem] w-px bg-inv-line" />
              <span aria-hidden="true" data-draw-line className="absolute inset-y-1 start-[0.3rem] w-px origin-top bg-gradient-to-b from-inv-gold to-inv-gold-ink" />
              <ol className="relative space-y-8 ps-10">
                {w.schedule.map((item, i) => (
                  <li key={`${item.time}-${i}`} className="relative">
                    <span aria-hidden="true" className="absolute -start-[2.15rem] top-1.5 size-3 rotate-45 border border-inv-gold bg-inv-bg" />
                    <p className="text-sm text-inv-gold-ink">{formatScheduleTime(item.time, w.lang)}</p>
                    <p className="font-inv-serif text-xl text-inv-ink">{item.title}</p>
                    {item.subtitle && <p className="text-inv-ink-soft">{item.subtitle}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </Panel>
        )}

        <Panel id="venue" title={t.venue.title}>
          <TiltCard className="rounded-[1.75rem]">
            <div className="gold-frame rounded-[1.75rem] border border-inv-line bg-inv-surface px-6 py-10 text-center">
              <div className="relative">
                <p className="font-inv-serif text-2xl text-inv-ink">{w.venueName}</p>
                {w.venueArea && <p className="mt-1 text-inv-ink-soft">{w.venueArea}</p>}
                <p className="mt-4 text-inv-gold-ink">
                  {view.dateLine} · {view.timeLine}
                </p>
                <VenueActions {...view.links} labels={t.venue} />
              </div>
            </div>
          </TiltCard>
        </Panel>

        {hasDress && (
          <Panel id="dress" title={t.dressCode.title} className="text-center">
            {dress.label && <p className="font-inv-serif text-xl text-inv-ink">{dress.label}</p>}
            {dress.swatches.length > 0 && (
              <ul className="mt-5 flex justify-center gap-3" aria-hidden="true">
                {dress.swatches.map((hex) => (
                  <li
                    key={hex}
                    className="size-11 rounded-full border border-inv-line shadow-md"
                    style={{ background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${hex} 60%, white), ${hex} 55%, color-mix(in srgb, ${hex} 75%, black))` }}
                  />
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
          </Panel>
        )}

        {w.notes && (
          <Panel id="notes" title={t.notes} className="text-center">
            <p className="leading-loose whitespace-pre-line text-inv-ink">{w.notes}</p>
          </Panel>
        )}

        <Panel id="rsvp" title={t.rsvp.title}>
          <RsvpCard
            slug={w.slug}
            lang={w.lang}
            guest={guest}
            openRsvpMaxSeats={w.openRsvpMaxSeats}
            closed={view.rsvpClosed}
            deadlineLine={view.deadlineLine}
            preview={view.preview}
          />
        </Panel>

        <section className="px-6 py-16 text-center" data-reveal>
          <p className="font-inv-display text-4xl leading-display text-inv-gold [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]">
            {w.lang === 'ar' ? template.closingAr : template.closingEn}
          </p>
        </section>
      </main>

      <footer className="px-6 pb-10 text-center text-sm text-inv-on-band/80">
        {t.footer.text}{' '}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" dir="ltr" className="font-medium text-inv-gold underline-offset-4 hover:underline">
          @{INSTAGRAM_HANDLE}
        </a>
      </footer>
    </div>
  );
}
