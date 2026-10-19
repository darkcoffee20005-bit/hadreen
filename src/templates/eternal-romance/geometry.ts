/**
 * Pure geometry for eternal-romance (no three.js here, so it is unit-tested):
 *  - the velvet curtain's fold-and-lift deformation (mirrored line for line in the GLSL of
 *    parts/Curtain.tsx),
 *  - the venue façade as gold strokes with draw-on timing, and the ribbon mesh they become,
 *  - rose heads, loose petals, the table cloth profile and the candle layout.
 */
export type P2 = [number, number];
export type P3 = [number, number, number];

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fract = (v: number) => v - Math.floor(v);

/* ───────────────────────────── Curtain ───────────────────────────── */

export const CURTAIN = {
  width: 20,
  /** Height of the rod (the fabric's top edge). */
  top: 9.45,
  /** Fabric length from the rod to the hem; the hem rests at top − length. */
  length: 9.0,
  /** Gold bullion fringe below the hem. */
  fringe: 0.3,
  /** Hem height at the lift cords once raised. */
  raised: 7.15,
  /** Extra drop of the hem in the middle of each swag. */
  sag: 0.9,
  /** Distance between lift cords (one swag each). */
  spacing: 2.5,
  /** Pleat depth. */
  depth: 0.19,
  /** Centre (fabric height above the hem) and size of the embroidered crest. */
  crestS: 4.45,
  crestSize: 1.55,
};
export type CurtainParams = typeof CURTAIN;

/** Vertical pleats across the width: three incommensurate waves, never a visible repeat. */
export function folds(x: number): number {
  return 0.55 * Math.sin(x * 6.613 + 0.6) + 0.28 * Math.sin(x * 11.85 + 2.1) + 0.17 * Math.sin(x * 2.33 + 4.0);
}

/** 0 at a lift cord, 1 in the middle of a swag (a cord at x = 0 lifts the centre highest). */
export function swagShape(x: number, spacing: number): number {
  return Math.sin(Math.PI * fract(x / spacing));
}

/** Where the hem hangs at x for a given lift and gather. */
export function hemHeight(x: number, lift: number, swag: number, p: CurtainParams = CURTAIN): number {
  const hem0 = p.top - p.length;
  return hem0 + (p.raised - hem0) * lift - p.sag * swagShape(x, p.spacing) * swag;
}

/**
 * A point of the curtain: `x` across, `s` = fabric height above the hem (negative: the fringe).
 * Lifting raises the hem; the fabric between hem and rod compresses into horizontal ruffles and
 * billows forward between the cords (Austrian swags). `sway` moves the hem.
 */
export function curtainPoint(x: number, s: number, lift: number, swag: number, sway = 0, p: CurtainParams = CURTAIN): P3 {
  const sw = swagShape(x, p.spacing);
  const hemY = hemHeight(x, lift, swag, p);
  const span = p.top - hemY;
  const c = clamp01(span / p.length);
  const e = 1 - c;
  const fs = Math.max(s, 0);
  const w = 1 - fs / p.length; // 0 at the rod, 1 at the hem
  let y = p.top - span * w;
  const ruff = Math.sqrt(e) * 0.15 * Math.sin(fs * 11.4) * (0.35 + 0.65 * w);
  const amp = p.depth * (1 + 0.8 * (1 - sw) * swag * w) * (1 + 0.15 * w);
  const dx = x / (p.crestSize * 1.05);
  const ds = (fs - p.crestS) / (p.crestSize * 1.05);
  const flat = 1 - 0.62 * Math.exp(-(dx * dx + ds * ds));
  let z = folds(x) * amp * flat + ruff + 0.5 * sw * swag * e * w;
  z += sway * w * w * w;
  if (s < 0) y += s;
  return [x, y, z];
}

/* ───────────────────────────── Façade ───────────────────────────── */

/** A gold line of the façade drawing: points (façade units, y up) and its draw-on window. */
export interface Stroke {
  pts: P2[];
  /** Draw progress (0..1) at which the pen starts and finishes this stroke. */
  start: number;
  end: number;
  /** Line width, façade units. */
  w: number;
}

const mirrorPts = (pts: P2[]): P2[] => pts.map(([x, y]) => [-x, y] as P2);

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P2;
  });
}

