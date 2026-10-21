/**
 * The Sacred Garden as data: a loggia arch over a sunset lake. The arch's outline, where roses
 * grow on it, the terrace (floor, balustrade, urns, lanterns), the swans' glide far out on the
 * lake, the wax seal's four shards and the camera track. Pure maths (no three.js, no DOM) so it
 * can be unit-tested and shared by the 3D scene and its builders.
 *
 * Frames: the lake's surface is y = 0. The terrace floor stands FLOOR_Y above it. Everything on
 * the arch (roses, leaves, vines, strands) is in the arch's own frame: origin at the foot of the
 * opening's axis on the floor, z = 0 the middle of the wall; the scene places it at ARCH_AT.
 */
import { mulberry32 } from '@/lib/invite/audio/dsp';
import type { Shot, TrackKey } from '@/lib/invite/stage/rig';

export type V2 = [number, number];
export type V3 = [number, number, number];

/** The terrace floor, metres above the lake. */
export const FLOOR_Y = 1.6;

/** The loggia's two-centred, cusped arch: a tall opening in the terrace wall. Metres. */
export const ARCH = {
  /** Half the clear opening. */
  a: 2.15,
  /** Thickness of the arch ring and pillars (in the arch's plane). */
  t: 0.42,
  /** Offset of each arc's centre from the axis: bigger = more pointed. */
  e: 0.3,
  /** Height where the arcs spring from the pillars (above the floor). */
  spring: 5.4,
  /** Depth of the ring (front to back). */
  depth: 0.6,
  /** The wall's middle plane. */
  z: 2.0,
} as const;

export const ARCH_AT: V3 = [0, FLOOR_Y, ARCH.z];

/** The wall the arch is cut into: wide enough to frame a desktop screen. */
export const WALL = { half: 13, top: 13, depth: 0.46 } as const;

/** Two smaller arches either side of the main one (an arcade), seen on wide screens. */
export const SIDE_ARCH = { x: 5.6, scaleX: 0.66, scaleY: 0.74 } as const;

/** The balustrade at the terrace's edge, between the arch and the lake. */
export const RAIL = {
  z: -0.35,
  /** Handrail top above the floor. */
  h: 1.02,
  half: 9.5,
  /** Pedestals carrying the urns, just inside the arch's pillars. */
  pedestalX: 1.78,
  pitch: 0.27,
} as const;

/** Marble floor from the balustrade to behind the camera. */
export const FLOOR = { zFar: RAIL.z - 0.3, zNear: 16, half: 11 } as const;

/** The lake: a big still sheet out to the mountains. */
export const LAKE = { half: 300, zNear: -1, zFar: -320 } as const;

/** Swans are modelled at mute-swan proportions and scaled up so the heart reads far out on the lake. */
export const SWAN_SCALE = 3.0;

export const SWANS = {
  z: -17,
  /** Each swan's origin sits this far from the axis, so their beaks just touch. */
  meetX: 0.296 * SWAN_SCALE,
  /** Where they rest before gliding in (out to the sides). */
  startX: 7.5,
  /** How much nearer the shore they start. */
  startDz: 4,
} as const;

/** Where the sun sets: low over the valley a little left of the axis. */
export const SUN = { dir: [-0.12, 0.042, -1] as V3 } as const;

/** Wax seal radius and the four shard seeds, in seal-plane units (-1..1 across the seal). */
export const SEAL_SEEDS: V2[] = [
  [0.46, 0.22],
  [-0.2, 0.47],
  [-0.44, -0.24],
  [0.18, -0.48],
];

export const BASMALA = 'بسم الله الرحمن الرحيم';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export function rng(seed: number) {
  return mulberry32(seed);
}

/** Apex height of a pointed arch of half-width `halfWidth`. */
export function archApex(halfWidth: number): number {
  const r = halfWidth + ARCH.e;
  return ARCH.spring + Math.sqrt(r * r - ARCH.e * ARCH.e);
}

/**
 * One side of a pointed arch, from the springing point up to the apex. The left side (-1) is
 * an arc centred right of the axis (that's what makes it pointed); the right side mirrors it.
 */
