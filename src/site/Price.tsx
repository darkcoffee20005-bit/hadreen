import { localizeDigits } from '@/lib/date/numerals';
import { copy } from './copy';
import { InstagramButton, Ornament, SectionTitle } from './ui';

export function Price() {
  return (
    <section id="price" aria-labelledby="price-title" className="relative overflow-hidden bg-emerald px-5 py-24 text-ivory">
      <div aria-hidden="true" className="site-girih absolute inset-0 opacity-[0.07]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div data-reveal className="mx-auto w-full max-w-md rounded-[2.5rem] border border-gold/40 bg-emerald-deep/70 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
          <h2 id="price-title" className="text-sm tracking-wide text-gold">
            {copy.price.title}
          </h2>
          <p className="mt-4 font-display text-[clamp(3rem,10vw,4.5rem)] leading-display text-ivory">{copy.price.amount}</p>
          <Ornament className="mt-2" />
          <p className="mt-4 font-serif text-lg text-ivory/85">{copy.price.plan}</p>
          <InstagramButton label={copy.price.cta} className="mt-8 w-full" />
        </div>
        <div>
          <SectionTitle id="steps-title" title={copy.steps.title} tone="light" />
          <ol className="mx-auto mt-10 max-w-md space-y-6" aria-labelledby="steps-title">
            {copy.steps.items.map((step, i) => (
              <li key={step.title} data-reveal className="flex gap-5">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/60 font-serif text-xl text-gold">
                  {localizeDigits(String(i + 1), 'ar')}
                </span>
                <div>
                  <h3 className="font-serif text-xl text-ivory">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ivory/80">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