/** The left half of a two-centred pointed arch, from the left springer up to the apex. */
export function pointedHalfArch(halfW: number, spring: number, apex: number, n = 14): P2[] {
  const h = apex - spring;
  const R = (halfW * halfW + h * h) / (2 * halfW);
  const cx = -halfW + R;
  const aApex = Math.atan2(h, -cx);
  const pts = arcPts(cx, spring, R, Math.PI, aApex, n);
  pts[0] = [-halfW, spring];
  pts[pts.length - 1] = [0, apex];
  return pts;
}

function catenary(x0: number, x1: number, y: number, sag: number, n = 12): P2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t)] as P2;
  });
}

/** The pointed dome's right profile, from the drum up to the apex. */
export function domeProfile(base: number, r0: number, height: number, n = 18): P2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const r = r0 * Math.pow(1 - Math.pow(t, 2.2), 0.62) * (1 + 0.18 * Math.sin(Math.PI * t * 0.9));
    return [i === n ? 0 : r, base + height * t] as P2;
  });
}

/** Wing bays (between pilasters) on the right; the left wing mirrors them. */
export const BAYS: [number, number][] = [
  [2.65, 4.05],
  [4.05, 5.25],
  [5.25, 6.55],
];

/**
 * The venue: a palace hall with a pointed grand portal, two arcaded wings with balustrades and
 * garlands of lights, a drum and a pointed dome. Drawn from the ground up, symmetric strokes in
 * pairs, so the building appears the way an architect would sketch it.
 */
