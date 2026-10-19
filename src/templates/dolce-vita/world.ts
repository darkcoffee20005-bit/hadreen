import { mulberry32 } from '@/lib/invite/audio/dsp';

/**
 * The dolce-vita world as data: a rose balcony (y = 0 floor, balustrade along z = 0) high above a
 * Mediterranean lake (y = LAKE_Y), enclosed by three layers of mountains that fold toward us at the
 * sides, a green promontory with villas on the left, and the slope under the balcony.
 * Everything here is pure (seeded), so the geometry is the same on every device and testable.
 */
export type V3 = [number, number, number];

export const LAKE_Y = -14;
export const RAIL_TOP = 1.02;
export const RAIL_DEPTH = 0.36;
export const BALCONY_HALF = 5.2;

/** The gate card on the stone rail. */
export const CARD: V3 = [0, RAIL_TOP, 0.0];
export const CARD_SIZE: [number, number] = [0.34, 0.235];
/** Card tilt toward the camera (radians from flat), propped on a rose stem. */
export const CARD_TILT = 0.5;

/** The bistro table and the envelope standing on it (in a little brass holder). */
export const TABLE: V3 = [1.85, 0, 1.15];
export const TABLE_TOP = 0.74;
export const ENVELOPE_SIZE: [number, number] = [0.36, 0.25];
export const ENVELOPE_LEAN = 0.24;
/** Centre of the envelope (world). */
export const ENVELOPE: V3 = [TABLE[0] - 0.04, TABLE_TOP + 0.012 + (ENVELOPE_SIZE[1] / 2) * Math.cos(ENVELOPE_LEAN), TABLE[2] + 0.02];

/** The sailboat's lane across the lake. */
export const BOAT_Z = -64;

// ── 1D value noise ─────────────────────────────────────────────────────────────────────────

