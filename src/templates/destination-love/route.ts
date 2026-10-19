import { Matrix4, Quaternion, Vector3 } from 'three';
import { latLonToVec3 } from '@/lib/land-dots';

/**
 * The flight as maths. The globe lives in its own local frame (latitude up +Y, longitude 0 facing
 * +Z, east +X: the same orientation as land-dots); the scene only ever rotates the globe group.
 * During the chase the globe turns so the plane sits on top of the world heading away from the
 * camera (−Z); that keeps every camera move route-independent data.
 */
export const R = 2; // globe radius, world units
export type V3 = [number, number, number];
export interface LatLon {
  lat: number;
  lon: number;
}

const BAGHDAD: LatLon = { lat: 33.315, lon: 44.366 };
/** With no origin (or the same city), the plane comes in from the west-north-west, from over the horizon. */
const VIRTUAL_BEARING = (300 * Math.PI) / 180;
const VIRTUAL_DISTANCE = 0.62; // radians of arc (~4 000 km)
/** Wheels above the surface, so the fuselage never sinks into the land dots. */
export const CLEARANCE = 0.014;

export interface Route {
  /** Unit vectors, globe-local. */
  a: Vector3;
  b: Vector3;
  /** Normal of the great-circle plane (a × b, unit). */
  axis: Vector3;
  /** Central angle a → b, radians. */
  theta: number;
  /** Peak altitude above the surface, world units. */
  hMax: number;
  /** No real origin: the arc starts aloft, just over the horizon. */
  virtual: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function unit(p: LatLon): Vector3 {
  return new Vector3(...latLonToVec3(p.lat, p.lon, 1));
}

/** Latitude/longitude (degrees) of a unit vector in the globe frame. */
export function toLatLon(v: Vector3): LatLon {
  return { lat: (Math.asin(clamp(v.y, -1, 1)) * 180) / Math.PI, lon: (Math.atan2(v.x, v.z) * 180) / Math.PI };
}

/** The point `distance` radians from `from` along an initial `bearing` (radians, clockwise from north). */
export function destinationPoint(from: LatLon, bearing: number, distance: number): LatLon {
  const φ1 = (from.lat * Math.PI) / 180;
  const λ1 = (from.lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(distance) + Math.cos(φ1) * Math.sin(distance) * Math.cos(bearing));
  const λ2 = λ1 + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(φ1), Math.cos(distance) - Math.sin(φ1) * Math.sin(φ2));
  let lon = (λ2 * 180) / Math.PI;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: (φ2 * 180) / Math.PI, lon };
}

export function makeRoute(origin: LatLon | null, destination: LatLon | null): Route {
  const dest = destination ?? BAGHDAD;
  const b = unit(dest);
  let virtual = !origin;
  let a = origin ? unit(origin) : b.clone();
  if (!virtual && a.angleTo(b) < 0.03) virtual = true; // same city (or next door): nothing to fly
  if (virtual) a = unit(destinationPoint(dest, VIRTUAL_BEARING, VIRTUAL_DISTANCE));
  // Antipodes have no single great circle: nudge the start a hair off the line.
  if (a.angleTo(b) > Math.PI - 0.02) a.add(new Vector3(0.03, 0.02, 0)).normalize();
  const theta = a.angleTo(b);
  const axis = new Vector3().crossVectors(a, b).normalize();
  const hMax = R * Math.min(0.3, 0.035 + 0.16 * theta);
  return { a, b, axis, theta, hMax, virtual };
}

/** Unit direction at progress s ∈ [0, 1] along the great circle. */
export function dirAt(route: Route, s: number, out = new Vector3()): Vector3 {
  const { a, b, theta } = route;
  const k = Math.sin(theta);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - s) * theta) / k)
    .addScaledVector(b, Math.sin(s * theta) / k);
}

/** Horizontal heading (unit tangent of the great circle) at s. */
export function headingAt(route: Route, s: number, out = new Vector3()): Vector3 {
  const d = dirAt(route, s, out);
  return out.crossVectors(route.axis, d).normalize();
}

/** Altitude profile 0..1: a flat roll, a climb, a cruise crest, a descent, a flat landing. */
export function altitudeShape(s: number, virtual: boolean): number {
  const x = clamp(s, 0, 1);
  if (virtual) return 1 - smoothstep(0.5, 1, x);
  return x < 0.5 ? smoothstep(0, 0.5, x) : smoothstep(1, 0.5, x);
}

export function altitudeAt(route: Route, s: number): number {
  return route.hMax * altitudeShape(s, route.virtual);
}

/** Globe-local position of the plane (or a trail sample) at s. */
export function positionAt(route: Route, s: number, out = new Vector3(), lift = CLEARANCE): Vector3 {
  return dirAt(route, s, out).multiplyScalar(R + altitudeAt(route, s) + lift);
}

/**
 * The plane's orientation at s as a rotation (model: nose +Z, up +Y, right wing −X... i.e. a
 * right-handed basis built from forward and radial up). The climb is drawn at 60 % of the path's
 * true pitch: on a globe this small the honest angle looks like a rocket.
 */
export function planeQuat(route: Route, s: number, out = new Quaternion()): Quaternion {
  const e = 1e-3;
  const dir = dirAt(route, s, new Vector3());
  const h = headingAt(route, s, new Vector3());
  const da = (altitudeAt(route, Math.min(1, s + e)) - altitudeAt(route, Math.max(0, s - e))) / (Math.min(1, s + e) - Math.max(0, s - e));
  const fwd = h.multiplyScalar(route.theta * (R + altitudeAt(route, s))).addScaledVector(dir, da * 0.6).normalize();
  const up = dir.addScaledVector(fwd, -dir.dot(fwd)).normalize();
  const side = new Vector3().crossVectors(up, fwd);
  return out.setFromRotationMatrix(new Matrix4().makeBasis(side, up, fwd));
}

/* ───────────── globe orientation ───────────── */

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
/** In the gate shot the focus city sits this far (radians) above the globe's centre. */
export const GATE_ELEVATION = 0.3;

/** North-up orientation that turns `focus` toward the camera (+Z), a little above centre. */
export function gateQuat(focus: Vector3, yaw = 0, out = new Quaternion()): Quaternion {
  const { lat, lon } = toLatLon(focus);
  const qy = new Quaternion().setFromAxisAngle(Y, (-lon * Math.PI) / 180 + yaw);
  const qx = new Quaternion().setFromAxisAngle(X, (lat * Math.PI) / 180 - GATE_ELEVATION);
  return out.multiplyQuaternions(qx, qy);
}

/** Orientation that puts `p` on top of the world (+Y) with the heading `h` pointing away (−Z). */
export function chaseQuat(p: Vector3, h: Vector3, out = new Quaternion()): Quaternion {
  const hp = new Vector3().crossVectors(h, p);
  const local = new Matrix4().makeBasis(h, p, hp);
  const world = new Matrix4().makeBasis(new Vector3(0, 0, -1), Y, X);
  return out.setFromRotationMatrix(world.multiply(local.transpose()));
}

/** Chase orientation at route progress s. */
export function chaseQuatAt(route: Route, s: number, out = new Quaternion()): Quaternion {
  return chaseQuat(dirAt(route, s, new Vector3()), headingAt(route, s, new Vector3()), out);
}

/** The point the gate looks at: the origin city, or the destination when there is none. */
export function gateFocus(route: Route): Vector3 {
  return route.virtual ? route.b : route.a;
}