export function archArc(halfWidth: number, side: -1 | 1, segments: number): V2[] {
  const { e, spring } = ARCH;
  const r = halfWidth + e;
  const h = Math.sqrt(r * r - e * e);
  const start = Math.PI;
  const end = Math.atan2(h, -e);
  const out: V2[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + ((end - start) * i) / segments;
    const x = e + r * Math.cos(a);
    out.push([side < 0 ? x : -x, spring + r * Math.sin(a)]);
  }
  return out;
}

/** Lobes along each side of the opening (a Mughal cusped arch). */
export const CUSPS = { lobes: 5, depth: 0.11 } as const;

/**
 * The inner edge of one side, cusped: the pointed arc with semicircular lobes cut into it, so
 * small points (cusps) reach into the opening between them. Same ends as `archArc`.
 */
export function cuspedArc(halfWidth: number, side: -1 | 1, segments: number): V2[] {
  const arc = archArc(halfWidth, side, segments * CUSPS.lobes);
  const cx = side < 0 ? ARCH.e : -ARCH.e;
  const n = arc.length - 1;
  return arc.map(([x, y], i) => {
    const f = ((i / n) * CUSPS.lobes) % 1;
    // 0 at each lobe's middle, `depth` at the cusps between lobes (and at the springing/apex).
    const off = CUSPS.depth * (1 - Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2)));
    const dx = cx - x;
    const dy = ARCH.spring - y;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * off, y + (dy / len) * off];
  });
}

/** The arch with its two pillars as one closed polygon: pointed outside, cusped inside. */
export function archOutline(segments = 24): V2[] {
  const { a, t } = ARCH;
  const outerL = archArc(a + t, -1, segments);
  const outerR = archArc(a + t, 1, segments).reverse().slice(1);
  const lobe = Math.max(4, Math.round(segments / CUSPS.lobes));
  const innerR = cuspedArc(a, 1, lobe);
  const innerL = cuspedArc(a, -1, lobe).reverse().slice(1);
  return [[-(a + t), 0], ...outerL, ...outerR, [a + t, 0], [a, 0], ...innerR, ...innerL, [-a, 0]];
}

/** The clear opening (floor to the cusped crown) as a closed polygon, for cutting it out of the wall. */
export function openingOutline(segments = 24): V2[] {
  const { a } = ARCH;
  const lobe = Math.max(4, Math.round(segments / CUSPS.lobes));
  const left = cuspedArc(a, -1, lobe);
  const right = cuspedArc(a, 1, lobe).reverse().slice(1);
  return [[-a, 0], ...left, ...right, [a, 0]];
}

