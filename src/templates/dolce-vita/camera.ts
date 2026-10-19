import type { Shot, TrackKey } from '@/lib/invite/stage/rig';
import { easeInOutCubic, INTRO } from './timeline';
import { CARD, ENVELOPE } from './world';

/**
 * The dolce-vita camera as data.
 *  S1  45 mm, close and looking down ~35° on the card on the stone rail, framed by roses
 *  S2  24 mm, a crane up and back over the roses: the lake, mountains, villas and the boat
 *  S3  40 mm, an arc down to the table: the envelope with the lake behind (the ambient frame)
 */
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const C = CARD;
const E = ENVELOPE;

export const GATE_SHOT: Shot = { position: [C[0], C[1] + 0.5, C[2] + 0.74], target: [C[0], C[1] + 0.05, C[2] - 0.03], fov: 30, fit: [0.5, 0.74] };

export const END_SHOT: Shot = { position: [E[0] + 0.8, E[1] + 0.36, E[2] + 1.9], target: [E[0] - 0.02, E[1] + 0.24, E[2]], fov: 33, fit: [0.78, 0.98] };

export const TRACK: TrackKey[] = [
  { at: 0, shot: GATE_SHOT },
  // The burst: a breath in.
  { at: 0.6, shot: { ...GATE_SHOT, position: [C[0], C[1] + 0.66, C[2] + 0.98] } },
  // Crane up and back over the roses…
  { at: 1.9, shot: { position: [0.1, 2.2, 2.3], target: [0, 0.2, -14], fov: 40 }, ease: easeIn },
  // …onto the lake (S2, 24 mm).
  { at: 3.2, shot: { position: [0.3, 4.1, 5.6], target: [0, -2.2, -70], fov: 52 }, ease: easeOut },
  // The boat crosses; the camera drifts with it.
  { at: 5.2, shot: { position: [0.9, 3.8, 5.3], target: [-7, -2.6, -70], fov: 50 } },
  // Arc down and round to the table (S3, 40 mm).
  { at: 6.15, shot: { position: [E[0] + 2.2, E[1] + 1.2, E[2] + 3.6], target: [E[0] - 0.8, E[1] - 0.1, E[2] - 6], fov: 40 }, ease: easeIn },
  { at: 6.9, shot: { ...END_SHOT, position: [END_SHOT.position[0] + 0.05, END_SHOT.position[1] + 0.03, END_SHOT.position[2] + 0.12] }, ease: easeOut },
  { at: INTRO, shot: END_SHOT },
];

/**
 * Behind the content: the envelope settles into the lower third (the lake and mountains stay calm
 * behind the hero) and, as the guest scrolls, the camera follows the letter up out of it.
 * scroll 0 is a gentle move from END_SHOT; the shell blends into it after the hand-off.
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(Math.min(1, scroll * 1.5));
  const sway = still ? 0 : Math.sin(seconds * 0.09) * 0.05;
  const mixv = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
  const p = mixv([E[0] + 0.95, E[1] + 0.5, E[2] + 2.3], [E[0] + 0.62, E[1] + 0.34, E[2] + 1.45]);
  return {
    position: [p[0] + sway, p[1], p[2]],
    target: mixv([E[0] - 0.2, E[1] + 0.72, E[2] - 0.8], [E[0] - 0.04, E[1] + 0.3, E[2]]),
    fov: 33,
    fit: [0.55, 0.9],
  };
}
