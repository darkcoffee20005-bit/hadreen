import { Quaternion, Vector3 } from 'three';
import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { chaseQuatAt, gateFocus, gateQuat, positionAt, R, smoothstep, type Route } from './route';

/**
 * The destination-love opening as a pure function of time. The GSAP timeline only tweens
 * `director.time` (0 → INTRO) and fires sounds; every visual reads `introState(t)`, so skip, seek
 * (capture "mid"), and the marketing thumbnails' rewind all land exactly.
 *
 *   0.00–1.00  the plane rolls off the origin pin and lifts off; the camera swoops in behind it
 *   1.00–6.00  S2 chase: great-circle arc, the gold trail grows, the globe turns, clouds stream by
 *   6.00–7.60  S3 descent, top-down onto the wedding city; city lights bloom; touchdown on the pin
 *   7.60–9.00  the boarding pass rises out of the venue pin to face the camera; hand-off
 */
export const INTRO = 9;
export const T_ROLL = 0.25;
export const T_LAND = 7.6;
const ACCEL = 1.3;
const DECEL = 1.45;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeOutBack = (x: number) => {
  const t = clamp01(x);
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/**
 * Flight progress 0..1: a smooth take-off acceleration, an even cruise, and a deceleration that
 * comes to rest on the venue pin at T_LAND (trapezoid speed with smoothstep ramps, integrated).
 * With no origin the plane is already cruising when the opening starts.
 */
export function flightProgress(t: number, virtual = false): number {
  const t0 = virtual ? 0 : T_ROLL;
  const a = virtual ? 0 : ACCEL;
  const c = DECEL;
  const cruise = T_LAND - t0 - a - c;
  const total = 0.5 * a + cruise + 0.5 * c;
  if (t <= t0) return 0;
  if (t >= T_LAND) return 1;
  const x = t - t0;
  let d: number;
  if (x < a) {
    const u = x / a;
    d = a * (u * u * u - (u * u * u * u) / 2);
  } else if (x < a + cruise) d = 0.5 * a + (x - a);
  else {
    const u = (x - a - cruise) / c;
    d = 0.5 * a + cruise + c * (u - u * u * u + (u * u * u * u) / 2);
  }
  return d / total;
}

export interface IntroState {
  /** Plane progress along the route. */
  s: number;
  /** Progress the globe's orientation follows (runs ahead of the plane for the descent). */
  sFrame: number;
  /** 0 = the gate's north-up orientation, 1 = the chase orientation. */
  gateToChase: number;
  /** The gold trail's head (route progress), and its opacity. */
  trail: number;
  trailOpacity: number;
  /** Origin pin pulse strength. */
  originPulse: number;
  /** Destination glow 0..1 (city lights), plus a touchdown flash. */
  cityGlow: number;
  flash: number;
  /** Cloud wisps 0..1 (medium/high only). */
  clouds: number;
  /** The gate's boarding-pass corner, tucking away behind the globe. */
  peek: number;
  /** The boarding pass rising out of the venue pin, 0..1. */
  rise: number;
  /** The plane's size (it fades in from over the horizon when there's no origin). */
  planeScale: number;
}

export function introState(t: number, virtual = false): IntroState {
  const s = flightProgress(t, virtual);
  const lock = easeInOutCubic((t - 5.4) / 1.3);
  return {
    s,
    sFrame: s + (1 - s) * lock,
    gateToChase: easeInOutCubic((t - 0.1) / 1.6),
    trail: s,
    trailOpacity: smoothstep(0.15, 0.6, t),
    originPulse: 1 - smoothstep(0.6, 2.2, t),
    cityGlow: smoothstep(5.6, 7.4, t),
    flash: smoothstep(7.45, 7.62, t) * (1 - smoothstep(7.62, 8.6, t)),
    clouds: smoothstep(1.0, 1.9, t) * (1 - smoothstep(5.2, 6.1, t)),
    peek: 1 - smoothstep(0.0, 0.8, t),
    rise: smoothstep(7.5, 8.95, t),
    planeScale: virtual ? smoothstep(0.4, 1.4, t) : 1,
  };
}

/* ───────────── the world at time t ───────────── */

/** Globe orientation at time t of the opening (no gate sway). */
export function globeQuat(route: Route, t: number, out = new Quaternion()): Quaternion {
  const st = introState(t, route.virtual);
  const gate = gateQuat(gateFocus(route), 0, new Quaternion());
  const chase = chaseQuatAt(route, st.sFrame, new Quaternion());
  return out.slerpQuaternions(gate, chase, st.gateToChase);
}

/** World position of the plane at time t. */
export function planeWorld(route: Route, t: number, out = new Vector3()): Vector3 {
  const st = introState(t, route.virtual);
  return positionAt(route, st.s, out).applyQuaternion(globeQuat(route, t));
}

/* ───────────── camera ───────────── */

const lens = (mm: number) => (2 * Math.atan(12 / mm) * 180) / Math.PI; // vertical fov, full frame
export const FOV = { s1: lens(35), s2: lens(28), s3: lens(50) };

/** Where the boarding pass ends up, and the camera that faces it. */
export const PASS_END: Vec3 = [0, R + 0.56, 0.24];
const END_ELEVATION = (24 * Math.PI) / 180;
const END_DISTANCE = 2.35;

export const GATE_SHOT: Shot = { position: [0, 0.3, 15], target: [0, 0.12, 0], fov: FOV.s1, fit: [5.25, 8.4] };
export const DESCENT_SHOT: Shot = { position: [0, R + 1.62, 0.66], target: [0, R + 0.01, -0.06], fov: FOV.s3, fit: [1.25, 1.25] };
export const END_SHOT: Shot = {
  position: [PASS_END[0], PASS_END[1] + Math.sin(END_ELEVATION) * END_DISTANCE, PASS_END[2] + Math.cos(END_ELEVATION) * END_DISTANCE],
  target: PASS_END,
  fov: 30,
  fit: [2.0, 1.45],
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function mixShot(a: Shot, b: Shot, k: number): Shot {
  return {
    position: lerpV(a.position, b.position, k),
    target: lerpV(a.target, b.target, k),
    fov: lerp(a.fov, b.fov, k),
    fit: a.fit && b.fit ? [lerp(a.fit[0], b.fit[0], k), lerp(a.fit[1], b.fit[1], k)] : (k < 0.5 ? a.fit : b.fit),
  };
}

/** S2: behind and above the plane, drifting from its right shoulder to its left. */
export function chaseShot(route: Route, t: number): Shot {
  const p = planeWorld(route, t);
  const k = smoothstep(1.2, 5.9, t);
  const side = lerp(0.24, -0.2, k);
  const up = lerp(0.3, 0.22, k);
  const back = lerp(0.56, 0.66, k);
  return {
    position: [p.x + side, p.y + up, p.z + back],
    target: [p.x + side * 0.2, p.y + 0.02, p.z - 0.42],
    fov: FOV.s2,
    fit: [0.62, 0.5],
  };
}

/** The camera at any second of the opening. */
export function shotAt(route: Route, t: number): Shot {
  if (t <= 0) return GATE_SHOT;
  if (t < 1.9) return mixShot(GATE_SHOT, chaseShot(route, t), easeInOutCubic((t - 0.12) / 1.75));
  if (t < 5.55) return chaseShot(route, t);
  if (t < 7.0) return mixShot(chaseShot(route, t), DESCENT_SHOT, easeInOutCubic((t - 5.55) / 1.45));
  if (t < 7.45) return DESCENT_SHOT;
  return mixShot(DESCENT_SHOT, END_SHOT, easeInOutCubic((t - 7.45) / 1.45));
}

const linear = (u: number) => u;
/** The camera track the engine's director plays: shotAt sampled densely, played back linearly. */
export function buildTrack(route: Route, fps = 30): TrackKey[] {
  const n = Math.ceil(INTRO * fps);
  return Array.from({ length: n + 1 }, (_, i) => {
    const at = (i / n) * INTRO;
    return { at, shot: shotAt(route, at), ease: linear };
  });
}

/**
 * Behind the content: a planet-rise view (the globe's limb across the lower screen, the wedding
 * city glowing on the dusk line); scrolling orbits the camera around the globe's axis.
 */
export function ambientShot(scroll: number, seconds: number, still: boolean): Shot {
  const s = easeInOutCubic(scroll);
  const a = -1.05 * s + (still ? 0 : Math.sin(seconds * 0.07) * 0.05);
  const dist = 8.6 - 1.2 * s;
  const h = R + 1.1 - 0.5 * s;
  return {
    position: [Math.sin(a) * dist, h, Math.cos(a) * dist],
    target: [Math.sin(a) * 0.4, R * 1.22 + 0.15 * s, Math.cos(a) * 0.4],
    fov: 35,
  };
}
