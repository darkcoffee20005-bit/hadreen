/**
 * Pure geometry for royal-gold: outlines and lathe profiles as plain numbers, so they can be
 * unit-tested and turned into three.js geometry by the parts. Units are metres-ish.
 */
export type P2 = [number, number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A two-centred pointed (Islamic) arch: left foot → up the jamb → over the apex → down to the
 * right foot. Each arc is centred on the springing line, on the far side of the axis.
 */
export function pointedArch(width: number, spring: number, apex: number, segments = 24): P2[] {
  const half = width / 2;
  const rise = apex - spring;
  const radius = (half * half + rise * rise) / (2 * half);
  const cx = -half + radius; // centre of the left arc
  const a0 = Math.PI;
  const a1 = Math.atan2(rise, -cx);
  const left: P2[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    left.push([cx + Math.cos(a) * radius, spring + Math.sin(a) * radius]);
  }
  left[left.length - 1] = [0, apex]; // exact apex
  const right = left
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as P2);
  return [[-half, 0], ...left, ...right, [half, 0]];
}

/** The arc centres and radius of the same arch (for voussoirs and the gold trim). */
export function archArcs(width: number, spring: number, apex: number) {
  const half = width / 2;
  const rise = apex - spring;
  const radius = (half * half + rise * rise) / (2 * half);
  const cx = -half + radius;
  return { radius, left: [cx, spring] as P2, right: [-cx, spring] as P2, apexAngle: Math.atan2(rise, -cx) };
}

/**
 * The wall's outline: a rectangle with the arch opening cut up from the floor and stepped merlons
 * along the top. One contour (no holes), counter-clockwise.
 */
export function wallOutline(o: { width: number; height: number; archWidth: number; spring: number; apex: number; merlon: number; segments?: number }): P2[] {
  const W = o.width / 2;
  const arch = pointedArch(o.archWidth, o.spring, o.apex, o.segments ?? 24);
  const pts: P2[] = [[-W, 0], ...arch, [W, 0], [W, o.height]];
  // Merlons from right to left: a stepped crenellation with pointed caps.
  const n = Math.max(1, Math.floor(o.width / o.merlon));
  const step = o.width / n;
  for (let i = n - 1; i >= 0; i--) {
    const x0 = -W + i * step;
    const x1 = x0 + step;
    const m = (x0 + x1) / 2;
    const h = o.height;
    const w = step * 0.36;
    pts.push([x1 - step * 0.06, h], [m + w, h], [m + w, h + step * 0.32], [m + w * 0.55, h + step * 0.32], [m + w * 0.55, h + step * 0.5], [m, h + step * 0.72], [m - w * 0.55, h + step * 0.5], [m - w * 0.55, h + step * 0.32], [m - w, h + step * 0.32], [m - w, h]);
  }
  pts.push([-W, o.height]);
  return pts;
}

/** Signed area (positive = counter-clockwise). */
export function signedArea(pts: P2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/** Offsets a simple polygon inward by `d` (mitred corners). Works for either winding. */
export function insetPolygon(pts: P2[], d: number): P2[] {
  const ccw = signedArea(pts) > 0 ? 1 : -1;
  const n = pts.length;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    // Inward normal: left of the direction for CCW, right for CW.
    const nx = (-dy / len) * ccw;
    const ny = (dx / len) * ccw;
    return { p: [p[0] + nx * d, p[1] + ny * d] as P2, dir: [dx / len, dy / len] as P2 };
  });
  return lines.map((l, i) => {
    const prev = lines[(i - 1 + n) % n]!;
    // Intersect prev line with this line.
    const [x1, y1] = prev.p;
    const [dx1, dy1] = prev.dir;
    const [x2, y2] = l.p;
    const [dx2, dy2] = l.dir;
    const den = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(den) < 1e-9) return l.p;
    const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
    return [x1 + dx1 * t, y1 + dy1 * t] as P2;
  });
}

/**
 * One pochette flap: hinge along y = 0 from -side/2 to side/2, point at (0, -depth). The sides
 * bow out a little and the point is drawn as an ogee, like the tip of an arch.
 */
export function flapOutline(side: number, depth: number, bow = 0.05, samples = 14): P2[] {
  const pts: P2[] = [[-side / 2, 0], [side / 2, 0]];
  for (let i = 1; i < samples; i++) {
    const u = i / samples;
    // Bowed out along the side, pinched in near the point (an ogee tip).
    const k = clamp01((u - 0.6) / 0.4);
    const ogee = Math.sin(Math.PI * u) * bow * (1 - 1.8 * k * k * (3 - 2 * k));
    pts.push([(side / 2) * (1 - u) + ogee * side, -depth * u]);
  }
  pts.push([0, -depth]);
  for (let i = samples - 1; i >= 1; i--) {
    const [x, y] = pts[1 + i]!;
    pts.push([-x, y]);
  }
  return pts;
}

