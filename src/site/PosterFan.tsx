'use client';

import { TEMPLATES } from '@/templates';
import { heroStore, useHero } from './hero-store';
import { Poster } from './Poster';

/** Without 3D (no WebGL, reduced motion): the active design and its neighbours as a still fan. */
export function PosterFan() {
  const active = useHero((s) => s.active);
  const n = TEMPLATES.length;
  const slots = [-1, 0, 1].map((d) => ({ d, i: (active + d + n) % n }));
  return (
    <div aria-hidden="true" className="absolute inset-y-[6%] inset-x-0 flex items-center justify-center lg:inset-y-[18%] lg:start-auto lg:end-[8%] lg:w-[46%]">
      {slots.map(({ d, i }) => (
        <button
          key={TEMPLATES[i]!.id}
          type="button"
          tabIndex={-1}
          onClick={() => heroStore.getState().setActive(i)}
          className="absolute aspect-[1/2] h-full max-h-[440px] transition-transform duration-700"
          style={{ transform: `translateX(${d * 62}%) scale(${d === 0 ? 1 : 0.82}) rotate(${d * -6}deg)`, zIndex: d === 0 ? 2 : 1, opacity: d === 0 ? 1 : 0.7 }}
        >
          <Poster template={TEMPLATES[i]!} className="h-full w-full" />
        </button>
      ))}
    </div>
  );
}