export function polygonArea(poly: V2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]!;
    const [x2, y2] = poly[(i + 1) % poly.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** The middle line of the arch ring, left foot → apex → right foot, as a polyline. */
export function archCentreline(segments = 40): V2[] {
  const { a, t } = ARCH;
  const m = a + t / 2;
  return [[-m, 0], ...archArc(m, -1, segments), ...archArc(m, 1, segments).reverse().slice(1), [m, 0]];
}

/** Point and outward in-plane normal at `s` (0..1 by length) along a polyline. */
export function samplePolyline(poly: V2[], s: number): { p: V2; n: V2 } {
  const lengths = [0];
  for (let i = 1; i < poly.length; i++) {
    const [x0, y0] = poly[i - 1]!;
    const [x1, y1] = poly[i]!;
    lengths.push(lengths[i - 1]! + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = lengths[lengths.length - 1]!;
  const target = clamp01(s) * total;
  let i = 1;
  while (i < poly.length - 1 && lengths[i]! < target) i++;
  const [x0, y0] = poly[i - 1]!;
  const [x1, y1] = poly[i]!;
  const seg = lengths[i]! - lengths[i - 1]! || 1;
  const u = (target - lengths[i - 1]!) / seg;
  const tx = (x1 - x0) / seg;
  const ty = (y1 - y0) / seg;
  return { p: [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], n: [-ty, tx] };
}

export interface RoseSpot {
  position: V3;
  /** Which way the bloom faces (unit). */
  facing: V3;
  scale: number;
  /** 0..1 picks the rose's colour from the palette ramp. */
  hue: number;
  /** Spin around its own axis. */
  spin: number;
}

/** How thickly roses grow along the arch (by centreline position): heavy over the crown and shoulders, a cascade at both feet. */
export function roseDensity(s: number): number {
  const bump = (c: number, w: number) => Math.exp(-(((s - c) / w) ** 2));
  return 0.2 + 0.9 * bump(0.5, 0.1) + 0.8 * bump(0.34, 0.08) + 0.75 * bump(0.68, 0.07) + 0.55 * bump(0.06, 0.06) + 0.5 * bump(0.94, 0.06);
}

/** Roses scattered over the arch (arch frame): mostly on its face, some on the sides and the back. Seeded. */
export function roseLayout(count: number, seed = 11): RoseSpot[] {
  const rand = rng(seed);
  const line = archCentreline(48);
  const { t, depth } = ARCH;
  const z = 0;
  const out: RoseSpot[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const s = rand();
    if (rand() * 2.2 > roseDensity(s)) continue;
    const { p, n } = samplePolyline(line, s);
    if (p[1] < 0.25) continue; // none on the floor itself
    const kind = rand();
    let o: number;
    let dz: number;
    let facing: V3;
    // Around the crown, keep the roses on the outer half so none hang into the opening.
    const crown = s > 0.28 && s < 0.72;
    if (kind < 0.72) {
      o = (rand() - 0.5) * (t + 0.2);
      if (crown) o = Math.abs(o) * 0.9 - 0.02;
      dz = depth / 2 + 0.015 + rand() * 0.07;
      facing = [n[0] * o * 1.6 + (rand() - 0.5) * 0.5, n[1] * o * 1.6 + (rand() - 0.4) * 0.5, 1];
    } else if (kind < 0.9) {
      o = t / 2 + 0.03 + rand() * 0.05;
      dz = (rand() - 0.5) * depth;
      facing = [n[0] + (rand() - 0.5) * 0.4, n[1] + (rand() - 0.5) * 0.4, (rand() - 0.2) * 0.8];
    } else {
      o = (rand() - 0.5) * (t + 0.15);
      if (crown) o = Math.abs(o);
      dz = -depth / 2 - 0.02 - rand() * 0.05;
      facing = [(rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5, -1];
    }
    const len = Math.hypot(...facing);
    out.push({
      position: [p[0] + n[0] * o, p[1] + n[1] * o, z + dz],
      facing: [facing[0] / len, facing[1] / len, facing[2] / len],
      scale: 0.07 + rand() * 0.05,
      hue: rand(),
      spin: rand() * Math.PI * 2,
    });
  }
  return out;
}

/** A bouquet: roses over a dome (centre in the arch frame), facing out and up. Seeded. */
export function bouquetLayout(centre: V3, radius: number, count: number, seed: number, squash = 0.75): RoseSpot[] {
  const rand = rng(seed);
  const out: RoseSpot[] = [];
  for (let i = 0; i < count; i++) {
    // Golden-angle spiral over the upper hemisphere, a little irregular.
    const k = (i + 0.5) / count;
    const polar = Math.acos(1 - k * 1.15) * (0.9 + rand() * 0.15);
    const az = i * 2.39996 + rand() * 0.4;
    const dir: V3 = [Math.sin(polar) * Math.cos(az), Math.cos(polar), Math.sin(polar) * Math.sin(az)];
    const r = radius * (0.9 + rand() * 0.18);
    out.push({
      position: [centre[0] + dir[0] * r, centre[1] + dir[1] * r * squash, centre[2] + dir[2] * r],
      facing: dir,
      scale: radius * (0.2 + rand() * 0.1),
      hue: rand(),
      spin: rand() * Math.PI * 2,
    });
  }
  return out;
}

/** World → arch frame. */
export function toArch(p: V3): V3 {
  return [p[0] - ARCH_AT[0], p[1] - ARCH_AT[1], p[2] - ARCH_AT[2]];
}

/** Every rose on the set, in the arch frame: the arch, the two urns' bouquets and the bushes at the arch's feet. */
export function allRoses(archCount: number, bouquet: number, bush: number): RoseSpot[] {
  const urnTop = RAIL.h + 0.55;
  return [
    ...roseLayout(archCount),
    ...[-1, 1].flatMap((side, i) => bouquetLayout(toArch([side * RAIL.pedestalX, FLOOR_Y + urnTop, RAIL.z]), 0.42, bouquet, 31 + i, 0.8)),
    ...[-1, 1].flatMap((side, i) => bouquetLayout(toArch([side * (ARCH.a - 0.05), FLOOR_Y + 0.05, ARCH.z - 0.7]), 0.62, bush, 41 + i, 0.9)),
  ];
}

export interface LeafSpot {
  position: V3;
  facing: V3;
  scale: number;
  spin: number;
  shade: number;
}

/** Leaves: a few around every rose, plus a scatter along the whole ring so the vine reads. */
export function leafLayout(roses: RoseSpot[], extra: number, seed = 23): LeafSpot[] {
  const rand = rng(seed);
  const out: LeafSpot[] = [];
  const { t, depth } = ARCH;
  const z = 0;
  for (const r of roses) {
    const k = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < k; i++) {
      const a = rand() * Math.PI * 2;
      const d = r.scale * (1.2 + rand() * 0.8);
      out.push({
        position: [r.position[0] + Math.cos(a) * d, r.position[1] + Math.sin(a) * d, r.position[2] - 0.01 * Math.sign(r.facing[2] || 1)],
        facing: [r.facing[0] + Math.cos(a) * 0.6, r.facing[1] + Math.sin(a) * 0.6, r.facing[2]],
        scale: r.scale * (1.15 + rand() * 0.6),
        spin: a - Math.PI / 2 + (rand() - 0.5) * 0.6,
        shade: 0.75 + rand() * 0.35,
      });
    }
  }
  const line = archCentreline(48);
  for (let i = 0; i < extra; i++) {
    const s = rand();
    const { p, n } = samplePolyline(line, s);
    if (p[1] < 0.35) continue;
    const front = rand() < 0.75;
    const o = front ? (rand() - 0.5) * (t + 0.12) : (t / 2 + 0.02) * (rand() < 0.5 ? -1 : 1);
    const dz = front ? depth / 2 + 0.01 + rand() * 0.03 : (rand() - 0.5) * depth;
    out.push({
      position: [p[0] + n[0] * o, p[1] + n[1] * o, z + dz],
      facing: front ? [(rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, 1] : [n[0] * Math.sign(o), n[1] * Math.sign(o), (rand() - 0.5) * 0.6],
      scale: 0.08 + rand() * 0.05,
      spin: rand() * Math.PI * 2,
      shade: 0.7 + rand() * 0.4,
    });
  }
  return out;
}

/** Trailing strands of greenery hanging from the inner arc into the opening (arch frame). Seeded. */
export function strandLayout(count: number, seed = 57): V3[][] {
  const rand = rng(seed);
  const out: V3[][] = [];
  for (let i = 0; i < count; i++) {
    // Along the upper inner arc, both sides; longer near the shoulders.
    const side = i % 2 === 0 ? -1 : 1;
    const along = 0.2 + rand() * 0.75;
    const arc = archArc(ARCH.a, side, 24);
    const [x, y] = arc[Math.min(arc.length - 1, Math.floor(along * arc.length))]!;
    // Longest down the sides, short over the crown so the middle of the view stays open.
    const len = 0.3 + rand() * 1.6 * (1 - along) ** 1.2;
    const sway = (rand() - 0.5) * 0.25;
    const pts: V3[] = [];
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      pts.push([x + sway * f * f - side * f * 0.08, y + 0.02 - len * f, ARCH.depth / 2 - 0.06 + Math.sin(f * 3 + i) * 0.03]);
    }
    out.push(pts);
  }
  return out;
}

/** Leaves (and a few small blossoms) along the hanging strands. */
export function strandLeaves(strands: V3[][], seed = 61): LeafSpot[] {
  const rand = rng(seed);
  const out: LeafSpot[] = [];
  for (const pts of strands) {
    for (let k = 1; k < pts.length; k++) {
      const [x, y, z] = pts[k]!;
      for (let j = 0; j < 4; j++) {
        const a = rand() * Math.PI * 2;
        out.push({
          position: [x + Math.cos(a) * 0.05, y + (rand() - 0.5) * 0.1, z + 0.02 + (rand() - 0.5) * 0.05],
          facing: [Math.cos(a) * 0.7, -0.2, 1],
          scale: 0.065 + rand() * 0.05,
          spin: a + Math.PI / 2,
          shade: 0.75 + rand() * 0.35,
        });
      }
    }
  }
  return out;
}

/** Lanterns: two hanging in the opening, a pair on the floor by the urns and two small ones in front (world). */
export const LANTERNS: { at: V3; scale: number; hanging: boolean }[] = [
  { at: [-1.4, FLOOR_Y + 5.05, ARCH.z - 0.05], scale: 0.95, hanging: true },
  { at: [1.4, FLOOR_Y + 5.05, ARCH.z - 0.05], scale: 0.95, hanging: true },
  { at: [-1.32, FLOOR_Y, RAIL.z + 0.55], scale: 1.0, hanging: false },
  { at: [1.32, FLOOR_Y, RAIL.z + 0.55], scale: 1.0, hanging: false },
  { at: [-1.02, FLOOR_Y, RAIL.z + 0.95], scale: 0.62, hanging: false },
  { at: [1.06, FLOOR_Y, RAIL.z + 1.05], scale: 0.55, hanging: false },
];

/** Where each hanging lantern's chain is fixed (world): on the inner arc above it. */
export function chainTop(x: number): number {
  const r = ARCH.a + ARCH.e;
  const dx = Math.abs(x) + ARCH.e;
  return FLOOR_Y + ARCH.spring + Math.sqrt(Math.max(0, r * r - dx * dx)) - 0.05;
}

/** A climbing stem spiralling around the arch ring. */
export function vinePath(phase: number, turns = 9, samples = 220): V3[] {
  const line = archCentreline(48);
  const { t, depth } = ARCH;
  const z = 0;
  const out: V3[] = [];
  for (let i = 0; i <= samples; i++) {
    const s = 0.03 + (0.94 * i) / samples;
    const { p, n } = samplePolyline(line, s);
    const phi = s * Math.PI * 2 * turns + phase;
    const ro = t / 2 + 0.035;
    const rz = depth / 2 + 0.03;
    out.push([p[0] + n[0] * Math.cos(phi) * ro, p[1] + n[1] * Math.cos(phi) * ro, z + Math.sin(phi) * rz]);
  }
  return out;
}

/**
 * Where a swan is during its glide (u = 0 far out at the side, 1 = at the heart). `side` -1 is the
 * left swan (facing +x), +1 the right one. They come in on a gentle curve from nearer the camera.
 */
export function swanPlacement(side: -1 | 1, u: number): { x: number; z: number; heading: number; wake: number } {
  const k = easeOutCubic(u);
  const x = side * lerp(SWANS.startX, SWANS.meetX, k);
  const z = SWANS.z + SWANS.startDz * (1 - k) * (1 - k);
  // Direction of travel: d/dk of (x, z).
  const dx = side * (SWANS.meetX - SWANS.startX);
  const dz = -2 * SWANS.startDz * (1 - k);
  const heading = Math.atan2(-dz, dx);
  // The wake is strongest while they glide fast, and settles to a whisper once they meet.
  const wake = u <= 0 ? 0 : (1 - k) * 0.85 + 0.15;
  return { x, z, heading, wake };
}

/** The seal's poured-wax rim: radius multiplier around the circle. */
export function sealRim(angle: number): number {
  return 1 + 0.045 * Math.sin(angle * 7) + 0.03 * Math.sin(angle * 13 + 1.3) + 0.015 * Math.sin(angle * 23 + 0.4);
}

/** Which shard (index into SEAL_SEEDS) a point of the seal plane belongs to — mirrors the shader. */
export function shardOf(p: V2, jitter: (p: V2, i: number) => number = () => 0): number {
  let best = Infinity;
  let id = 0;
  SEAL_SEEDS.forEach((s, i) => {
    const d = Math.hypot(p[0] - s[0], p[1] - s[1]) + jitter(p, i);
    if (d < best) {
      best = d;
      id = i;
    }
  });
  return id;
}

/** Shard motion after the crack (c 0..1), in seal radii: a jolt apart, then a tumbling fall that fades. */
export function shardMotion(i: number, c: number): { offset: V3; rotation: V3; opacity: number } {
  const s = SEAL_SEEDS[i]!;
  const len = Math.hypot(s[0], s[1]);
  const dir: V2 = [s[0] / len, s[1] / len];
  const jolt = smoothstep(0.08, 0.26, c) * 0.1;
  const f = Math.max(0, (c - 0.24) / 0.76);
  const spin = [0.9, -1.2, 1.1, -0.8][i]!;
  return {
    offset: [dir[0] * (jolt + f * 1.3), dir[1] * (jolt + f * 0.7) - f * f * 10, f * 2.4],
    rotation: [f * 2.4 * spin, f * 1.6 * -spin, f * 1.9 * dir[0]],
    opacity: 1 - smoothstep(0.6, 1, c),
  };
}

/** The envelope's four flaps, in the order they fold open. */
export const FLAPS = ['top', 'bottom', 'left', 'right'] as const;
export type FlapId = (typeof FLAPS)[number];

/** Envelope proportions for the screen: tall enough to fill a phone, a landscape card on desktop. */
export function envelopeSize(aspect: number): { w: number; h: number } {
  return aspect < 0.85 ? { w: 1.0, h: 2.0 } : { w: 1.72, h: 1.12 };
}

export const ENVELOPE_AT: V3 = [0, 4.6, 7.6];

/** When the opening's light whites out the frame (s): the envelope gives way to the garden. */
export const VEIL = { in: 2.35, full: 2.75, out: 3.9 } as const;

/**
 * The opening's camera track (8 s). On phones the envelope fills the screen edge to edge; wide
 * screens see a card. After the light the camera finds itself outside the loggia and glides in
 * through the arch to the hero view (S3).
 */
export function buildTrack(env: { w: number; h: number }): TrackKey[] {
  const [ex, ey, ez] = ENVELOPE_AT;
  const portrait = env.h > env.w;
  const gate: [number, number] = portrait ? [env.w * 0.74, env.h * 0.74] : [env.w * 1.3, env.h * 1.75];
  // Wide screens: aim a little above the card so it sits below the names in the gate's header.
  const lift = portrait ? 0 : env.h * 0.08;
  const hero = heroShot(portrait);
  const shot = (s: Shot): Shot => s;
  return [
    // `fit` only ever pulls the camera back, so the gate starts close: on phones the envelope
    // overfills the screen; wider screens back off until the whole card shows.
    { at: 0, shot: shot({ position: [ex, ey + lift, ez + 3.5], target: [ex, ey + lift, ez], fov: 27, fit: gate }) },
    { at: 0.9, shot: shot({ position: [ex, ey + 0.02, ez + 3.0], target: [ex, ey, ez], fov: 27, fit: [gate[0] * 0.86, gate[1] * 0.86] }) },
    { at: 2.1, shot: shot({ position: [ex, ey, ez + 2.2], target: [ex, ey, ez], fov: 28, fit: [gate[0] * 0.66, gate[1] * 0.66] }) },
    { at: VEIL.full, shot: shot({ position: [ex, ey, ez + 0.9], target: [ex, ey, ez], fov: 30, fit: [env.w * 0.4, env.h * 0.4] }) },
    // Behind the veil: cut to just outside the loggia, then glide in through the arch.
    { at: VEIL.full + 0.05, shot: shot({ position: [hero.position[0], hero.position[1] + 0.9, hero.position[2] + 4.2], target: [0, hero.target[1] + 1.2, hero.target[2]], fov: hero.fov + 4 }) },
    { at: 5.6, shot: shot({ position: [hero.position[0] - 0.25, hero.position[1] + 0.25, hero.position[2] + 1.2], target: [0, hero.target[1] + 0.3, hero.target[2]], fov: hero.fov + 1 }) },
    { at: 8.0, shot: hero },
  ];
}

/** S3, the hero: the arch frames the sunset lake, the swans' heart just above the balustrade. */
export const S3: Shot = { position: [0, 5.6, 10.6], target: [0, 6.5, -12], fov: 60 };
/** The same view on wide screens: further back, the arcade's side arches framing it too. */
export const S3_WIDE: Shot = { position: [0, 5.3, 15.5], target: [0, 5.15, -12], fov: 42 };

export function heroShot(portrait: boolean): Shot {
  return portrait ? S3 : S3_WIDE;
}

/** Content backdrop: the hero, tilting up into the sunset sky as the guest scrolls. */
export function ambientShot(scroll: number, drift: number, portrait = true): Shot {
  const h = heroShot(portrait);
  const s = clamp01(scroll);
  const e = s * s * (3 - 2 * s);
  return {
    position: [Math.sin(drift) * 0.12, h.position[1] + e * 1.2, h.position[2] - e * 1.5],
    target: [0, h.target[1] + e * 9, h.target[2]],
    fov: h.fov,
  };
}
