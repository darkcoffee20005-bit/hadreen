import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { COLUMN, ELEVATION, ELEVATION_H, ELEVATION_W } from './facade';
import { CUT, easeInOutCubic, INTRO } from './timeline';

/**
 * The white-house-hall camera as data. The card lives in its own black world below the hall (G).
 * The cut from the card's drawing to the façade is invisible because both shots frame the same
 * drawing with the same `fit` box (same aspect), and only the drawing shows over the veil.
 */
export const G: Vec3 = [0, -60, 0];
export const g = (x: number, y: number, z: number): Vec3 => [G[0] + x, G[1] + y, G[2] + z];

/** The card, in its own units; the drawing area keeps the elevation's aspect. */
export const CARD = { w: 3.0, h: 4.4 };
export const DRAW = { w: 2.5, h: (2.5 * ELEVATION_H) / ELEVATION_W, cy: 0.7 };
export const SEAL_Y = -1.66;

/** The 3D drawing hangs just in front of the columns, framing the real façade. */
export const DRAW_Z = COLUMN.z + COLUMN.radius + 0.5;
export const ELEVATION_CENTER: Vec3 = [(ELEVATION.left + ELEVATION.right) / 2, (ELEVATION.bottom + ELEVATION.top) / 2, DRAW_Z];

/** The white hall behind the doors. */
export const HALL = { front: -1.6, back: -28, halfWidth: 6, floor: 0.9, ceiling: 7.6 };

/** Chandeliers [x, y, z, scale]: a grand row down the centre, smaller ones either side. */
export const CHANDELIERS: [number, number, number, number][] = [
  ...[-7.6, -12, -16.4, -20.8, -25.2].map((z) => [0, 6.0, z, 1.25] as [number, number, number, number]),
  ...[-9.8, -14.2, -18.6, -23].flatMap((z) => [[-3.6, 6.35, z, 0.8] as [number, number, number, number], [3.6, 6.35, z, 0.8] as [number, number, number, number]]),
];

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export const END_SHOT: Shot = { position: [0, 2.45, -3.4], target: [0, 4.3, -27], fov: 52 };

const DRAWING_SHOT: Shot = { position: g(0, DRAW.cy, 0.05), target: g(0, DRAW.cy, 0), fov: 14, fit: [DRAW.w, DRAW.h] };
const ELEVATION_SHOT: Shot = {
  position: [ELEVATION_CENTER[0], ELEVATION_CENTER[1], DRAW_Z + 0.05],
  target: ELEVATION_CENTER,
  fov: 14,
  fit: [ELEVATION_W, ELEVATION_H],
};

export const TRACK: TrackKey[] = [
  // The card on black, a little air around it.
  // The card sits high, leaving room below it for the gate's button on any screen.
  { at: 0, shot: { position: g(0, -0.55, 10), target: g(0, -0.55, 0), fov: 28, fit: [3.45, 5.9] } },
  { at: 0.55, shot: { position: g(0, -0.4, 9.6), target: g(0, -0.4, 0), fov: 27, fit: [3.4, 5.6] } },
  // Lean into the drawing until it fills the frame…
  { at: CUT, shot: DRAWING_SHOT },
  // …and, at the same instant, the same drawing over the real façade.
  { at: CUT, shot: ELEVATION_SHOT },
  { at: 2.6, shot: { ...ELEVATION_SHOT, position: [0, ELEVATION_CENTER[1], DRAW_Z + 0.04] }, ease: (t) => t },
  // Blue hour: the whole portico as the lights come up.
  { at: 4.1, shot: { position: [0, 1.7, 24], target: [0, 4.6, 0], fov: 28, fit: [11.4, 9.8] } },
  // The doors swing in.
  { at: 5.35, shot: { position: [0, 2.1, 10.5], target: [0, 3.0, -1.5], fov: 38, fit: [4.6, 5.6] }, ease: easeInOutCubic },
  // Up the steps, between the inner columns…
  { at: 6.45, shot: { position: [0, 2.55, 1.3], target: [0, 2.9, -10], fov: 48 } },
  // …into the white hall under the chandeliers.
  { at: 7.4, shot: { position: [0, 2.45, -2.4], target: [0, 4.05, -26], fov: 52 }, ease: easeOut },
  { at: INTRO, shot: END_SHOT },
];

/**
 * Behind the content: the end shot, walking slowly down the hall as the guest scrolls
 * (scroll 0 = exactly the end shot, so the hand-off doesn't move).
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(scroll);
  const sway = still ? 0 : Math.sin(seconds * 0.12) * 0.22;
  return {
    position: [END_SHOT.position[0] + sway, END_SHOT.position[1] + 0.25 * s, END_SHOT.position[2] - 9 * s],
    target: [sway * 0.5, END_SHOT.target[1] + 0.6 * s, END_SHOT.target[2]],
    fov: END_SHOT.fov - 4 * s,
  };
}

