/**
 * Procedural geometry for the Sacred Garden: stone arch, roses, leaves, vines, swans, cypress,
 * hedge, date palms, the pool deck and petals. Everything is built from maths at load time
 * (no model files). Builders are pure (no React) and return indexed or non-indexed geometry
 * with position / normal / uv / color, so related parts merge into a single draw call.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  LatheGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, smoothstep, SWAN_SCALE, vinePath, type V3 } from './layout';

export type Detail = 'low' | 'medium' | 'high';
type RGB = [number, number, number];

/** Linear-light RGB of a brand hex (vertex colours are read as linear). */
export function lin(hex: string, k = 1): RGB {
  const c = new Color(hex);
  return [c.r * k, c.g * k, c.b * k];
}

// ---------------------------------------------------------------------------------------------
// helpers

/** A (cols × rows) parametric patch, u across and v along; counter-clockwise seen from the normal. */
export function grid(cols: number, rows: number, pos: (u: number, v: number) => V3, shade: (u: number, v: number) => RGB = () => [1, 1, 1]): BufferGeometry {
  const n = (cols + 1) * (rows + 1);
  const p = new Float32Array(n * 3);
  const c = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  let k = 0;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      p.set(pos(u, v), k * 3);
      c.set(shade(u, v), k * 3);
      uv.set([u, v], k * 2);
      k++;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const d = a + cols + 1;
      index.push(a, b, d + 1, a, d + 1, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(index);
  g.setAttribute('position', new BufferAttribute(p, 3));
  g.setAttribute('color', new BufferAttribute(c, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Adds (or replaces) a per-vertex colour from the vertex position. */
export function paint(g: BufferGeometry, fn: (x: number, y: number, z: number) => RGB): BufferGeometry {
  const pos = g.attributes.position!;
  const c = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) c.set(fn(pos.getX(i), pos.getY(i), pos.getZ(i)), i * 3);
  g.setAttribute('color', new BufferAttribute(c, 3));
  return g;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const indexed = parts.every((p) => p.index);
  const list = indexed ? parts : parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const out = mergeGeometries(list, false);
  if (!out) throw new Error('sacred-garden: merge failed');
  parts.forEach((p) => p.dispose());
  if (!indexed) list.forEach((p) => p.dispose());
  return out;
}

/** Smooth value noise in 3D (seeded hash), 0..1. */
export function noise3(x: number, y: number, z: number): number {
  const h = (i: number, j: number, k: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const u = f(x - xi);
  const v = f(y - yi);
  const w = f(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

/** Catmull-Rom through (t, value) keys. */
export function curve(keys: [number, number][], t: number): number {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
  const [t1, p1] = keys[i]!;
  const [t2, p2] = keys[i + 1]!;
  const p0 = keys[i - 1]?.[1] ?? p1;
  const p3 = keys[i + 2]?.[1] ?? p2;
  const u = Math.min(1, Math.max(0, (t - t1) / (t2 - t1 || 1)));
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}

// ---------------------------------------------------------------------------------------------
// stone

// ---------------------------------------------------------------------------------------------
// roses & greenery

/** A rose head: petals on a golden-angle spiral, tight and upright inside, open and curled outside. Axis +y, radius ≈ 1. */
export function buildRose(detail: Detail): BufferGeometry {
  const petals = detail === 'low' ? 8 : detail === 'medium' ? 12 : 15;
  const [cols, rows] = detail === 'low' ? [2, 2] : [2, 3];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < petals; i++) {
    const k = i / (petals - 1);
    const ang = i * 2.39996;
    const H = 0.42 + 0.5 * k;
    const W = 0.3 + 0.36 * k;
    const r0 = 0.03 + 0.4 * k;
    const tilt = 0.08 + 1.05 * Math.pow(k, 1.25);
    const cup = 0.42 - 0.18 * k;
    const curlOut = 0.1 + 0.45 * k;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    parts.push(
      grid(
        cols,
        rows,
        (u, v) => {
          const s = u * 2 - 1;
          const w = W * Math.pow(Math.sin(Math.PI * (0.16 + 0.74 * v)), 0.7);
          const x = s * w;
          const y = v * H;
          const z = -cup * W * s * s + curlOut * v * v * v * H * 0.7;
          const y2 = y * ct - z * st;
          const z2 = y * st + z * ct + r0;
          return [x * ca + z2 * sa, y2, -x * sa + z2 * ca];
        },
        (_u, v) => {
          const s = (0.5 + 0.5 * k) * (0.7 + 0.3 * v);
          return [s, s, s];
        },
      ),
    );
  }
  return merge(parts);
}

/** A leaf with a folded midrib, pointing +y, length 1, facing +z. */
export function buildLeaf(): BufferGeometry {
  return grid(
    2,
    4,
    (u, v) => {
      const s = u * 2 - 1;
      const w = 0.3 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.02)), 0.75);
      return [s * w, v, -Math.abs(s) * w * 0.35 + v * v * 0.18];
    },
    (u, v) => {
      const s = 0.75 + 0.25 * v - Math.abs(u - 0.5) * 0.1;
      return [s, s, s];
    },
  );
}

/** Two stems spiralling around the arch ring. */
export function buildVines(color: string, detail: Detail): BufferGeometry {
  const seg = detail === 'low' ? 120 : 260;
  const parts = [0, 2.4].map((phase, i) => {
    const pts = vinePath(phase, 8 + i * 1.5, seg).map(([x, y, z]) => new Vector3(x, y, z));
    return new TubeGeometry(new CatmullRomCurve3(pts), seg, 0.015 - i * 0.004, detail === 'low' ? 3 : 4, false);
  });
  const c = lin(color);
  return paint(merge(parts), (x, y, z) => {
    const k = 0.8 + noise3(x * 5, y * 5, z * 5) * 0.4;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

/** An Italian cypress: a flame-shaped lathe with leafy lumps. Height 1, base at y=0. */
export function buildCypress(color: string, detail: Detail): BufferGeometry {
  const n = detail === 'low' ? 10 : 18;
  const pts: Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const y = i / n;
    const r = 0.15 * Math.pow(1 - y, 0.82) * Math.min(1, 0.3 + y * 9);
    pts.push(new Vector2(Math.max(r, 0.0005), y));
  }
  const g = new LatheGeometry(pts, detail === 'low' ? 8 : 12);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + (noise3(x * 30 + 7, y * 16, z * 30) - 0.5) * 0.55;
    pos.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  const c = lin(color);
  return paint(g, (x, y, z) => {
    const k = (0.45 + 0.55 * smoothstep(0, 0.9, y)) * (0.8 + noise3(x * 40, y * 25, z * 40) * 0.4);
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

/** A date palm: ringed, gently bent trunk and a crown of drooping, ragged fronds. */
export function buildPalm(height: number, seed: number, trunkColor: string, frondColor: string, detail: Detail): BufferGeometry {
  const rand = rng(seed);
  const bend = 0.6 + rand() * 0.6;
  const top: V3 = [bend, height, 0];
  const parts: BufferGeometry[] = [];
  const trunk = lin(trunkColor);
  parts.push(
    grid(
      7,
      detail === 'low' ? 8 : 16,
      (u, v) => {
        const a = u * Math.PI * 2;
        const r = (0.2 - 0.07 * v) * (1 + 0.08 * Math.max(0, Math.sin(v * height * 7)));
        return [bend * v * v + Math.cos(a) * r, v * height, -Math.sin(a) * r];
      },
      (_u, v) => {
        const k = 0.75 + 0.25 * Math.sin(v * height * 7);
        return [trunk[0] * k, trunk[1] * k, trunk[2] * k];
      },
    ),
  );
  const frond = lin(frondColor);
  const count = detail === 'low' ? 10 : 16;
  for (let f = 0; f < count; f++) {
    const a = (f / count) * Math.PI * 2 + rand() * 0.3;
    const len = 2.4 + rand() * 0.9;
    const lift = 0.55 + rand() * 0.5;
    const droop = 1.7 + rand() * 0.7;
    const dir: V3 = [Math.cos(a), 0, Math.sin(a)];
    const across: V3 = [-Math.sin(a), 0, Math.cos(a)];
    const rows = detail === 'low' ? 6 : 12;
    // Integrate the drooping spine.
    const spine: V3[] = [[top[0], top[1], top[2]]];
    for (let i = 1; i <= rows; i++) {
      const s = i / rows;
      const th = lift - droop * s * s;
      const prev = spine[i - 1]!;
      const step = len / rows;
      spine.push([prev[0] + dir[0] * Math.cos(th) * step, prev[1] + Math.sin(th) * step, prev[2] + dir[2] * Math.cos(th) * step]);
    }
    parts.push(
      grid(
        2,
        rows,
        (u, v) => {
          const sp = spine[Math.round(v * rows)]!;
          const s = u * 2 - 1;
          const w = 0.34 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.05)), 0.6) * (0.55 + 0.45 * Math.abs(Math.sin(v * 38)));
          return [sp[0] + across[0] * s * w, sp[1] + Math.abs(s) * w * 0.25, sp[2] + across[2] * s * w];
        },
        (_u, v) => {
          const k = 0.7 + 0.3 * v;
          return [frond[0] * k, frond[1] * k, frond[2] * k];
        },
      ),
    );
  }
  return merge(parts);
}

/** A rose petal for the drifting/floating instances: cupped, ~1 unit tall. */
export function buildPetal(): BufferGeometry {
  return grid(
    3,
    2,
    (u, v) => {
      const s = u * 2 - 1;
      const w = 0.42 * Math.pow(Math.sin(Math.PI * (0.12 + 0.8 * v)), 0.6);
      return [s * w, v - 0.5, -s * s * 0.18 + v * v * 0.12];
    },
    (_u, v) => {
      const k = 0.8 + 0.2 * v;
      return [k, k, k];
    },
  );
}

// ---------------------------------------------------------------------------------------------
// swans

/** The neck's spine (swan-local, metres): up from the chest, bowing back, arching over and down to the head. */
export const NECK: [number, number][] = [
  [0.19, 0.04],
  [0.2, 0.12],
  [0.15, 0.24],
  [0.095, 0.35],
  [0.078, 0.45],
  [0.11, 0.535],
  [0.175, 0.572],
  [0.228, 0.55],
  [0.252, 0.5],
];
export const HEAD: { centre: [number, number]; dir: [number, number] } = { centre: [0.262, 0.475], dir: [0.34, -0.94] };

const BODY_W: [number, number][] = [
  [0, 0],
  [0.06, 0.045],
  [0.2, 0.1],
  [0.42, 0.14],
  [0.62, 0.15],
  [0.8, 0.135],
  [0.92, 0.1],
  [0.975, 0.055],
  [1, 0],
];
const BODY_TOP: [number, number][] = [
  [0, 0.178],
  [0.08, 0.158],
  [0.22, 0.15],
  [0.4, 0.195],
  [0.58, 0.21],
  [0.76, 0.18],
  [0.9, 0.14],
  [0.97, 0.11],
  [1, 0.085],
];
const BODY_BOT: [number, number][] = [
  [0, 0.15],
  [0.08, 0.07],
  [0.22, -0.01],
  [0.45, -0.055],
  [0.75, -0.05],
  [0.92, -0.01],
  [0.98, 0.03],
  [1, 0.07],
];
const BODY_X = (t: number) => -0.36 + 0.63 * t;

/**
 * A mute swan in profile facing +x, waterline at y=0: lofted body, raised (busking) wings, a
 * tapered S-neck from Frenet frames, head, orange beak with its black knob, and eyes.
 * One merged, vertex-coloured geometry (≈6k triangles high, ≈3k medium, ≈1.3k low).
 */
export function buildSwan(detail: Detail): BufferGeometry {
  const q = detail === 'high' ? { rows: 44, ring: 24, neck: 48, neckRing: 14, wing: [14, 8], head: [18, 12] } : detail === 'medium' ? { rows: 30, ring: 18, neck: 36, neckRing: 12, wing: [10, 6], head: [14, 10] } : { rows: 16, ring: 10, neck: 18, neckRing: 8, wing: [6, 4], head: [10, 7] };
  const white: RGB = lin('#FBF7F1');
  const cream: RGB = lin('#F4EDE3');
  const se = (c: number) => Math.sign(c) * Math.pow(Math.abs(c), 0.8);
  const parts: BufferGeometry[] = [];

  // Body: elliptical sections along x; rings bunch up at both ends so they close round.
  parts.push(
    grid(
      q.ring,
      q.rows,
      (u, v) => {
        const t = 0.5 - 0.5 * Math.cos(Math.PI * v);
        const w = Math.max(0, curve(BODY_W, t));
        const top = curve(BODY_TOP, t);
        const bot = curve(BODY_BOT, t);
        const phi = u * Math.PI * 2;
        const yc = (top + bot) / 2;
        const hh = (top - bot) / 2;
        return [BODY_X(t), yc + hh * se(Math.sin(phi)), -w * se(Math.cos(phi))];
      },
      (u) => {
        const under = Math.max(0, -Math.sin(u * Math.PI * 2));
        const k = 1 - under * 0.12;
        return [white[0] * k, white[1] * k, white[2] * k];
      },
    ),
  );

  // Wings: two shells rising from the flanks over the back, feather tips scalloped at the rear.
  for (const side of [1, -1]) {
    parts.push(
      grid(
        q.wing[0]!,
        q.wing[1]!,
        (u, v) => {
          const tt = 0.8 - 0.68 * u;
          const x = BODY_X(tt);
          const w = curve(BODY_W, tt);
          const top = curve(BODY_TOP, tt);
          // Folded wing: from the flank up over the back, tips lifting a little over the tail.
          const root: V3 = [x, top - 0.06, side * w * 0.86];
          const outer: V3 = [x - 0.03 - 0.05 * u, top + 0.012 + 0.07 * u * u * u, side * w * 0.42];
          const scallop = u > 0.55 ? 1 - 0.12 * Math.abs(Math.sin(u * Math.PI * 7)) * (u - 0.55) * 2.2 : 1;
          const vv = v * scallop;
          const bulge = Math.sin(Math.PI * vv);
          return [root[0] + (outer[0] - root[0]) * vv, root[1] + (outer[1] - root[1]) * vv + bulge * 0.02, root[2] + (outer[2] - root[2]) * vv + side * bulge * 0.022];
        },
        (_u, v) => {
          const k = 1 - v * 0.06;
          return [cream[0] * k, cream[1] * k, cream[2] * k];
        },
      ),
    );
  }

  // Neck: a tube whose radius tapers from the chest to the head.
  const spine = new CatmullRomCurve3(NECK.map(([x, y]) => new Vector3(x, y, 0)));
  const frames = spine.computeFrenetFrames(q.neck, false);
  const points = spine.getSpacedPoints(q.neck);
  parts.push(
    grid(
      q.neckRing,
      q.neck,
      (u, v) => {
        const i = Math.round(v * q.neck);
        const p = points[i]!;
        const n = frames.normals[i]!;
        const b = frames.binormals[i]!;
        const r = 0.058 - 0.03 * smoothstep(0, 0.55, v) + 0.005 * smoothstep(0.82, 1, v);
        const a = u * Math.PI * 2;
        const cn = Math.cos(a) * r;
        const sb = Math.sin(a) * r * 0.86;
        return [p.x + n.x * cn + b.x * sb, p.y + n.y * cn + b.y * sb, p.z + n.z * cn + b.z * sb];
      },
      () => white,
    ),
  );

  // Head, bowed along the beak's direction.
  const [hx, hy] = HEAD.centre;
  const [dx, dy] = HEAD.dir;
  const ang = Math.atan2(dy, dx);
  const head = new SphereGeometry(1, q.head[0], q.head[1]);
  head.scale(0.05, 0.033, 0.03);
  head.rotateZ(ang + 0.35);
  head.translate(hx, hy, 0);
  parts.push(paint(head, () => white));

  // Beak: an orange cone with a black base, flattened sideways.
  const beak = new CylinderGeometry(0.0045, 0.016, 0.072, detail === 'low' ? 6 : 10, 2);
  paint(beak, (_x, y) => (y < -0.022 ? lin('#141110') : lin('#D9692A')));
  beak.scale(1, 1, 0.78);
  beak.rotateZ(ang - Math.PI / 2);
  beak.translate(hx + dx * 0.066, hy + dy * 0.066, 0);
  parts.push(beak);

  // Knob and eyes.
  const nx = -dy;
  const ny = dx;
  const knob = new SphereGeometry(0.0125, 8, 6);
  knob.translate(hx + dx * 0.034 + nx * 0.011, hy + dy * 0.034 + ny * 0.011, 0);
  parts.push(paint(knob, () => lin('#141110')));
  for (const side of [1, -1]) {
    const eye = new SphereGeometry(0.0058, 6, 4);
    eye.translate(hx + dx * 0.012 + nx * 0.006, hy + dy * 0.012 + ny * 0.006, side * 0.025);
    parts.push(paint(eye, () => lin('#0d0a09')));
  }
  return merge(parts).scale(SWAN_SCALE, SWAN_SCALE, SWAN_SCALE);
}