export function facadeStrokes(): Stroke[] {
  const out: Stroke[] = [];
  const add = (pts: P2[], start: number, end: number, w = 0.03, mirror = true) => {
    out.push({ pts, start, end, w });
    if (mirror) out.push({ pts: mirrorPts(pts), start, end, w });
  };

  // Ground line, from the centre outward, then the three front steps.
  add([[0, 0], [7.4, 0]], 0, 0.12, 0.05);
  for (let k = 0; k < 3; k++) {
    const y = 0.2 * (k + 1);
    const hw = 2.95 - 0.28 * k;
    add([[0, y], [hw, y], [hw, y - 0.2]], 0.04 + 0.03 * k, 0.15 + 0.03 * k, 0.026);
  }
  // Silhouette: wing corner, roofline, the central block, meeting at the top centre.
  add([[6.8, 0], [6.8, 5.35], [2.65, 5.35], [2.65, 7.0], [0, 7.0]], 0.07, 0.4, 0.05);
  // Central block: inner pilaster, projecting cornice and parapet.
  add([[2.4, 0.6], [2.4, 6.7]], 0.18, 0.34, 0.024);
  add([[0, 6.7], [2.88, 6.7], [2.88, 6.86], [2.65, 6.86]], 0.28, 0.4, 0.026);
  add([[0, 7.25], [2.5, 7.25], [2.5, 7.0]], 0.36, 0.46, 0.026);
  // Wings: cornice, string course, balustrade rail and pilasters.
  add([[2.65, 5.05], [6.98, 5.05], [6.98, 5.2], [6.8, 5.2]], 0.26, 0.42, 0.026);
  add([[2.65, 3.3], [6.8, 3.3]], 0.32, 0.46, 0.022);
  add([[2.65, 5.85], [6.8, 5.85]], 0.4, 0.52, 0.026);
  add([[6.8, 5.35], [6.8, 5.85]], 0.4, 0.44, 0.026);
  add([[6.55, 0], [6.55, 5.05]], 0.24, 0.38, 0.022);
  BAYS.slice(1).forEach(([x0], i) => add([[x0, 0], [x0, 5.05]], 0.28 + i * 0.03, 0.42 + i * 0.03, 0.022));
  for (let j = 0, x = 2.92; x < 6.6; j++, x += 0.32) add([[x, 5.35], [x, 5.85]], 0.52 + j * 0.008, 0.56 + j * 0.008, 0.016);
  // Grand portal: the rectangular frame (alfiz), drawn down from the top centre…
  add([[0, 6.35], [2.1, 6.35], [2.1, 0.6]], 0.27, 0.46, 0.034);
  // …and the double pointed arch, rising from the steps to meet at the apex.
  add([[1.72, 0.6], ...mirrorPts(pointedHalfArch(1.72, 4.3, 6.05))], 0.3, 0.56, 0.042);
  add([[1.5, 0.6], ...mirrorPts(pointedHalfArch(1.5, 4.3, 5.72))], 0.36, 0.6, 0.022);
  // Rosettes in the spandrels.
  add(arcPts(1.78, 5.92, 0.17, -Math.PI / 2, TAU - Math.PI / 2, 16), 0.55, 0.64, 0.02);
  add(arcPts(1.78, 5.92, 0.07, -Math.PI / 2, TAU - Math.PI / 2, 10), 0.6, 0.67, 0.016);
  // Wing windows: pointed below, round-topped above, with sills and mullions.
  BAYS.forEach(([x0, x1], i) => {
    const cx = (x0 + x1) / 2;
    const hw = 0.36;
    const half = pointedHalfArch(hw, 2.55, 3.1, 8);
    const shift = (pts: P2[]) => pts.map(([x, y]) => [cx + x, y] as P2);
    const lower: P2[] = [[cx + hw, 0.85], ...shift(mirrorPts(half)), ...shift([...half].reverse()).slice(1), [cx - hw, 0.85], [cx + hw, 0.85]];
    add(lower, 0.4 + i * 0.05, 0.58 + i * 0.05, 0.024);
    add([[cx - hw - 0.12, 0.79], [cx + hw + 0.12, 0.79]], 0.46 + i * 0.05, 0.52 + i * 0.05, 0.02);
    add([[cx, 0.85], [cx, 3.08]], 0.56 + i * 0.05, 0.62 + i * 0.05, 0.014);
    const top: P2[] = [[cx + 0.28, 3.55], [cx + 0.28, 4.3], ...arcPts(cx, 4.3, 0.28, 0, Math.PI, 10).slice(1), [cx - 0.28, 3.55], [cx + 0.28, 3.55]];
    add(top, 0.5 + i * 0.05, 0.64 + i * 0.05, 0.02);
  });
  // Drum, its little windows, the pointed dome with ribs, the finial and its orb.
  add([[1.75, 7.25], [1.75, 7.95], [0, 7.95]], 0.5, 0.6, 0.03);
  add([[0, 8.05], [1.95, 8.05], [1.95, 7.95], [1.75, 7.95]], 0.54, 0.62, 0.022);
  [-1.1, -0.55, 0, 0.55, 1.1].forEach((x, i) => {
    add([[x + 0.11, 7.38], [x + 0.11, 7.68], ...arcPts(x, 7.68, 0.11, 0, Math.PI, 6).slice(1), [x - 0.11, 7.38], [x + 0.11, 7.38]], 0.6 + i * 0.012, 0.66 + i * 0.012, 0.014, false);
  });
  add(domeProfile(8.05, 1.85, 2.2), 0.56, 0.8, 0.048);
  add(domeProfile(8.05, 0.9, 2.2).map(([r, y]) => [r, y] as P2), 0.7, 0.86, 0.018);
  add([[0, 10.25], [0, 11.0]], 0.8, 0.86, 0.026, false);
  add(arcPts(0, 10.52, 0.11, -Math.PI / 2, TAU - Math.PI / 2, 12), 0.84, 0.9, 0.02, false);
  // Urn finials on the wing corners.
  add([[6.66, 5.85], [6.69, 6.0], [6.62, 6.14], [6.8, 6.42], [6.98, 6.14], [6.91, 6.0], [6.94, 5.85]], 0.72, 0.8, 0.02);
  // Garlands of lights under the cornice and across the portal.
  BAYS.forEach(([x0, x1], i) => add(catenary(x0 + 0.06, x1 - 0.06, 4.95, 0.3), 0.82 + i * 0.03, 0.93 + i * 0.03, 0.012));
  add(catenary(-2.1, 2.1, 6.3, 0.24, 16).slice(8).reverse(), 0.86, 0.98, 0.012);
  return out;
}