function hash(i: number, seed: number): number {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

/** Fractal value noise in 0..1. */
export function fbm1(x: number, seed = 0, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * f, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// ── Mountains ──────────────────────────────────────────────────────────────────────────────

export interface MountainLayer {
  /** Front edge (shoreline) at x = 0, and how fast it bends toward us at the sides. */
  z0: number;
  curve: number;
  /** Half width of the layer. */
  halfWidth: number;
  /** How deep the slope runs back from the shore to the ridge. */
  depth: number;
  /** Ridge height: base + amp × fbm. */
  base: number;
  amp: number;
  freq: number;
  /** Extra height toward the sides (a valley that leads the eye to the centre). */
  sides: number;
  seed: number;
  /** Vertex colours: shore, ridge, and snow above `snowLine` (0..1 of the ridge height; > 1 = none). */
  shore: string;
  ridgeColor: string;
  snowLine: number;
}

export const MOUNTAINS: MountainLayer[] = [
  // Near: wooded green hills that fold round both sides of the lake.
  { z0: -230, curve: 0.00075, halfWidth: 520, depth: 70, base: 26, amp: 46, freq: 0.012, sides: 0.5, seed: 3, shore: '#5F8466', ridgeColor: '#7E9E92', snowLine: 9 },
  // Middle: blue-grey mountains.
  { z0: -380, curve: 0.0005, halfWidth: 640, depth: 90, base: 70, amp: 80, freq: 0.008, sides: 0.55, seed: 11, shore: '#6E8EB4', ridgeColor: '#88A6C8', snowLine: 9 },
  // Far: high peaks with snow, almost lost in the haze.
  { z0: -560, curve: 0.00035, halfWidth: 780, depth: 110, base: 120, amp: 140, freq: 0.0062, sides: 0.25, seed: 23, shore: '#93AECB', ridgeColor: '#AFC4DC', snowLine: 0.78 },
];

/** Shoreline z of a layer at x. */
export function layerFront(l: MountainLayer, x: number): number {
  return l.z0 + l.curve * x * x;
}

/** Ridge height (above the lake) of a layer at x. */
export function ridgeHeight(l: MountainLayer, x: number): number {
  const side = 1 + l.sides * smooth(60, l.halfWidth * 0.75, Math.abs(x));
  const peaks = fbm1(x * l.freq + 3.1, l.seed);
  return (l.base + l.amp * peaks * peaks * 1.6) * side;
}

/** Height above the lake at x, `d` units back from the shore (0 at the shore, ridge at depth). */
export function mountainHeight(l: MountainLayer, x: number, d: number): number {
  const u = Math.min(1, Math.max(0, d / l.depth));
  const profile = 1 - (1 - u) * (1 - u);
  const ripple = 1 + 0.22 * (fbm1(x * l.freq * 5 + d * 0.07, l.seed + 5) - 0.5);
  return ridgeHeight(l, x) * profile * ripple;
}

// ── The promontory (left) and the slope under the balcony ─────────────────────────────────

export const PROMONTORY = { cx: -118, cz: -150, rx: 58, rz: 40, height: 30 };

/** Height above the lake of the green promontory (≤ 0 = under water). */
export function promontoryHeight(x: number, z: number): number {
  const p = PROMONTORY;
  const r2 = ((x - p.cx) / p.rx) ** 2 + ((z - p.cz) / p.rz) ** 2;
  const lumps = 1 + 0.5 * (fbm1(x * 0.07 + z * 0.043, 41) - 0.5);
  return p.height * Math.exp(-r2 * 1.1) * lumps - 2.5;
}

export const SLOPE = { x: 90, zTop: -0.3, zLake: -23, top: -2.6 };

/** World y of the slope that falls from under the balcony into the lake. */
export function slopeY(x: number, z: number): number {
  const u = Math.min(1, Math.max(0, (SLOPE.zTop - z) / (SLOPE.zTop - SLOPE.zLake)));
  const fall = Math.pow(u, 0.7);
  const bumps = Math.sin(u * Math.PI) * (fbm1(x * 0.08 + 7, 5) - 0.45) * 3;
  return SLOPE.top + (LAKE_Y - 1.5 - SLOPE.top) * fall + bumps;
}

// ── Placements ─────────────────────────────────────────────────────────────────────────────

export interface Villa {
  position: V3;
  size: V3; // width, height, depth
  rotation: number;
  /** Index into the stucco palette. */
  tone: number;
}

/** Villas on the near shore of the hills, the promontory and the foot of the slope. */
export function villas(seed = 7): Villa[] {
  const rand = mulberry32(seed);
  const out: Villa[] = [];
  const face = (x: number, z: number) => Math.atan2(-x, 40 - z) * 0.85;
  const near = MOUNTAINS[0]!;
  // Along the far shore, in little hamlets.
  for (const cx of [-380, -300, -215, -135, -50, 40, 120, 200, 285, 370]) {
    const n = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const x = cx + (rand() - 0.5) * 70;
      const d = 2 + rand() * rand() * 34;
      const z = layerFront(near, x) - d;
      const y = LAKE_Y + mountainHeight(near, x, d) - 0.6;
      const w = 3 + rand() * 2.2;
      out.push({ position: [x, y, z], size: [w, 2.6 + rand() * 1.8, 2.8 + rand() * 1.2], rotation: face(x, z) + (rand() - 0.5) * 0.3, tone: Math.floor(rand() * 5) });
    }
  }
  // On the promontory: a grand villa and its neighbours.
  const p = PROMONTORY;
  const spots: [number, number, number][] = [
    [-92, -128, 0.95],
    [-104, -122, 0.6],
    [-122, -126, 0.6],
    [-82, -138, 0.55],
    [-136, -136, 0.55],
    [-112, -142, 0.7],
    [-96, -116, 0.5],
  ];
  for (const [x, z, k] of spots) {
    const y = LAKE_Y + Math.max(0, promontoryHeight(x, z)) - 0.6;
    out.push({ position: [x, y, z], size: [6 * k, 4.6 * k, 5 * k], rotation: face(x, z) + (rand() - 0.5) * 0.2, tone: Math.floor(rand() * 5) });
  }
  void p;
  return out;
}

export interface Tree {
  position: V3;
  height: number;
  width: number;
  /** 0 cypress, 1 round tree. */
  kind: 0 | 1;
}

/** Cypresses and round trees on the slope, around the villas and on the promontory. */
export function trees(seed = 13): Tree[] {
  const rand = mulberry32(seed);
  const out: Tree[] = [];
  // The slope under the balcony: dense, so the crane shot looks down over garden.
  for (let i = 0; i < 80; i++) {
    const x = (rand() - 0.5) * 170;
    const z = -5 - rand() * 16;
    const centre = Math.abs(x) < 14;
    const cypress = !centre && rand() < 0.55;
    const h = cypress ? 5 + rand() * 4 : 2.2 + rand() * 1.8;
    out.push({ position: [x, slopeY(x, z) - 0.3, z], height: h, width: cypress ? h * 0.16 : h * (0.8 + rand() * 0.3), kind: cypress ? 0 : 1 });
  }
  // Around the villas on the far shore and on the promontory.
  for (const v of villas()) {
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2;
      const r = v.size[0] * (0.7 + rand() * 0.5);
      const x = v.position[0] + Math.cos(ang) * r;
      const z = v.position[2] + Math.sin(ang) * r * 0.6;
      const cypress = rand() < 0.65;
      const h = (cypress ? 4.5 + rand() * 3.5 : 2.6 + rand() * 1.6) * (v.position[2] < -150 ? 1.1 : 0.8);
      out.push({ position: [x, v.position[1] - 0.5, z], height: h, width: cypress ? h * 0.17 : h, kind: cypress ? 0 : 1 });
    }
  }
  return out;
}

