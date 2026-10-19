/**
 * The blossom-oud opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skipping, seeking (capture "mid") and the marketing thumbnails' rewind are all exact.
 *
 *   0.00–1.10  the oud seal breaks, the rounded flap lifts, the envelope slides down and out
 *   1.10–1.60  a bloom of light (the cut happens inside it) into S1: closed rose-satin curtains
 *   1.60–3.60  the curtains part, their folds gathering to the gold tiebacks: the chandelier
 *   3.60–5.40  S2: low angle under the swaying chandelier, a slow orbit, then tilting down
 *   5.40–7.60  through the arch to S3, the palm avenue in pink mist; the lanterns light up
 *   7.60–8.50  the names appear in gold above the palace gate; hand-off
 */
export const INTRO = 8.5;
/** The cut from the envelope world to the curtained arch, at the peak of the bloom. */
export const CUT = 1.15;
export const OPEN_START = 1.6;
export const OPEN_END = 3.6;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInCubic = (x: number) => Math.pow(clamp01(x), 3);
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** Heavy satin: a slow start, a long glide, a soft landing at the tieback. */
export const easeInOutQuart = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

export interface IntroState {
  /** Wax seal crack, 0 whole … 1 halves gone. */
  seal: number;
  /** Flap, 0 closed … 1 lifted. */
  flap: number;
  /** Envelope sliding down and out of frame, 0..1. */
  slide: number;
  /** Light pouring out of the opened envelope, 0..1. */
  glow: number;
  /** Full-screen bloom of light, 0..1. */
  flash: number;
  /** True while the envelope world is on screen (before the cut). */
  gate: boolean;
  /** Curtains, 0 closed … 1 gathered at the tiebacks. */
  open: number;
  /** Chandelier brightness, 0..1 (it burns dimly behind the closed curtains). */
  chandelier: number;
  /** Lanterns down the avenue, 0..1 overall (each lights in turn: lanternOn). */
  lanterns: number;
  /** The gold names above the palace gate, 0..1. */
  names: number;
}

export function flashAt(t: number): number {
  if (t < CUT) return Math.pow(smoothstep(0.55, CUT, t), 1.3);
  return 1 - smoothstep(CUT, 1.85, t);
}

export function introState(t: number): IntroState {
  return {
    seal: easeOutCubic(t / 0.95),
    flap: easeInOutCubic((t - 0.1) / 0.72),
    slide: easeInCubic((t - 0.5) / 0.62),
    glow: smoothstep(0.3, 1.0, t),
    flash: flashAt(t),
    gate: t < CUT,
    open: easeInOutQuart((t - OPEN_START) / (OPEN_END - OPEN_START)),
    chandelier: 0.35 + 0.65 * smoothstep(1.9, 3.3, t),
    lanterns: smoothstep(5.2, 7.4, t),
    names: easeOutCubic((t - 7.55) / 0.85),
  };
}

/**
 * Lantern `i` of `n` (ordered from the arch toward the palace) lights as the camera comes down
 * the avenue: 0 dark … 1 lit.
 */
export function lanternOn(i: number, n: number, t: number): number {
  const at = 5.2 + (2.0 * i) / Math.max(1, n - 1);
  return smoothstep(at, at + 0.35, t);
}

/** Curtain breathing amplitude: alive while closed, still once tied back. */
export function breathAt(open: number): number {
  return 1 - smoothstep(0.0, 0.6, open);
}

/** Chandelier pendulum (radians about z and x) at a time; deterministic. */
export function swingAt(seconds: number, amp = 1): [number, number] {
  return [Math.sin(seconds * 0.9) * 0.022 * amp, Math.sin(seconds * 0.63 + 1.1) * 0.012 * amp];
}

/** Lantern flicker, ~0.8..1.05, deterministic in time and seed. */
export function flicker(seconds: number, seed: number): number {
  const a = Math.sin(seconds * 7.3 + seed * 12.9898);
  const b = Math.sin(seconds * 13.1 + seed * 78.233);
  const c = Math.sin(seconds * 2.1 + seed * 3.7);
  return 0.9 + 0.05 * a + 0.035 * b + 0.04 * c;
}
