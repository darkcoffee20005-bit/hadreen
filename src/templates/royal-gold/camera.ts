import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { easeInOutCubic, INTRO } from './timeline';

/**
 * The royal-gold camera as data. The pochette lives in its own little world below the hall
 * (G); the light burst covers the cut between the two.
 */
export const G: Vec3 = [0, -30, 0];
export const g = (x: number, y: number, z: number): Vec3 => [G[0] + x, G[1] + y, G[2] + z];

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export const END_SHOT: Shot = { position: [0, 3.35, 25.5], target: [0, 4.5, 0], fov: 16.5, fit: [6.6, 10.0] };

export const TRACK: TrackKey[] = [
  // S1 · pochette, 50 mm, frontal.
  { at: 0, shot: { position: g(0, -0.25, 5.6), target: g(0, -0.05, 0), fov: 27, fit: [3.0, 4.7] } },
  { at: 0.45, shot: { position: g(0, -0.2, 5.4), target: g(0, -0.05, 0), fov: 27, fit: [3.0, 4.5] } },
  { at: 1.55, shot: { position: g(0, -0.75, 6.4), target: g(0, -0.05, 0), fov: 28, fit: [4.4, 5.6] } },
  // Into the light…
  { at: 2.42, shot: { position: g(0, -0.08, 1.4), target: g(0, 0, 0), fov: 34, fit: [0.4, 0.4] }, ease: easeIn },
  // …and out of it: S2 · arch and lanterns, 28 mm.
  { at: 2.5, shot: { position: [0, 3.3, 5.8], target: [0, 4.7, 0], fov: 46, fit: [4.8, 5.6] } },
  { at: 4.7, shot: { position: [0, 2.3, 11.4], target: [0, 4.35, 0], fov: 46, fit: [8.6, 9.8] }, ease: easeOut },
  // S3 · dolly back while the lens lengthens to 85 mm: the mosque looms through the arch.
  { at: 5.75, shot: { position: [0, 2.7, 17], target: [0, 4.2, 0], fov: 28, fit: [7.2, 9.8] }, ease: easeIn },
  { at: 6.9, shot: { position: [0, 3.3, 27.5], target: [0, 4.55, 0], fov: 16, fit: [6.6, 10.4] }, ease: easeOut },
  { at: INTRO, shot: END_SHOT },
];

/**
 * Behind the content: the end shot, pushed slowly through the arch toward the mosque as the
 * guest scrolls (scroll 0 = exactly the end shot, so the hand-off doesn't move).
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(scroll);
  const sway = still ? 0 : Math.sin(seconds * 0.1) * 0.25;
  return {
    position: [END_SHOT.position[0] + sway, END_SHOT.position[1] - 0.45 * s, END_SHOT.position[2] - 19 * s],
    target: [0, END_SHOT.target[1] + 0.6 * s, END_SHOT.target[2] - 34 * s],
    fov: END_SHOT.fov + 5.5 * s,
    fit: END_SHOT.fit,
  };
}
