import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { easeInOutCubic, INTRO } from './timeline';

/**
 * The eternal-romance camera as data. A theatre: the velvet curtain hangs at z = 0, the candlelit
 * table stands on the stage behind it (TABLE), and the venue façade is drawn in gold on the back
 * wall (z ≈ −14). Lenses: 35 mm ≈ 37.8° vertical, 50 mm ≈ 27°.
 */
export const TABLE: Vec3 = [0, 0, -3.2];
export const TABLE_TOP = 0.76;
const tb = (x: number, y: number, z: number): Vec3 => [TABLE[0] + x, TABLE[1] + y, TABLE[2] + z];

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** S1 · the curtain, frontal, filling the frame from the fringe to the valance. */
export const GATE_SHOT: Shot = { position: [0, 4.6, 12.7], target: [0, 4.6, 0], fov: 37.8, fit: [4.2, 8.6] };

/** S3 end: the façade in gold on the back wall, the raised swags framing the top, the table glowing below. */
export const END_SHOT: Shot = { position: [0, 3.0, 13], target: [0, 4.4, -14], fov: 37.8, fit: [9.4, 12.5] };

/** The name card on the table (focus target). */
export const CARD: Vec3 = tb(0, TABLE_TOP + 0.15, 0.43);

export const TRACK: TrackKey[] = [
  { at: 0, shot: GATE_SHOT },
  // The curtain starts to rise; the camera leans in a touch.
  { at: 0.7, shot: { position: [0, 4.5, 12.3], target: [0, 4.4, 0], fov: 37.8, fit: [4.2, 8.4] } },
  // Under the rising hem: the dark stage, the candles glowing on the table.
  { at: 2.25, shot: { position: [0, 2.85, 7.4], target: tb(0, 1.2, 0), fov: 33, fit: [3.4, 3.0] }, ease: easeInOutCubic },
  // S2 · 50 mm, 45° high angle on the table.
  { at: 3.15, shot: { position: tb(1.05, 2.3, 1.95), target: tb(0, 0.86, 0.05), fov: 27, fit: [1.75, 1.35] }, ease: easeOut },
  // …a slow dolly to the gold frame with the names.
  { at: 5.2, shot: { position: tb(0.17, 1.26, 1.06), target: CARD, fov: 27, fit: [0.62, 0.6] } },
  // S3 · pull back, wide: the façade draws itself on the back wall.
  { at: 6.55, shot: { position: [0, 2.7, 6.5], target: [0, 3.6, -14], fov: 36, fit: [8.2, 10.5] }, ease: easeIn },
  { at: 7.7, shot: { position: [0, 2.95, 12.2], target: [0, 4.35, -14], fov: 37.8, fit: [9.4, 12.4] }, ease: easeOutQuart },
  { at: INTRO, shot: END_SHOT },
];

/**
 * Behind the content: the end shot drifting, as the guest scrolls, down through the proscenium
 * and in over the candlelit table (scroll 0 = exactly the end shot, so the hand-off doesn't move).
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(Math.min(1, Math.max(0, scroll)));
  const sway = still ? 0 : Math.sin(seconds * 0.11) * 0.18;
  const bob = still ? 0 : Math.sin(seconds * 0.07 + 1.3) * 0.05;
  // Scrolled to the end: the table high in the frame, the dark stage floor with fallen petals and
  // the candles' glow below it, where the closing line sits.
  const near: Shot = { position: tb(0.55, 1.6, 3.5), target: tb(0, 0.32, 0.55), fov: 34, fit: [1.3, 1.2] };
  const k = (a: number, b: number) => a + (b - a) * s;
  return {
    position: [k(END_SHOT.position[0], near.position[0]) + sway * (1 - 0.6 * s), k(END_SHOT.position[1], near.position[1]) + bob, k(END_SHOT.position[2], near.position[2])],
    target: [k(END_SHOT.target[0], near.target[0]), k(END_SHOT.target[1], near.target[1]), k(END_SHOT.target[2], near.target[2])],
    fov: k(END_SHOT.fov, near.fov),
    fit: [k(END_SHOT.fit![0], near.fit![0]), k(END_SHOT.fit![1], near.fit![1])],
  };
}