/** Little lights strung along the garlands, with the draw progress at which each one appears. */
export function facadeLights(): { p: P2; t: number; size: number }[] {
  const out: { p: P2; t: number; size: number }[] = [];
  BAYS.forEach(([x0, x1], i) => {
    const pts = catenary(x0 + 0.06, x1 - 0.06, 4.95, 0.3, 6);
    pts.slice(1, -1).forEach((p, j) => {
      const t = 0.82 + i * 0.03 + 0.11 * ((j + 1) / 6);
      out.push({ p, t, size: 1 }, { p: [-p[0], p[1]], t, size: 1 });
    });
  });
  catenary(-2.1, 2.1, 6.3, 0.24, 8)
    .slice(1, -1)
    .forEach((p, j) => out.push({ p, t: 0.86 + 0.12 * Math.abs(j - 3) / 4, size: 1 }));
  out.push({ p: [0, 10.52], t: 0.9, size: 1.8 }, { p: [0, 6.05], t: 0.56, size: 1.5 });
  out.push({ p: [6.8, 6.42], t: 0.8, size: 1.3 }, { p: [-6.8, 6.42], t: 0.8, size: 1.3 });
  return out;
}

export interface RibbonData {
  position: Float32Array;
  /** Across the line, −1..1 (soft edges). */
  side: Float32Array;
  /** Along the stroke, 0..1 by arc length. */
  u: Float32Array;
  /** The stroke's draw window [start, end]. */
  win: Float32Array;
  /** 0 the line itself, 1 its soft glow. */
  glow: Float32Array;
  index: Uint32Array;
}

/**
 * Strokes as flat ribbons (two vertices per point, mitred joins) in the façade plane, plus an
 * optional wide faint copy of each for the glow, so the gold reads even without bloom.
 */
export function buildRibbons(strokes: Stroke[], glowScale = 0): RibbonData {
  const layers = glowScale > 0 ? 2 : 1;
  let nPts = 0;
  let nIdx = 0;
  for (const s of strokes) {
    nPts += s.pts.length;
    nIdx += Math.max(0, s.pts.length - 1) * 6;
  }
  const V = nPts * 2 * layers;
  const position = new Float32Array(V * 3);
  const side = new Float32Array(V);
  const u = new Float32Array(V);
  const win = new Float32Array(V * 2);
  const glow = new Float32Array(V);
  const index = new Uint32Array(nIdx * layers);
  let v = 0;
  let k = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (const s of strokes) {
      const n = s.pts.length;
      const cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1]! + Math.hypot(s.pts[i]![0] - s.pts[i - 1]![0], s.pts[i]![1] - s.pts[i - 1]![1]));
      const total = cum[n - 1]! || 1;
      const width = layer === 0 ? s.w : s.w * glowScale;
      const base = v;
      for (let i = 0; i < n; i++) {
        const p = s.pts[i]!;
        const dir = (a: P2, b: P2): P2 => {
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        };
        const dIn = i > 0 ? dir(s.pts[i - 1]!, p) : null;
        const dOut = i < n - 1 ? dir(p, s.pts[i + 1]!) : null;
        let t: P2 = dIn && dOut ? [dIn[0] + dOut[0], dIn[1] + dOut[1]] : (dIn ?? dOut ?? [1, 0]);
        const tl = Math.hypot(t[0], t[1]);
        t = tl > 1e-6 ? [t[0] / tl, t[1] / tl] : (dIn ?? [1, 0]);
        const nrm: P2 = [-t[1], t[0]];
        const seg = dIn ?? dOut ?? [1, 0];
        const miter = 1 / Math.max(0.34, Math.abs(nrm[0] * -seg[1] + nrm[1] * seg[0]));
        const half = (width / 2) * Math.min(miter, 2.5);
        for (const sd of [1, -1]) {
          position[v * 3] = p[0] + nrm[0] * half * sd;
          position[v * 3 + 1] = p[1] + nrm[1] * half * sd;
          position[v * 3 + 2] = layer === 0 ? 0 : -0.01;
          side[v] = sd;
          u[v] = cum[i]! / total;
          win[v * 2] = s.start;
          win[v * 2 + 1] = s.end;
          glow[v] = layer;
          v++;
        }
      }
      for (let i = 0; i < n - 1; i++) {
        const a0 = base + i * 2;
        index.set([a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2], k);
        k += 6;
      }
    }
  }
  return { position, side, u, win, glow, index };
}

