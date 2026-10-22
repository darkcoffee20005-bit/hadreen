'use client';

import { useEffect, useId } from 'react';
import { formatScheduleTime } from '@/lib/date/format';
import { inviteDict } from '@/lib/i18n';
import type { InviteView } from '@/lib/invite/view';
import { iconFor } from './icons';

/** The few labels this card adds beyond the shared dictionary. */
const LABELS = {
  ar: { details: 'التفاصيل', when: 'الموعد' },
  en: { details: 'The Details', when: 'When' },
} as const;

/**
 * «التفاصيل»: the card from the couple's design, after the hero. An ornate gold frame around a
 * dark still life of white flowers, the names and date, the first two moments of the evening in
 * two columns (time, place), the dress-code colours as little hearts and an olive button to the
 * map. Everything comes from the wedding's own data. It also marks each programme item with a
 * small line icon picked from its title (CSS draws it).
 */
export default function Extras({ view }: { view: InviteView }) {
  const w = view.wedding;
  const t = inviteDict(w.lang);
  const l = LABELS[w.lang];
  const items = w.schedule.slice(0, 2);
  const swatches = w.dressCode.swatches;

  useEffect(() => {
    const list = document.querySelectorAll<HTMLLIElement>("[data-template='old-money'] #programme ol > li");
    list.forEach((li) => {
      const title = li.querySelectorAll('p')[1]?.textContent ?? '';
      li.dataset.icon = iconFor(title);
    });
  }, [w.schedule]);

  return (
    <section className="om-details px-4 pb-2 pt-6" data-reveal aria-labelledby="om-details-title">
      <div className="om-sheet mx-auto max-w-xl px-6 pb-12 pt-10 text-center sm:px-10">
        <h2 id="om-details-title" className="font-inv-display text-[2.6rem] leading-display text-inv-gold-ink">
          {l.details}
        </h2>
        <div className="relative mx-auto mt-6 w-[min(72%,15rem)]">
          <BaroqueFrame />
          <Sprig className="absolute -bottom-5 -end-9 w-24 rotate-[-12deg]" />
        </div>
        <p className="mt-9 font-inv-serif text-xl tracking-wide text-inv-ink">
          {w.lang === 'ar' ? `${w.groomName} و${w.brideName}` : `${w.groomName} & ${w.brideName}`}
        </p>
        <p className="mt-1 text-inv-ink-soft">{view.dateLine}</p>
        <HeartRule className="my-7" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          {items.length === 2 ? (
            items.map((item, i) => (
              <div key={`${item.time}-${i}`} className={i === 0 ? 'border-e border-inv-line pe-3' : 'ps-1'}>
                <p className="font-inv-serif text-lg text-inv-gold-ink">{item.title}</p>
                <p className="mt-1 text-inv-ink">{formatScheduleTime(item.time, w.lang)}</p>
                <p className="mt-2 text-inv-ink-soft">{w.venueName}</p>
                {w.venueArea && <p className="text-inv-ink-soft">{w.venueArea}</p>}
              </div>
            ))
          ) : (
            <>
              <div className="border-e border-inv-line pe-3">
                <p className="font-inv-serif text-lg text-inv-gold-ink">{l.when}</p>
                <p className="mt-1 text-inv-ink">{view.timeLine}</p>
                <p className="mt-2 text-inv-ink-soft">{view.dateLine}</p>
              </div>
              <div className="ps-1">
                <p className="font-inv-serif text-lg text-inv-gold-ink">{t.venue.title}</p>
                <p className="mt-1 text-inv-ink">{w.venueName}</p>
                {w.venueArea && <p className="mt-2 text-inv-ink-soft">{w.venueArea}</p>}
              </div>
            </>
          )}
        </div>

        {swatches.length > 0 && (
          <div className="mt-9">
            <p className="text-sm tracking-wide text-inv-gold-ink">{t.dressCode.title}</p>
            <ul className="mt-3 flex justify-center gap-3" aria-hidden="true">
              {swatches.map((hex) => (
                <li key={hex}>
                  <svg viewBox="0 0 24 22" className="h-7 w-8 drop-shadow-sm">
                    <path d="M12 21C5 16 1 12 1 7a5.5 5.5 0 0 1 11-1.6A5.5 5.5 0 0 1 23 7c0 5-4 9-11 14z" fill={hex} stroke="rgb(0 0 0 / 0.12)" strokeWidth="0.6" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>
        )}

        <a href={view.links.maps} target="_blank" rel="noopener noreferrer" className="mt-9 inline-block rounded-full bg-inv-accent px-8 py-2.5 text-sm tracking-wide text-inv-on-accent shadow-md transition hover:opacity-90">
          {t.venue.map}
        </a>
        <svg viewBox="0 0 24 12" aria-hidden="true" className="mx-auto mt-6 h-3 w-6 text-inv-gold-ink/70">
          <path d="M3 2l9 8 9-8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </section>
  );
}

function HeartRule({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 14" aria-hidden="true" className={`mx-auto h-3.5 w-56 text-inv-gold ${className}`}>
      <path d="M0 7h95M125 7h95" stroke="currentColor" strokeWidth="0.8" />
      <path d="M110 12c-4-3-7-5-7-8a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 3-3 5-7 8z" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** A small branch of white flowers, as tucked against the frame in the design. */
function Sprig({ className = '' }: { className?: string }) {
  const flower = (x: number, y: number, r: number, rot: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M0 0C${-r * 0.55} ${-r * 0.4} ${-r * 0.5} ${-r * 1.15} 0 ${-r * 1.3}C${r * 0.5} ${-r * 1.15} ${r * 0.55} ${-r * 0.4} 0 0z`} transform={`rotate(${i * 72})`} fill="#FDFCF8" stroke="#D9D4C2" strokeWidth="0.6" />
      ))}
      <circle r={r * 0.22} fill="#D6CE8E" />
    </g>
  );
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className={`drop-shadow-md ${className}`}>
      <path d="M8 70C30 58 52 44 92 22" fill="none" stroke="#6E8457" strokeWidth="1.6" />
      {[
        [26, 60, -30],
        [44, 50, 25],
        [60, 41, -35],
        [76, 32, 30],
      ].map(([x, y, a], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="3.6" fill={i % 2 ? '#7E9467' : '#5C7448'} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      {flower(92, 22, 13, 10)}
      {flower(64, 30, 10, -20)}
      <ellipse cx="104" cy="12" rx="3.4" ry="7" fill="#F7F5EE" stroke="#D9D4C2" strokeWidth="0.5" transform="rotate(40 104 12)" />
    </svg>
  );
}

/**
 * The gold baroque frame: a moulded rectangle with C-scrolls and acanthus at the corners, a
 * shell crest on top, around a dark still life of white lilies. Drawn in SVG, gradients only.
 */
function BaroqueFrame() {
  const id = useId().replace(/:/g, '');
  const gold = `url(#${id}-gold)`;
  const corner = (
    <g>
      <path d="M8 40C8 20 20 8 40 8" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" />
      <path d="M2 46C-4 30 6 6 26 2c8-1 12 4 9 9-3 4-9 2-8-3" fill="none" stroke={gold} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M46 2C30-4 6 6 2 26c-1 8 4 12 9 9 4-3 2-9-3-8" fill="none" stroke={gold} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M14 14c6 2 10 6 12 12M20 8c2 6 2 10-1 14M8 20c6-2 10-2 14 1" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill={gold} />
    </g>
  );
  return (
    <svg viewBox="0 0 200 250" className="w-full drop-shadow-[0_10px_14px_rgb(60_45_15_/_0.35)]" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E6B4" />
          <stop offset="0.28" stopColor="#C9A862" />
          <stop offset="0.5" stopColor="#8A6A2E" />
          <stop offset="0.72" stopColor="#E3C886" />
          <stop offset="1" stopColor="#9C7B3A" />
        </linearGradient>
        <radialGradient id={`${id}-dark`} cx="0.45" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#3A3A2E" />
          <stop offset="0.6" stopColor="#1E1F18" />
          <stop offset="1" stopColor="#0E0F0B" />
        </radialGradient>
        <radialGradient id={`${id}-petal`} cx="0.3" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.65" stopColor="#E9E6DA" />
          <stop offset="1" stopColor="#8D8B7E" />
        </radialGradient>
      </defs>
      {/* The picture: a dark still life. */}
      <rect x="34" y="44" width="132" height="166" fill={`url(#${id}-dark)`} />
      <g opacity="0.9">
        <path d="M70 210C76 170 92 140 104 112" fill="none" stroke="#3F4B2E" strokeWidth="2.4" />
        <path d="M118 210C116 178 112 150 106 124" fill="none" stroke="#3F4B2E" strokeWidth="2" />
        <path d="M60 182c10-20 26-28 38-26-12 6-24 16-38 26z" fill="#33402A" />
        <path d="M136 176c-8-18-22-26-32-26 10 6 20 16 32 26z" fill="#2C3824" />
        {/* Lilies */}
        <g transform="translate(104 108) rotate(-18)">
          <path d="M0 0C-16-6-26-22-22-36-12-28-4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C16-6 26-22 22-36 12-28 4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C-6-14-6-30 0-42 6-30 6-14 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0-6v-18M-3-6l-3-14M3-6l3-14" stroke="#C9B26A" strokeWidth="0.9" />
        </g>
        <g transform="translate(82 140) rotate(-38) scale(0.78)">
          <path d="M0 0C-16-6-26-22-22-36-12-28-4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C16-6 26-22 22-36 12-28 4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C-6-14-6-30 0-42 6-30 6-14 0 0z" fill={`url(#${id}-petal)`} />
        </g>
        <g transform="translate(124 138) rotate(24) scale(0.66)">
          <path d="M0 0C-16-6-26-22-22-36-12-28-4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C16-6 26-22 22-36 12-28 4-18 0 0z" fill={`url(#${id}-petal)`} />
          <path d="M0 0C-6-14-6-30 0-42 6-30 6-14 0 0z" fill={`url(#${id}-petal)`} />
        </g>
        <ellipse cx="96" cy="72" rx="4" ry="10" fill="#DAD6C8" transform="rotate(-10 96 72)" />
      </g>
      {/* Moulding: outer bead, deep cove, inner bead. */}
      <rect x="20" y="30" width="160" height="194" rx="3" fill="none" stroke={gold} strokeWidth="11" />
      <rect x="20" y="30" width="160" height="194" rx="3" fill="none" stroke="#5E4518" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="29" y="39" width="142" height="176" fill="none" stroke={gold} strokeWidth="3.4" />
      <rect x="13.5" y="23.5" width="173" height="207" rx="5" fill="none" stroke={gold} strokeWidth="2.2" />
      <rect x="24" y="34" width="152" height="186" fill="none" stroke="#FFF3C8" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="1.5 3" />
      {/* Corners */}
      <g transform="translate(6 16)">{corner}</g>
      <g transform="translate(194 16) scale(-1 1)">{corner}</g>
      <g transform="translate(6 238) scale(1 -1)">{corner}</g>
      <g transform="translate(194 238) scale(-1 -1)">{corner}</g>
      {/* Shell crest on top, a small cartouche below. */}
      <g transform="translate(100 22)">
        <path d="M-26 6C-20-14 20-14 26 6" fill={gold} />
        {[-20, -10, 0, 10, 20].map((x) => (
          <path key={x} d={`M0 6L${x} -10`} stroke="#6E5220" strokeOpacity="0.5" strokeWidth="1.2" />
        ))}
        <path d="M-36 8c-6-10 2-18 10-14M36 8c6-10-2-18-10-14" fill="none" stroke={gold} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-15" r="3.4" fill={gold} />
      </g>
      <g transform="translate(100 232)">
        <path d="M-18 0c6 8 30 8 36 0-6-6-30-6-36 0z" fill={gold} />
        <path d="M-28-2c-6 6-2 12 4 10M28-2c6 6 2 12-4 10" fill="none" stroke={gold} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
