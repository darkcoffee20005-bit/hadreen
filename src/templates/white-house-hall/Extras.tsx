'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { InviteView } from '@/lib/invite/view';
import { facadeSvg } from './facade';
import { HALL_CITY, HALL_NAME } from './meta';

/**
 * After the hero: the hall's façade in fine black line on off-white, with its name — the card's
 * drawing, now on the page. It also hands the same drawing to the venue section and the footer
 * (as a CSS variable on the content root), so the hall is the venue's picture.
 */
export default function Extras(_props: { view: InviteView }) {
  const root = useRef<HTMLDivElement>(null);
  const svg = useMemo(() => facadeSvg('#151515', 0.034, HALL_NAME), []);
  const src = useMemo(() => `data:image/svg+xml,${encodeURIComponent(svg)}`, [svg]);

  useEffect(() => {
    const content = root.current?.closest<HTMLElement>('[data-template]');
    if (!content) return;
    content.style.setProperty('--whh-facade', `url("${src}")`);
    content.style.setProperty('--whh-hall', `"${HALL_NAME} · ${HALL_CITY}"`);
    return () => {
      content.style.removeProperty('--whh-facade');
      content.style.removeProperty('--whh-hall');
    };
  }, [src]);

  return (
    <div ref={root} className="whh-plaque px-4 py-6" data-reveal>
      <figure className="mx-auto max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden="true" className="mx-auto w-[min(78vw,22rem)]" draggable={false} />
        <figcaption className="mt-5 font-inv-serif text-lg tracking-wide text-inv-ink">{HALL_NAME}</figcaption>
        <p className="mt-1 text-sm text-inv-ink-soft">{HALL_CITY}</p>
      </figure>
    </div>
  );
}