/** How much of a stroke the pen has drawn at overall progress `draw` (0..1). */
export function strokeProgress(s: Pick<Stroke, 'start' | 'end'>, draw: number): number {
  return clamp01((draw - s.start) / Math.max(1e-4, s.end - s.start));
}

/* ───────────────────────────── Roses ───────────────────────────── */

export interface RoseData {
  position: Float32Array;
  /** 0 at a petal's base … 1 at its rim. */
  edge: Float32Array;
  /** 0 innermost petal … 1 outermost. */
  inner: Float32Array;
  index: Uint16Array;
}

/**
 * A rose head (radius ≈ 1, base at y = 0): petals on a golden-angle spiral, the inner ones tall
 * and wrapped tight, the outer ones opening out with their rims rolled back.
 */
export function roseHead(petals = 16, su = 6, sv = 5): RoseData {
  const perPetal = (su + 1) * (sv + 1);
  const position = new Float32Array(petals * perPetal * 3);
  const edge = new Float32Array(petals * perPetal);
  const inner = new Float32Array(petals * perPetal);
  const index = new Uint16Array(petals * su * sv * 6);
  let v = 0;
  let k = 0;
  for (let i = 0; i < petals; i++) {
    const q = petals > 1 ? i / (petals - 1) : 0;
    const theta0 = i * 2.39996;
    const h = 0.5 + 0.5 * q;
    const spread = 2.3 - 0.55 * q;
    const open = 0.12 + 1.05 * Math.pow(q, 1.5);
    const curl = 0.5 * q - 0.42 * (1 - q);
    const r0 = 0.04 + 0.2 * q;
    const base = v;
    for (let b = 0; b <= sv; b++) {
      const vv = b / sv;
      // Narrow at the base, broad and rounded at the rim.
      const wv = 0.32 + 0.68 * Math.pow(Math.sin((Math.PI / 2) * Math.min(1, vv * 1.35)), 0.8);
      for (let a = 0; a <= su; a++) {
        const uu = (a / su) * 2 - 1;
        const ve = vv * (1 - 0.16 * Math.pow(Math.abs(uu), 3));
        const ang = theta0 + uu * spread * wv * 0.5;
        const lean = open + curl * ve * ve;
        const rr = r0 + h * ve * Math.sin(lean) + 0.1 * q * ve * ve * ve * Math.abs(uu) - 0.02 * (1 - Math.abs(uu)) * ve;
        const yy = h * ve * Math.cos(lean) - 0.04 * q * ve * ve * ve + 0.07 * (1 - q);
        position[v * 3] = Math.cos(ang) * rr;
        position[v * 3 + 1] = yy;
        position[v * 3 + 2] = Math.sin(ang) * rr;
        edge[v] = Math.max(ve * ve, Math.abs(uu) * 0.45 * ve);
        inner[v] = q;
        v++;
      }
    }
    for (let b = 0; b < sv; b++) {
      for (let a = 0; a < su; a++) {
        const i0 = base + b * (su + 1) + a;
        const i1 = i0 + 1;
        const i2 = i0 + su + 1;
        const i3 = i2 + 1;
        index.set([i0, i2, i1, i1, i2, i3], k);
        k += 6;
      }
    }
  }
  return { position, edge, inner, index };
}

/** One loose rose petal (≈ 1 long, base at the origin, cupped), for falling and scattered petals. */
export function petalShape(su = 4, sv = 5): { position: Float32Array; uv: Float32Array; index: Uint16Array } {
  const position = new Float32Array((su + 1) * (sv + 1) * 3);
  const uv = new Float32Array((su + 1) * (sv + 1) * 2);
  const index = new Uint16Array(su * sv * 6);
  let v = 0;
  for (let b = 0; b <= sv; b++) {
    const vv = b / sv;
    // Narrow at the base, broad and rounded (a little heart-shaped) at the top.
    const wv = 0.16 + 0.84 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + 0.84 * vv)), 0.7);
    for (let a = 0; a <= su; a++) {
      const uu = (a / su) * 2 - 1;
      const x = uu * wv * 0.42;
      const y = vv - (b === sv ? 0.06 * (1 - Math.abs(uu)) : 0);
      const z = 0.22 * uu * uu * wv - 0.12 * vv * vv;
      position.set([x, y, z], v * 3);
      uv.set([a / su, vv], v * 2);
      v++;
    }
  }
  let k = 0;
  for (let b = 0; b < sv; b++) {
    for (let a = 0; a < su; a++) {
      const i0 = b * (su + 1) + a;
      const i2 = i0 + su + 1;
      index.set([i0, i2, i0 + 1, i0 + 1, i2, i2 + 1], k);
      k += 6;
    }
  }
  return { position, uv, index };
}

