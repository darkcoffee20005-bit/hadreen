import type { TemplateMeta } from '@/lib/invite/types';
import { PREVIEWS } from './previews.data';

/**
 * A design's poster frame: the recorded preview poster when present, over a painted card in the
 * design's colours (so it never shows an empty box while loading or before previews exist).
 */
export function Poster({ template: t, className = '' }: { template: TemplateMeta; className?: string }) {
  const p = t.palette;
  return (
    <span
      className={`relative block overflow-hidden rounded-[1.6rem] border border-gold/50 shadow-2xl shadow-black/40 ${className}`}
      style={{ background: `radial-gradient(120% 80% at 50% 10%, color-mix(in srgb, ${p.gold} 30%, ${p.band}), ${p.band} 60%, color-mix(in srgb, ${p.band} 60%, black))` }}
    >
      <span className="absolute inset-0 grid place-items-center p-6 text-center">
        <span className="font-display text-3xl leading-display" style={{ color: p.gold }}>
          {t.nameAr}
        </span>
      </span>
      {PREVIEWS.includes(t.id) && (
        // eslint-disable-next-line @next/next/no-img-element -- static poster files, sized by CSS
        <img src={`/previews/${t.id}.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}
