import { Quaternion, Vector3 } from 'three';
import { landDots } from '@/lib/land-dots';
import { LAND_BITS } from '@/lib/land-dots.data';
import { dirAt, gateQuat, makeRoute, type LatLon, type Route } from './route';

/**
 * Orthographic globe for the 2D path: the same land dots as the 3D globe, turned so `focus` faces
 * the viewer (north up), projected into an SVG box of radius `r` around (cx, cy). Dots are one
 * path of zero-length segments drawn with round caps (one element, not thousands).
 */
export interface Ortho {
  dots: string;
  project: (v: Vector3) => { x: number; y: number; z: number };
}

const fmt = (n: number) => Math.round(n * 10) / 10;

export function ortho(focus: Vector3, cx: number, cy: number, r: number, elevation = 0): Ortho {
  const q = gateQuat(focus, 0, new Quaternion());
  if (elevation) q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), elevation));
  const project = (v: Vector3) => {
    const p = v.clone().applyQuaternion(q);
    return { x: cx + p.x * r, y: cy - p.y * r, z: p.z };
  };
  const { positions } = landDots(LAND_BITS.low, 'low', 1);
  const v = new Vector3();
  let d = '';
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i]!, positions[i + 1]!, positions[i + 2]!);
    const p = project(v);
    if (p.z > 0.06) d += `M${fmt(p.x)} ${fmt(p.y)}h0`;
  }
  return { dots: d, project };
}

/** The route as an SVG path on that globe, lifted off the surface like the 3D arc. Hidden side skipped. */
export function arcPath(route: Route, o: Ortho, lift = 0.16, steps = 48): { d: string; start: { x: number; y: number }; end: { x: number; y: number } } {
  const pts: { x: number; y: number }[] = [];
  const v = new Vector3();
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    dirAt(route, s, v).multiplyScalar(1 + lift * Math.sin(Math.PI * s) * Math.min(1, route.theta * 2.5));
    const p = o.project(v);
    if (p.z > -0.05 || Math.hypot(v.x, v.y) > 1) pts.push({ x: p.x, y: p.y });
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join(' ');
  return { d, start: pts[0]!, end: pts[pts.length - 1]! };
}

/** Midpoint of a route (unit vector), to centre a 2D globe on the whole flight. */
export function routeMid(route: Route): Vector3 {
  return dirAt(route, 0.5, new Vector3());
}

export function routeFor(origin: LatLon | null, destination: LatLon | null): Route {
  return makeRoute(origin, destination);
}
