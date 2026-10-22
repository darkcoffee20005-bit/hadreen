/**
 * The white-house-hall opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(director.time)`,
 * so skip, seek (capture "mid") and rewind land exactly.
 *
 *   0.05–0.75  the black wax seal lifts off the card and fades
 *   0.55–2.15  the camera leans into the card's line drawing of the façade until it fills the frame;
 *              the paper around it whitens (the veil) so only the drawing is left
 *   2.15       CUT (under the veil): the same drawing now hangs over the real façade
 *   2.40–3.30  the veil clears to blue hour; the ink lines warm to light and dissolve into the stone
 *   2.45–3.60  uplights come up the columns, the windows and the fanlight glow
 *   4.10–5.40  the tall black doors swing in; warm light pours onto the porch
 *   4.00–7.40  the camera walks up the steps, between the columns, into the white hall;
 *              the chandeliers sparkle as they come into view
 *   7.40–8.00  the hall settles; hand-off
 */
export const INTRO = 8;
export const CUT = 2.15;

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
  /** True while the card world is on screen. */
  gate: boolean;
  /** The seal lifting away: 0 resting … 1 gone. */
  seal: number;
  /** Paper-coloured veil over everything but the drawing, 0..1. */
  veil: number;
  /** The 3D drawing's ink: 0 black … 1 warm light. */
  inkWarm: number;
  /** The 3D drawing's opacity. */
  ink: number;
  /** Façade lighting (uplights, windows, fanlight), 0..1. */
  lights: number;
  /** The double doors, 0 shut … 1 open. */
  doors: number;
  /** Warm light spilling out of the doorway onto the porch and steps. */
  spill: number;
  /** Chandelier sparkle, 0..1. */
  sparkle: number;
}

export function veilAt(t: number): number {
  if (t <= CUT) return smoothstep(1.55, 2.08, t);
  return 1 - smoothstep(2.4, 3.3, t);
}

export function introState(t: number): IntroState {
  return {
    gate: t <= CUT,
    seal: easeOutCubic((t - 0.05) / 0.7),
    veil: veilAt(t),
    inkWarm: smoothstep(2.4, 3.1, t),
    ink: t <= CUT ? 1 : 1 - smoothstep(3.25, 4.4, t),
    lights: smoothstep(2.45, 3.6, t),
    doors: easeInOutCubic((t - 4.1) / 1.3),
    spill: smoothstep(4.2, 5.4, t),
    sparkle: smoothstep(5.0, 7.0, t),
  };
}
