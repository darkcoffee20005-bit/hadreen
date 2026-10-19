import { mulberry32 } from '@/lib/invite/audio/dsp';
import { fbm1 } from './world';

/**
 * Pure SVG builders for the dolce-vita 2D path: ridge silhouettes from the same noise as the 3D
 * mountains, a scatter of villas along a shore, cypresses, and the balustrade.
 */

const r1 = (v: number) => Math.round(v * 10) / 10;

/** A filled ridge silhouette across [0, width], its base at `bottom`. */
export function ridgePath(width: number, bottom: number, base: number, amp: number, freq: number, seed: number, steps = 60, sides = 0): string {
  const pts: string[] = [`M0 ${bottom}`];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const edge = Math.abs(x / width - 0.5) * 2;
    const n = fbm1(x * freq + 2.3, seed);
    const y = base - amp * n * n * 1.6 - sides * edge * edge * amp;
    pts.push(`L${r1(x)} ${r1(y)}`);
  }
  pts.push(`L${width} ${bottom}Z`);
  return pts.join('');
}

export interface Villa2D {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
}

/** Villas scattered along a shore line from x0 to x1 (y = shore), smaller toward `far`. */
export function villaScatter(x0: number, x1: number, shore: number, count: number, size: number, seed: number): Villa2D[] {
  const rand = mulberry32(seed);
  const out: Villa2D[] = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + rand() * (x1 - x0);
    const lift = rand() * rand() * size * 3;
    const w = size * (0.8 + rand() * 0.6);
    out.push({ x: r1(x), y: r1(shore - lift), w: r1(w), h: r1(w * (0.62 + rand() * 0.25)), tone: Math.floor(rand() * 4) });
  }
  return out.sort((a, b) => a.y - b.y);
}

/** x positions of the balusters across [0, width] (one every `step`). */
export function balusterXs(width: number, step: number): number[] {
  const n = Math.floor(width / step);
  const pad = (width - n * step) / 2 + step / 2;
  return Array.from({ length: n }, (_, i) => r1(pad + i * step));
}

/** One vase-shaped baluster outline (height h, centred on x, standing on y). */
export function balusterPath(x: number, y: number, h: number, w: number): string {
  const p = (dx: number, dy: number) => `${r1(x + dx * w)} ${r1(y - dy * h)}`;
  return (
    `M${p(-0.5, 0)}L${p(-0.5, 0.06)}L${p(-0.32, 0.1)}C${p(-0.6, 0.3)} ${p(-0.5, 0.48)} ${p(-0.22, 0.66)}` +
    `L${p(-0.16, 0.8)}L${p(-0.3, 0.86)}L${p(-0.3, 0.92)}L${p(-0.5, 0.95)}L${p(-0.5, 1)}` +
    `L${p(0.5, 1)}L${p(0.5, 0.95)}L${p(0.3, 0.92)}L${p(0.3, 0.86)}L${p(0.16, 0.8)}L${p(0.22, 0.66)}` +
    `C${p(0.5, 0.48)} ${p(0.6, 0.3)} ${p(0.32, 0.1)}L${p(0.5, 0.06)}L${p(0.5, 0)}Z`
  );
}

export const STUCCO_2D = ['#F3E4C8', '#F1C9A5', '#F6EEDC', '#E9B99A'];
