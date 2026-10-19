import type { SceneView } from '../scene-types';

/**
 * The 2D gate: an SVG/CSS envelope with a wax seal. When `opening` is true the seal splits, the
 * flap turns and the envelope slides away (about 2.4 s; a quick fade under reduced motion).
 */
export const GATE_2D_OPENING_MS = 2400;

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const p = view.palette;
  return (
    <div className={`gate2d relative mx-auto aspect-[3/2] w-[min(78vw,26rem)] ${opening ? 'is-opening' : ''}`} style={{ perspective: '900px' }} aria-hidden="true">
      <div className="gate2d-envelope absolute inset-0">
        <div className="absolute inset-0 rounded-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${p.surface} 92%, ${p.gold}), color-mix(in srgb, ${p.surface} 80%, ${p.gold}))` }}>
          <div className="absolute inset-[7%] rounded-[3px] border" style={{ borderColor: `color-mix(in srgb, ${p.gold} 55%, transparent)` }} />
        </div>
        <svg className="gate2d-flap absolute inset-x-0 top-0 h-[64%] w-full" viewBox="0 0 300 128" preserveAspectRatio="none">
          <path d="M0 0 H300 L156 124 Q150 129 144 124 Z" fill={`color-mix(in srgb, ${p.surface} 86%, ${p.gold})`} stroke={`color-mix(in srgb, ${p.gold} 40%, transparent)`} />
        </svg>
        <div className="gate2d-seal absolute left-1/2 top-[64%] grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center">
          <span className="gate2d-half gate2d-half-a absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${p.accent} 70%, white), ${p.accent} 55%, color-mix(in srgb, ${p.accent} 70%, black))`, clipPath: 'inset(0 50% 0 0)' }} />
          <span className="gate2d-half gate2d-half-b absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${p.accent} 70%, white), ${p.accent} 55%, color-mix(in srgb, ${p.accent} 70%, black))`, clipPath: 'inset(0 0 0 50%)' }} />
          <span className="gate2d-mono relative font-display text-[clamp(0.9rem,4.4vw,1.5rem)] leading-none" style={{ color: `color-mix(in srgb, ${p.accent} 45%, white)` }}>
            {view.monogram}
          </span>
        </div>
      </div>
    </div>
  );
}
