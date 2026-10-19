import { CatmullRomCurve3, Vector3 } from 'three';
import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { CUT, easeInOutCubic, INTRO } from './timeline';

/**
 * The blossom-oud world and its camera, as data.
 *   z = +40          the envelope world (gate), on plum satin
 *   z = −3 … −9.5    a thick Andalusian gate wall pierced by a horseshoe arch (an iwan passage);
 *                    rose-satin curtains hang just inside its mouth, the crystal chandelier hangs
 *                    from the vault
 *   z = −8 … −80     the palm avenue in pink mist: a water channel, myrtle hedges, lanterns
 *   z = −84          the palace gate, the couple's names in gold on a cartouche above it
 * Lenses: 35 mm ≈ 37.8° vertical, 24 mm ≈ 53°.
 */
export const GATE_Z = 40;
export const WALL_FRONT = -3;
export const WALL_DEPTH = 6.5;
export const ARCH = { r: 3.2, cy: 6.2, horseshoe: (20 * Math.PI) / 180 };
export const CURTAIN_Z = -3.42;
export const CURTAIN_W = 3.12;
export const CURTAIN_H = 9.7;
export const TIE_Y = 3.3;
export const HANG: Vec3 = [0, 9.25, -4.5];
export const CHANDELIER: Vec3 = [0, 6.9, -4.5];
export const PALACE_Z = -84;
export const NAMES_Y = 10.05;
export const AVENUE = { start: -12, end: -77, palmX: 4.7, lanternX: 3.0, hedgeX: 2.05 };

/** Half-width of the arch opening at its springing (the horseshoe's narrowed ends). */
export const archHalfWidth = () => ARCH.r * Math.cos(ARCH.horseshoe);

/** S1 opening frame and the gate: the envelope in the middle band, plum satin all round. */
export const GATE_SHOT: Shot = { position: [0, 0.12, GATE_Z + 9.4], target: [0, 0.02, GATE_Z], fov: 30, fit: [3.9, 4.9] };

/** A point on the 15° orbit around the chandelier's axis (deg = 0 is the start of S2). */
export function orbit(deg: number, y: number): Vec3 {
  const r = Math.hypot(1.3, 1.0);
  const a0 = Math.atan2(1.0, 1.3);
  const a = a0 - (deg * Math.PI) / 180;
  return [CHANDELIER[0] + Math.cos(a) * r, y, CHANDELIER[2] + Math.sin(a) * r];
}

/** Where the opening ends (and the content's scroll path begins): the avenue, the palace, the names. */
export const END_SHOT: Shot = { position: [0, 2.35, -40], target: [0, 6.2, PALACE_Z], fov: 35, fit: [11, 14] };

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeIn = (t: number) => t * t;
const linear = (t: number) => t;

export const TRACK: TrackKey[] = [
  { at: 0, shot: GATE_SHOT },
  { at: 0.55, shot: { position: [0, 0.06, GATE_Z + 8.8], target: [0, 0.0, GATE_Z], fov: 30, fit: [3.8, 4.7] } },
  // Leaning into the light pouring out of the envelope…
  { at: CUT, shot: { position: [0, -0.1, GATE_Z + 7.0], target: [0, 0.2, GATE_Z], fov: 30, fit: [3.2, 3.6] }, ease: easeIn },
  // …cut (inside the bloom) to S1: frontal on the closed curtains in the horseshoe arch.
  { at: CUT + 0.001, shot: { position: [0, 4.4, 14.2], target: [0, 4.75, CURTAIN_Z], fov: 37.8, fit: [7.8, 11.4] }, ease: linear },
  { at: 1.7, shot: { position: [0, 4.35, 13.4], target: [0, 4.75, CURTAIN_Z], fov: 37.8, fit: [7.6, 11.2] }, ease: easeOut },
  // The curtains part; the camera draws in, looking up toward the chandelier.
  { at: 3.25, shot: { position: [0, 3.7, 8.0], target: [0, 5.7, -4.3], fov: 38, fit: [6.2, 7.6] } },
  // S2 · 24 mm, low angle under the chandelier…
  { at: 4.2, shot: { position: orbit(0, 1.15), target: [0, 6.8, CHANDELIER[2]], fov: 50, fit: [2.6, 2.5] }, ease: easeInOutCubic },
  // …a slow 15° orbit…
  { at: 5.05, shot: { position: orbit(15, 1.3), target: [0, 6.65, CHANDELIER[2]], fov: 50, fit: [2.6, 2.5] }, ease: linear },
  // …tilting down past it, toward the far end of the passage.
  { at: 5.7, shot: { position: [0.4, 1.8, -4.4], target: [0, 3.0, -44], fov: 40 }, ease: easeInOutCubic },
  // S3 · through the arch and down the avenue.
  { at: 6.7, shot: { position: [0.12, 2.0, -20], target: [0, 4.4, PALACE_Z], fov: 36, fit: [9, 12] }, ease: linear },
  { at: 7.75, shot: { position: [0.02, 2.25, -36.5], target: [0, 5.9, PALACE_Z], fov: 35, fit: [11, 14] }, ease: easeOut },
  { at: INTRO, shot: END_SHOT, ease: easeOutQuart },
];

/** The content page's dolly: down the avenue on a Catmull-Rom path, arriving at the palace gate. */
const PATH = new CatmullRomCurve3(
  [new Vector3(...END_SHOT.position), new Vector3(0.45, 2.15, -50), new Vector3(-0.35, 2.05, -59), new Vector3(0, 2.3, -68.5)],
  false,
  'centripetal',
);
const AIM = new CatmullRomCurve3(
  [new Vector3(...END_SHOT.target), new Vector3(0.1, 6.0, PALACE_Z), new Vector3(-0.05, 5.9, PALACE_Z), new Vector3(0, 5.75, PALACE_Z)],
  false,
  'centripetal',
);
const _p = new Vector3();
const _a = new Vector3();

export function pathPoint(s: number): Vec3 {
  PATH.getPoint(Math.min(1, Math.max(0, s)), _p);
  return [_p.x, _p.y, _p.z];
}

/**
 * Behind the content: scroll 0 is exactly the end shot (the hand-off doesn't move), scroll 1
 * stands before the palace gate.
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(Math.min(1, Math.max(0, scroll)));
  PATH.getPoint(s, _p);
  AIM.getPoint(s, _a);
  const sway = still ? 0 : Math.sin(seconds * 0.1) * 0.16;
  const bob = still ? 0 : Math.sin(seconds * 0.07 + 1.3) * 0.05;
  const k = (a: number, b: number) => a + (b - a) * s;
  return {
    position: [_p.x + sway, _p.y + bob, _p.z],
    target: [_a.x + sway * 0.3, _a.y, _a.z],
    fov: k(35, 37),
    fit: [k(11, 5.6), k(14, 10.5)],
  };
}
