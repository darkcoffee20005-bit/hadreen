'use client';

import { useEffect, useRef } from 'react';
import type { InviteView } from '@/lib/invite/view';
import { iconFor, ICONS, type IconKey } from './icons';

/**
 * A gilded wire frieze after the hero: one line-art icon per programme moment it recognises
 * (rings, the zaffa drum, dinner, cake, the welcome arch), drawn on in glowing gold as it
 * scrolls into view. Decorative only — the programme itself is in the content below.
 */
export default function Extras({ view }: { view: InviteView }) {
  const root = useRef<HTMLDivElement>(null);
  const icons = view.wedding.schedule
    .map((item) => iconFor(item.title))
    .filter((k, i, all): k is IconKey => k !== null && all.indexOf(k) === i)
    .slice(0, 5);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--rg-draw', '1');
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.55)));
      el.style.setProperty('--rg-draw', p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (icons.length === 0) return null;
  return (
    <div ref={root} aria-hidden="true" className="rg-wire px-6 py-6" style={{ '--rg-draw': 0 } as React.CSSProperties}>
      <style>{WIRE_CSS}</style>
      <div className="mx-auto flex max-w-xl items-center justify-center">
        {icons.map((key, i) => (
          <div key={key} className="flex items-center">
            {i > 0 && <span className="rg-wire-link" style={{ '--i': i } as React.CSSProperties} />}
            <svg viewBox="0 0 72 64" className="rg-wire-icon" style={{ '--i': i } as React.CSSProperties}>
              {ICONS[key].map((d, j) => (
                <path key={j} d={d} pathLength={1} />
              ))}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

const WIRE_CSS = `
.rg-wire-icon{width:clamp(3rem,13vw,4.25rem);height:auto;overflow:visible;fill:none;stroke:var(--c-gold-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;
  filter:drop-shadow(0 0 3px color-mix(in srgb,var(--c-gold) 80%,transparent)) drop-shadow(0 0 10px color-mix(in srgb,var(--c-gold) 45%,transparent))}
.rg-wire-icon path{stroke-dasharray:1 1;stroke-dashoffset:calc(1 - clamp(0, var(--rg-draw) * 1.7 - var(--i) * 0.16, 1))}
.rg-wire-link{display:block;width:clamp(.8rem,4vw,2rem);height:1px;margin:0 .35rem;background:linear-gradient(90deg,transparent,var(--c-gold),transparent);
  transform:scaleX(clamp(0, var(--rg-draw) * 1.7 - var(--i) * 0.16, 1))}
`;
