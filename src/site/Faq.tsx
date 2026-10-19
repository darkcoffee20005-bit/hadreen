import { copy } from './copy';
import { SectionTitle } from './ui';

/** Only answers that are true of the product today (see PLAN.md decision 6). */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-ivory px-5 py-24">
      <SectionTitle id="faq-title" title={copy.faq.title} />
      <div className="mx-auto mt-12 max-w-2xl divide-y divide-line rounded-3xl border border-line bg-paper">
        {copy.faq.items.map((item) => (
          <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden" data-reveal>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl text-ink">
              {item.q}
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/60 text-gold-ink transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 leading-loose text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
