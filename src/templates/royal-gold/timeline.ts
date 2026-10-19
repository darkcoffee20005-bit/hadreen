/**
 * The royal-gold opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skipping, seeking (capture "mid") and the marketing thumbnails' rewind are all exact.
 *
 *   0.00–0.40  the ivory seal bursts into shards and gold dust
 *   0.40–1.60  the four flaps unfold, 0.15 s apart
 *   1.60–2.60  golden light floods out: beams, bloom spike, exposure to white-gold
 *   2.50       (inside the white) cut to the arch hall
 *   2.60–4.80  S2: arch and lanterns; the lanterns start to swing, blossoms drift
 *   4.80–7.20  S3: long lens through the arch to the mosque; the couple walks
 *   7.20–8.00  the names settle in gold; hand-off
 */
export const INTRO = 8;
export const FLAP_START = 0.4;
export const FLAP_STAGGER = 0.15;
export const FLAP_DURATION = 0.66;
export const CUT = 2.5;
export const LANTERN_KICK = 2.3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export interface IntroState {
  /** 0 whole … 1 shards gone. */
  seal: number;
  /** Each flap 0 closed … 1 laid open; order: top, right, left, bottom. */
  flaps: [number, number, number, number];
  /** Inner card glow 0..1 (beyond 1 = blinding). */
  glow: number;
  /** Radial light burst from the pochette. */
  rays: number;
  /** Full-screen white-gold exposure, 0..1. */
  flash: number;
  /** True while the pochette world is on screen. */
  gate: boolean;
  /** Seconds since the lanterns were set swinging (≤ 0: still). */
  swing: number;
  /** Sun shafts through the arch. */
  shafts: number;
  /** The couple's walk, 0 at the arch … 1 arrived. */
  walk: number;
  /** Gold names above the arch. */
  names: number;
}

export function flapProgress(t: number, i: number): number {
  return easeInOutCubic((t - FLAP_START - i * FLAP_STAGGER) / FLAP_DURATION);
}

export function flashAt(t: number): number {
  if (t < CUT + 0.05) return Math.pow(smoothstep(1.9, CUT - 0.04, t), 1.6);
  return 1 - easeOutCubic((t - CUT - 0.05) / 1.05);
}

export function introState(t: number): IntroState {
  return {
    seal: easeOutCubic(t / 0.62),
    flaps: [flapProgress(t, 0), flapProgress(t, 1), flapProgress(t, 2), flapProgress(t, 3)],
    glow: smoothstep(0.55, 1.5, t) * 0.55 + smoothstep(1.5, 2.45, t) * 2.2,
    rays: smoothstep(1.2, 1.95, t),
    flash: flashAt(t),
    gate: t < CUT,
    swing: t - LANTERN_KICK,
    shafts: 0.35 + 0.65 * smoothstep(2.6, 5.2, t),
    walk: easeInOutCubic((t - 4.3) / 3.5) * 0.85 + smoothstep(4.3, 7.8, t) * 0.15,
    names: easeOutCubic((t - 6.7) / 1.25),
  };
}
