import type { SceneView } from '../scene-types';

/**
 * The 2D stage: a fixed CSS/SVG backdrop in the template's palette behind the content, used when
 * WebGL is off, failed, or the guest prefers reduced motion. Same look, no 3D.
 * Bespoke per-template versions replace the arch in Phase 3.
 */
export function Backdrop2D({ view }: { view: SceneView }) {
  const p = view.palette;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: `radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, ${p.gold} 22%, ${p.band}) 0%, ${p.band} 55%, color-mix(in srgb, ${p.band} 55%, black) 100%)` }}>
      <svg viewBox="0 0 400 560" className="absolute left-1/2 top-[8svh] h-[78svh] -translate-x-1/2 opacity-70" fill="none">
        <defs>
          <linearGradient id="arch-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.gold} />
            <stop offset="1" stopColor={p.goldInk} />
          </linearGradient>
        </defs>
        <path d="M60 560 V250 C60 130 140 70 200 20 C260 70 340 130 340 250 V560" stroke="url(#arch-gold)" strokeWidth="3" />
        <path d="M78 560 V256 C78 145 150 92 200 48 C250 92 322 145 322 256 V560" stroke={p.gold} strokeOpacity="0.45" strokeWidth="1.2" />
      </svg>
      <div className="invite-dust absolute inset-0" style={{ '--dust': p.gold } as React.CSSProperties} />
    </div>
  );
}