/** Rose heads in the low gold bowl: a domed cluster (table-local, y up from the bowl rim). */
export function roseCluster(count: number): { p: P3; tilt: number; yaw: number; scale: number }[] {
  const out: { p: P3; tilt: number; yaw: number; scale: number }[] = [{ p: [0, 0.07, 0], tilt: 0, yaw: 0.3, scale: 1.08 }];
  const ring = (n: number, r: number, y: number, tilt: number, scale: number, phase: number) => {
    for (let i = 0; i < n && out.length < count; i++) {
      const a = phase + (i / n) * TAU;
      out.push({ p: [Math.cos(a) * r, y, Math.sin(a) * r], tilt, yaw: a, scale: scale * (0.92 + 0.16 * fract(Math.sin(i * 12.9898 + r * 78.233) * 43758.5453)) });
    }
  };
  ring(6, 0.105, 0.045, 0.55, 1.0, 0.25);
  ring(9, 0.19, 0.0, 1.0, 0.94, 0.0);
  return out.slice(0, count);
}

/* ───────────────────────────── Table ───────────────────────────── */

/** Cloth profile (radius, height) from the centre of the top, over the edge and down to the floor. */
export function clothProfile(R = 0.8, top = 0.762): P2[] {
  const pts: P2[] = [
    [0, top],
    [0.35, top],
    [0.62, top],
    [R - 0.03, top - 0.001],
    [R, top - 0.012],
    [R + 0.018, top - 0.04],
    [R + 0.026, top - 0.08],
  ];
  const n = 14;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push([R + 0.026 + 0.12 * Math.pow(t, 1.6), (top - 0.08) * (1 - t)]);
  }
  return pts;
}

/** Radial fold offset of the cloth skirt at angle `a` and drop `t` (0 at the edge … 1 at the floor). */
export function clothFold(a: number, t: number): number {
  const f = 0.6 * Math.sin(a * 11 + 0.4) + 0.3 * Math.sin(a * 23 + 1.7) + 0.25 * Math.sin(a * 5 + 2.2);
  return f * 0.028 * Math.pow(t, 1.2);
}

export interface Candle {
  x: number;
  z: number;
  /** Wax height and radius. */
  h: number;
  r: number;
  /** Candlestick height (0: a pillar standing on the cloth). */
  stick: number;
}

/** Table-local layout (y = 0 on the cloth): tapers in gold candlesticks and pillars of many heights. */
export const CANDLES: Candle[] = [
  { x: -0.44, z: -0.12, h: 0.2, r: 0.014, stick: 0.25 },
  { x: 0.44, z: -0.12, h: 0.2, r: 0.014, stick: 0.25 },
  { x: -0.26, z: 0.2, h: 0.15, r: 0.04, stick: 0 },
  { x: 0.27, z: 0.23, h: 0.1, r: 0.038, stick: 0 },
  { x: -0.55, z: 0.24, h: 0.075, r: 0.034, stick: 0 },
  { x: 0.58, z: 0.15, h: 0.125, r: 0.038, stick: 0 },
  { x: 0.15, z: -0.36, h: 0.19, r: 0.04, stick: 0 },
  { x: -0.17, z: -0.38, h: 0.13, r: 0.038, stick: 0 },
];

/** Where a candle's flame sits (table-local). */
export function flamePosition(c: Candle, flameH: number): P3 {
  return [c.x, c.stick + c.h + flameH * 0.42, c.z];
}

/** Brightness flicker of a candle flame: smooth, never dark, deterministic for a given time and seed. */
export function flicker(t: number, seed: number): number {
  const a = Math.sin(t * 7.3 + seed * 11.1) * 0.5 + Math.sin(t * 13.7 + seed * 3.7) * 0.3 + Math.sin(t * 2.1 + seed * 5.3) * 0.2;
  return 0.88 + 0.12 * a;
}