/** Lantern lathe profiles (radius, y), bottom to top. Body = the pierced part. */
export function lanternProfiles(scale = 1) {
  const s = (pts: P2[]) => pts.map(([r, y]) => [r * scale, y * scale] as P2);
  const base = s([
    [0, -0.4],
    [0.035, -0.37],
    [0.03, -0.32],
    [0.05, -0.27],
    [0.085, -0.18],
    [0.14, -0.1],
    [0.2, -0.045],
    [0.215, -0.02],
    [0.19, 0],
  ]);
  const body = s([
    [0.19, 0],
    [0.235, 0.08],
    [0.262, 0.2],
    [0.255, 0.33],
    [0.215, 0.44],
    [0.18, 0.5],
  ]);
  const cap = s([
    [0.18, 0.5],
    [0.235, 0.52],
    [0.225, 0.55],
    [0.19, 0.6],
    [0.13, 0.68],
    [0.07, 0.75],
    [0.03, 0.79],
    [0.045, 0.83],
    [0.03, 0.87],
    [0.012, 0.95],
    [0, 1.02],
  ]);
  return { base, body, cap };
}

/** Pointed onion dome (radius, y), bottom to top. */
export function domeProfile(radius: number, height: number, samples = 18): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    // Swells to ~1.08 r just above the base, then tapers to a point with a slight ogee.
    const swell = Math.sin(Math.PI * Math.min(1, u * 1.35)) * 0.1;
    const taper = Math.pow(Math.cos((Math.PI / 2) * u), 0.75);
    pts.push([Math.max(0, radius * (taper + swell * (1 - u))), height * u]);
  }
  pts[pts.length - 1] = [0, height];
  return pts;
}

/** A slender minaret (radius, y), bottom to top, `h` tall. */
export function minaretProfile(h: number, r: number): P2[] {
  const k = h / 12;
  return [
    [0, 0],
    [r * 1.5, 0],
    [r * 1.5, 2.2 * k],
    [r * 1.05, 2.4 * k],
    [r * 0.95, 7.4 * k],
    [r * 1.55, 7.55 * k],
    [r * 1.55, 7.8 * k],
    [r * 0.85, 7.95 * k],
    [r * 0.8, 9.6 * k],
    [r * 1.3, 9.72 * k],
    [r * 1.3, 9.9 * k],
    [r * 0.78, 10.0 * k],
    [r * 0.82, 10.4 * k],
    [r * 0.55, 11.0 * k],
    [r * 0.18, 11.6 * k],
    [0, 12 * k],
  ];
}

/** Flame-shaped cypress (radius, y), bottom to top. */
export function cypressProfile(h: number, r: number, samples = 10): P2[] {
  const pts: P2[] = [[0, 0], [r * 0.12, 0], [r * 0.12, h * 0.06]];
  for (let i = 1; i <= samples; i++) {
    const u = i / samples;
    pts.push([r * Math.pow(Math.sin(Math.PI * Math.min(1, 0.18 + u * 0.82)), 0.8) * (1 - u * 0.25), h * (0.06 + 0.94 * u)]);
  }
  pts[pts.length - 1] = [0, h];
  return pts;
}

export interface Swing {
  /** Kick amplitude (radians). */
  amp: number;
  /** Seconds per full swing. */
  period: number;
  /** Seconds for the kick to fall to 1/e. */
  decay: number;
  /** Steady breeze amplitude that never dies out. */
  sway: number;
  phase: number;
}

/**
 * A lantern as a damped pendulum: an impulse at t = 0 (starts at rest, swings out), decaying,
 * plus a small steady sway at the same natural frequency that fades in so nothing jumps.
 */
export function pendulumAngle(t: number, s: Swing): number {
  if (t <= 0) return 0;
  const w = (Math.PI * 2) / s.period;
  const kick = s.amp * Math.exp(-t / s.decay) * Math.sin(w * t);
  const fade = clamp01(t / (s.period * 1.5));
  return kick + s.sway * fade * fade * Math.sin(w * t + s.phase);
}

/** The arch's outline pushed outward by `d` (same arc centres, larger radius): the extrados. */
export function archOffset(width: number, spring: number, apex: number, d: number, segments = 24): P2[] {
  const { radius, left } = archArcs(width, spring, apex);
  const R = radius + d;
  const cx = left[0];
  // The enlarged arcs meet on the axis where x = 0.
  const a1 = Math.PI - Math.acos(Math.min(1, cx / R));
  const out: P2[] = [[-width / 2 - d, 0]];
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI + ((a1 - Math.PI) * i) / segments;
    out.push([cx + Math.cos(a) * R, spring + Math.sin(a) * R]);
  }
  const right = out
    .slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as P2);
  return [...out, ...right, [width / 2 + d, 0]];
}

/** Where the couple stands along the path for a walk progress 0..1 (world z). */
export function coupleZ(walk: number): number {
  return -2.4 - 6.2 * walk;
}
