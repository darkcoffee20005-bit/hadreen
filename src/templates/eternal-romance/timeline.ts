/**
 * The eternal-romance opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skipping, seeking (capture "mid") and the marketing thumbnails' rewind are all exact.
 *
 *   0.00–2.20  the velvet curtain lifts, gathering into swags; petals begin to fall
 *   2.20–2.60  the spotlight swings from the curtain down to the candlelit table
 *   2.60–5.20  S2: 45° high angle on the ivory table, dolly to the gold-framed name card
 *   5.20–7.60  S3: pull back; the venue façade draws itself in gold on the back wall
 *   7.60–8.50  the names and date settle; hand-off
 */
export const INTRO = 8.5;
export const LIFT_START = 0.12;
export const LIFT_END = 2.2;
export const SWING_START = 2.2;
export const SWING_END = 2.62;
export const PETALS_START = 0.35;
export const DRAW_START = 5.35;
export const DRAW_END = 7.55;

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
/** Slow start, long glide: how a heavy curtain leaves the floor. */
export const easeInOutQuart = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

export interface IntroState {
  /** 0 curtain down … 1 raised (eased). */
  lift: number;
  /** How far the raised fabric has gathered into swags, 0..1. */
  swag: number;
  /** The hem's swing after the lift (signed, decays). */
  hemSwing: number;
  /** Seconds since the petals began to fall (< 0: none yet). */
  petals: number;
  /** Spotlight aim: 0 on the curtain … 1 on the table. */
  spot: number;
  /** Candle glow, 0..1 (they burn from the start, behind the curtain). */
  candles: number;
  /** Venue façade line drawing progress, 0..1. */
  draw: number;
  /** Façade visibility, 0..1. */
  sketch: number;
  /** The 3D names (and then the date) settling at the end, 0..1. */
  names: number;
  date: number;
  /** Depth-of-field focus: 0 the table centre … 1 the name card … 2 the façade. */
  focus: number;
  /** True while the curtain is still (mostly) closed — the gate world. */
  gate: boolean;
}

export function liftAt(t: number): number {
  return easeInOutQuart((t - LIFT_START) / (LIFT_END - LIFT_START));
}

/** Swags form as soon as the hem leaves the floor (never before, so the fabric can't stretch). */
export function swagAt(lift: number): number {
  return smoothstep(0, 0.4, lift);
}

export function introState(t: number): IntroState {
  const lift = liftAt(t);
  const after = t - LIFT_END;
  return {
    lift,
    swag: swagAt(lift),
    hemSwing: after > 0 ? Math.sin(after * 4.2) * Math.exp(-after * 1.5) * 0.9 : -smoothstep(0.3, 1.6, t) * 0.5,
    petals: t - PETALS_START,
    spot: easeInOutCubic((t - SWING_START) / (SWING_END - SWING_START)),
    candles: 0.55 + 0.45 * smoothstep(0.6, 2.0, t),
    draw: easeInOutCubic((t - DRAW_START) / (DRAW_END - DRAW_START)),
    sketch: smoothstep(5.0, 5.6, t),
    names: easeOutCubic((t - 7.45) / 0.95),
    date: easeOutCubic((t - 7.75) / 0.75),
    focus: smoothstep(2.9, 4.7, t) + smoothstep(5.3, 6.6, t),
    gate: t < 0.05,
  };
}
