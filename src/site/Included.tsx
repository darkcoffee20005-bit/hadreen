import { copy } from './copy';
import { SectionTitle } from './ui';

const ICONS: React.ReactNode[] = [
  // opening (envelope with seal)
  <g key="0"><rect x="5" y="9" width="30" height="20" rx="2" /><path d="M5 10l15 11 15-11" /><circle cx="20" cy="21" r="3.2" /></g>,
  // personal link
  <g key="1"><path d="M17 23l6-6" /><path d="M14 20l-3 3a4.5 4.5 0 006.4 6.4l3-3" /><path d="M26 20l3-3a4.5 4.5 0 00-6.4-6.4l-3 3" /></g>,
  // RSVP (check in a circle)
  <g key="2"><circle cx="20" cy="20" r="12" /><path d="M14.5 20.5l4 4 7-8" /></g>,
  // dashboard
  <g key="3"><rect x="7" y="8" width="26" height="24" rx="2" /><path d="M12 26v-5M18 26v-9M24 26v-6M30 26v-11" /></g>,
  // details (calendar)
  <g key="4"><rect x="8" y="10" width="24" height="22" rx="2" /><path d="M8 16h24M14 7v6M26 7v6" /><circle cx="20" cy="24" r="2" /></g>,
  // languages
  <g key="5"><path d="M8 12h14M15 9v3M11 12c1 5 5 8 9 9M19 12c-1 4-4 8-9 10" /><path d="M22 31l5-12 5 12M24 27h6" /></g>,
  // every phone
  <g key="6"><rect x="13" y="6" width="14" height="28" rx="3" /><path d="M18 30h4" /></g>,
  // preview image
  <g key="7"><rect x="7" y="10" width="26" height="20" rx="2" /><path d="M7 26l7-7 6 6 4-4 9 9" /><circle cx="26" cy="16" r="2" /></g>,
];

export function Included() {
  return (
    <section id="included" aria-labelledby="included-title" className="bg-ivory px-5 py-24">
      <SectionTitle id="included-title" title={copy.included.title} />
      <ul className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {copy.included.items.map((item, i) => (
          <li key={item.title} data-reveal className="group rounded-3xl border border-line bg-paper p-6 transition hover:-translate-y-1 hover:border-gold hover:shadow-xl hover:shadow-gold/10">
            <svg aria-hidden="true" viewBox="0 0 40 40" className="size-11 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[i]}
            </svg>
            <h3 className="mt-4 font-serif text-xl text-ink">{item.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
