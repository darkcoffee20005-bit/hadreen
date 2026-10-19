import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/links';
import { copy } from './copy';
import { InstagramButton, InstagramGlyph, Ornament } from './ui';

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="relative overflow-hidden bg-emerald-deep px-5 py-28 text-center text-ivory">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_100%,rgba(201,169,110,0.22),transparent)]" />
      <div className="relative" data-reveal>
        <h2 id="final-title" className="font-display text-[clamp(2.4rem,7vw,4rem)] leading-display text-gold">
          {copy.final.title}
        </h2>
        <Ornament className="mt-3" />
        <p className="mx-auto mt-5 max-w-md font-serif text-lg leading-loose text-ivory/85">{copy.final.lead}</p>
        <InstagramButton className="mt-9" />
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#051d16] px-5 py-10 text-ivory/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <p>
          <span className="font-display text-2xl text-gold">{copy.brand}</span>
          <span className="ms-3">{copy.footer.tagline}</span>
        </p>
        <p className="flex items-center gap-2">
          {copy.footer.contact}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1.5 font-medium text-gold hover:underline">
            <InstagramGlyph className="size-4" />@{INSTAGRAM_HANDLE}
          </a>
        </p>
      </div>
    </footer>
  );
}

