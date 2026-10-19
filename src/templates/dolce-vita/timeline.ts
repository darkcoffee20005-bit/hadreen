/**
 * The dolce-vita opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skipping, seeking (capture "mid") and the marketing thumbnails' rewind are exact.
 *
 *   0.00–0.60  a sparkle burst over the card; powder-blue foil dust falls
 *   0.60–3.20  S1 → S2: crane up and back over the roses; the lake appears; clouds drift
 *   3.20–5.20  the sailboat glides across; glitter on the water
 *   5.20–6.80  S2 → S3: the camera arcs to the table and the powder-blue envelope; the flap opens
 *   6.80–7.50  the names float up above the envelope in navy and gold; hand-off
 */
export const INTRO = 7.5;

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
export const easeInOutSine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

export interface IntroState {
  /** Seconds since the burst (drives the sparkle shader). */
  burst: number;
  /** Lake glitter strength (rises as the lake is revealed, peaks while the boat crosses). */
  glitter: number;
  /** The boat's glide across the lake, 0..1. */
  boat: number;
  /** Envelope flap 0 closed … 1 folded back. */
  flap: number;
  /** The letter peeking out of the envelope, 0..1 (the scroll lifts it the rest of the way). */
  peek: number;
  /** The names floating up above the envelope, 0..1. */
  names: number;
}

export function introState(t: number): IntroState {
  return {
    burst: t,
    glitter: 0.45 + 0.55 * smoothstep(2.4, 3.6, t) * (1 - 0.35 * smoothstep(5.4, 6.6, t)),
    boat: easeInOutSine((t - 2.7) / 3.3),
    flap: easeInOutCubic((t - 5.55) / 0.85),
    peek: easeOutCubic((t - 6.15) / 0.8),
    names: easeOutCubic((t - 6.55) / 0.95),
  };
}

/** The boat: right → left across the crane shot, then a slow drift (wraps far off-screen). */
export const BOAT_START = 16;
export const BOAT_GLIDE = -38;
export const BOAT_DRIFT = -0.35; // units per second after the hand-off

export function boatX(glide: number, driftSeconds: number): number {
  const x = BOAT_START + BOAT_GLIDE * glide + BOAT_DRIFT * driftSeconds;
  // Wraps from far left back to far right, well outside every frame.
  const lo = -150;
  const hi = 60;
  const span = hi - lo;
  return ((((x - lo) % span) + span) % span) + lo;
}

/** How far the letter has risen out of its envelope (0 tucked in … 1 nearly all out). */
export function letterRise(peek: number, scroll: number): number {
  return 0.16 * peek + 0.84 * easeInOutCubic(smoothstep(0.04, 0.62, scroll));
}
