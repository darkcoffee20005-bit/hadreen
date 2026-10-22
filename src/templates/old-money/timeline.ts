/**
 * The old-money opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skipping, seeking (capture "mid") and the thumbnails' rewind all land on the same frame.
 *
 *   0.00–0.45  the envelope stops floating and settles; a glint runs along the pearls
 *   0.25–1.45  the flap lifts and folds back, the pearl string riding its edges and swinging
 *   1.20–2.70  the card slides up out of the envelope
 *   2.55–5.40  the card flies to the camera, turning upright on phones, and grows to fill the
 *              screen; the envelope sinks away into the olive
 *   5.40–7.00  the paper settles, its gold border draws in; hand-off to the content
 */
export const INTRO = 7;
export const FLAP = { start: 0.25, end: 1.45 } as const;
export const SLIDE = { start: 1.2, end: 2.7 } as const;
export const FLY = { start: 2.55, end: 5.4 } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
/** Slow start, long soft landing: a hand drawing a card out and bringing it close. */
export const easeInOutQuint = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;
};

export interface IntroState {
  /** 1 while floating at the gate … 0 once the hand has taken it. */
  float: number;
  /** Flap: 0 closed … 1 folded back. */
  flap: number;
  /** Pearl swing (signed, damped), in units of the string's sway amplitude. */
  swing: number;
  /** Card out of the pocket: 0 inside … 1 fully out above the envelope. */
  slide: number;
  /** Card from the envelope to the screen: 0 … 1 covering the view. */
  fly: number;
  /** Envelope sinking out of frame, 0 … 1 gone. */
  away: number;
  /** The date under the envelope, 1 shown … 0 gone. */
  date: number;
  /** Gold rule on the card's face: faint while it slides out, full once it is the page. */
  border: number;
  /** A glint travelling along the pearls, 0..1 position (wraps). */
  glint: number;
}

/** Damped pendulum: the string swings when the flap kicks it, and settles. */
export function pearlSwing(t: number): number {
  const s = t - (FLAP.start + 0.35);
  if (s <= 0) return 0;
  return Math.sin(s * 2 * Math.PI * 1.3) * Math.exp(-s * 1.6) * smoothstep(0, 0.15, s);
}

export function introState(t: number): IntroState {
  return {
    float: 1 - smoothstep(0, 0.45, t),
    flap: easeInOutCubic((t - FLAP.start) / (FLAP.end - FLAP.start)),
    swing: pearlSwing(t),
    slide: easeInOutCubic((t - SLIDE.start) / (SLIDE.end - SLIDE.start)),
    fly: easeInOutQuint((t - FLY.start) / (FLY.end - FLY.start)),
    away: easeInOutCubic((t - FLY.start - 0.2) / 1.9),
    date: 1 - smoothstep(0, 0.5, t),
    border: 0.55 + 0.45 * smoothstep(FLY.end - 0.6, INTRO - 0.4, t),
    glint: clamp01(t / 1.2),
  };
}