export interface Rose {
  position: V3;
  /** Direction the bloom faces (unit-ish). */
  facing: V3;
  scale: number;
  tone: number;
}

export interface Leaf {
  position: V3;
  facing: V3;
  scale: number;
  spin: number;
}

/** A mound of roses and leaves around `center` (a dome of radius r, flattened by `squash`). */
export function roseCluster(center: V3, r: number, roses: number, seed: number, squash = 0.7, size = 1): { roses: Rose[]; leaves: Leaf[] } {
  const rand = mulberry32(seed);
  const out: Rose[] = [];
  const leaves: Leaf[] = [];
  const onDome = (k: number): [V3, V3] => {
    const a = rand() * Math.PI * 2;
    const el = Math.acos(1 - rand() * 0.95) * 0.95;
    const dir: V3 = [Math.sin(el) * Math.cos(a), Math.cos(el), Math.sin(el) * Math.sin(a)];
    const rr = r * k;
    return [[center[0] + dir[0] * rr, center[1] + dir[1] * rr * squash, center[2] + dir[2] * rr], dir];
  };
  for (let i = 0; i < roses; i++) {
    const [p, d] = onDome(0.82 + rand() * 0.2);
    out.push({ position: p, facing: [d[0] * 0.8, d[1] + 0.35, d[2] * 0.8 + 0.25], scale: (0.05 + rand() * 0.022) * size, tone: Math.floor(rand() * 4) });
  }
  for (let i = 0; i < roses * 9; i++) {
    const [p, d] = onDome(0.55 + rand() * 0.5);
    leaves.push({ position: p, facing: d, scale: (0.036 + rand() * 0.02) * size, spin: rand() * Math.PI * 2 });
  }
  return { roses: out, leaves };
}

export interface Cloud {
  position: V3;
  size: [number, number];
  seed: number;
  /** 0 cumulus, 1 mist band. */
  kind: 0 | 1;
}

/** Fair-weather cumulus over the lake (`count` of them) plus mist bands along the mountain feet. */
export function clouds(count: number, seed = 31): Cloud[] {
  const rand = mulberry32(seed);
  const out: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const z = -180 - rand() * 520;
    const x = (rand() - 0.5) * 1100;
    const w = 60 + rand() * 80;
    out.push({ position: [x, 95 + rand() * 120 + (-z - 180) * 0.12, z], size: [w, w * (0.42 + rand() * 0.16)], seed: rand(), kind: 0 });
  }
  const mists = Math.max(2, Math.round(count / 3));
  for (let i = 0; i < mists; i++) {
    const layer = MOUNTAINS[i % 2 === 0 ? 1 : 0]!;
    const x = (rand() - 0.5) * 600;
    const z = layerFront(layer, x) - 10 - rand() * 30;
    out.push({ position: [x, LAKE_Y + 14 + rand() * 18, z], size: [200 + rand() * 140, 18 + rand() * 10], seed: rand(), kind: 1 });
  }
  // Far first: instanced transparent sprites draw in index order.
  return out.sort((a, b) => a.position[2] - b.position[2]);
}

/** x of the drifting clouds after `seconds`, wrapping inside ±span. */
export function wrapX(x: number, span: number): number {
  return ((((x + span) % (2 * span)) + 2 * span) % (2 * span)) - span;
}
