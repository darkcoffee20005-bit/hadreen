/**
 * Camera shots as data, and the maths that keeps them composed on any screen shape.
 * A shot names what must stay in frame (`fit`, in world units around the target); on a narrow
 * phone the camera backs off along its own line of sight until that box fits.
 */
export type Vec3 = [number, number, number];

export interface Shot {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Width and height (world units, at the target) that must remain visible. */
  fit?: [number, number];
}

const DEG = Math.PI / 180;

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Distance needed for a w×h box at the target to fit a camera with this fov and aspect. */
export function fitDistance(fit: [number, number], fovDeg: number, aspect: number): number {
  const halfV = Math.tan((fovDeg * DEG) / 2);
  const halfH = halfV * aspect;
  return Math.max(fit[1] / 2 / halfV, fit[0] / 2 / halfH);
}

/** The shot's position, pushed back along its view direction if the subject wouldn't fit. */
export function framedPosition(shot: Shot, aspect: number): Vec3 {
  if (!shot.fit) return shot.position;
  const offset = sub(shot.position, shot.target);
  const current = length(offset);
  const needed = fitDistance(shot.fit, shot.fov, aspect);
  return needed > current && current > 0 ? add(shot.target, scale(offset, needed / current)) : shot.position;
}

export function lerpShot(a: Shot, b: Shot, t: number): Shot {
  const fit: [number, number] | undefined =
    a.fit && b.fit ? [lerp(a.fit[0], b.fit[0], t), lerp(a.fit[1], b.fit[1], t)] : t < 0.5 ? a.fit : b.fit;
  return {
    position: lerpVec(a.position, b.position, t),
    target: lerpVec(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
    fit,
  };
}

/** Smooth start and stop, like a dolly with a good grip operator. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** A keyframe on the opening's camera track. `ease` shapes the move that arrives at this key. */
export interface TrackKey {
  at: number; // seconds into the opening
  shot: Shot;
  ease?: (t: number) => number;
}

/** The shot at `time` on a track; holds the first/last key outside the track. Pure, so seeking is exact. */
export function evaluateTrack(track: TrackKey[], time: number): Shot {
  if (track.length === 0) throw new Error('empty camera track');
  if (time <= track[0]!.at) return track[0]!.shot;
  for (let i = 1; i < track.length; i++) {
    const b = track[i]!;
    if (time <= b.at) {
      const a = track[i - 1]!;
      const span = b.at - a.at;
      const u = span > 0 ? (time - a.at) / span : 1;
      return lerpShot(a.shot, b.shot, (b.ease ?? easeInOutCubic)(u));
    }
  }
  return track[track.length - 1]!.shot;
}
