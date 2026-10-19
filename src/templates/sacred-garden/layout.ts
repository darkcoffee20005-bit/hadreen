/**
 * The Sacred Garden as data: the arch's outline, where roses grow on it, how the swans glide in,
 * the wax seal's four shards and the camera track. Pure maths (no three.js, no DOM) so it can be
 * unit-tested and shared by the 3D scene and its builders.
 */
import { mulberry32 } from '@/lib/invite/audio/dsp';
import type { Shot, TrackKey } from '@/lib/invite/stage/rig';

export type V2 = [number, number];
export type V3 = [number, number, number];

/** A two-centred (pointed) stone arch standing in the pond. Metres. */
export const ARCH = {
  /** Half the clear opening. */
  a: 1.15,
  /** Thickness of the arch ring and pillars (in the arch's plane). */
  t: 0.3,
  /** Offset of each arc's centre from the axis: bigger = more pointed. */
  e: 0.35,
  /** Height where the arcs spring from the pillars. */
  spring: 2.3,
  /** Depth of the stone (front to back). */
  depth: 0.42,
  z: -2.6,
} as const;

/** The reflecting pool (a long rectangular hawdh leading to the arch). */
export const POOL = { x: 3.0, zNear: 9.0, zFar: -4.6, coping: 0.32, deck: 1.35 } as const;

/** Swans are modelled at mute-swan proportions and scaled up a little so the heart reads. */
export const SWAN_SCALE = 1.2;

export const SWANS = {
  z: -1.55,
  /** Each swan's origin sits this far from the axis, so their beaks just touch. */
  meetX: 0.3 * SWAN_SCALE,
  /** Where they rest before gliding in (inside the pool, near its sides). */
  startX: 2.45,
  /** How much nearer the camera they start. */
  startDz: 1.05,
} as const;

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

/** The arch with its two pillars as one closed polygon (an upside-down U with a pointed top). */
export function archOutline(segments = 24): V2[] {
  const { a, t } = ARCH;
  const outerL = archArc(a + t, -1, segments);
  const outerR = archArc(a + t, 1, segments).reverse().slice(1);
  const innerR = archArc(a, 1, segments);
  const innerL = archArc(a, -1, segments).reverse().slice(1);
  return [[-(a + t), 0], ...outerL, ...outerR, [a + t, 0], [a, 0], ...innerR, ...innerL, [-a, 0]];
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

/** How thickly roses grow along the arch (by centreline position): heavy on the left shoulder and crown. */
export function roseDensity(s: number): number {
  const bump = (c: number, w: number) => Math.exp(-(((s - c) / w) ** 2));
  return 0.18 + 0.95 * bump(0.33, 0.1) + 0.85 * bump(0.5, 0.07) + 0.6 * bump(0.66, 0.09) + 0.35 * bump(0.18, 0.08) + 0.25 * bump(0.8, 0.07);
}

/** Roses scattered over the arch: mostly on its face, some on the sides and the back. Seeded. */
export function roseLayout(count: number, seed = 11): RoseSpot[] {
  const rand = rng(seed);
  const line = archCentreline(48);
  const { t, depth, z } = ARCH;
  const out: RoseSpot[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const s = rand();
    if (rand() * 2.2 > roseDensity(s)) continue;
    const { p, n } = samplePolyline(line, s);
    if (p[1] < 0.42) continue; // no roses in the water
    const kind = rand();
    let o: number;
    let dz: number;
    let facing: V3;
    // Around the crown, keep the roses on the outer half so none hang into the opening.
    const crown = s > 0.36 && s < 0.64;
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
      scale: 0.048 + rand() * 0.034,
      hue: rand(),
      spin: rand() * Math.PI * 2,
    });
  }
  return out;
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
  const { t, depth, z } = ARCH;
  for (const r of roses) {
    const k = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < k; i++) {
      const a = rand() * Math.PI * 2;
      const d = r.scale * (1.2 + rand() * 0.8);
      out.push({
        position: [r.position[0] + Math.cos(a) * d, r.position[1] + Math.sin(a) * d, r.position[2] - 0.01 * Math.sign(r.facing[2] || 1)],
        facing: [r.facing[0] + Math.cos(a) * 0.6, r.facing[1] + Math.sin(a) * 0.6, r.facing[2]],
        scale: 0.06 + rand() * 0.04,
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
      scale: 0.055 + rand() * 0.04,
      spin: rand() * Math.PI * 2,
      shade: 0.7 + rand() * 0.4,
    });
  }
  return out;
}

/** The hedge behind the pool. */
export const HEDGE = { z: -9.8, depth: 1.6 } as const;

/** Hedge height along its length: tall behind the arch (so the opening is all leaves), stepping down at the sides. */
export function hedgeProfile(x: number): number {
  const a = Math.abs(x);
  return 3.6 + 0.5 * smoothstep(4.75, 4.45, a) + 0.5 * smoothstep(3.05, 2.75, a);
}

/** Climbing roses scattered over the hedge face, thickest near its top, sparse behind the arch's opening. */
export function hedgeRoseLayout(count: number, seed = 61): RoseSpot[] {
  const rand = rng(seed);
  const out: RoseSpot[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const x = (rand() * 2 - 1) * 12.5;
    const top = hedgeProfile(x);
    const y = top * Math.sqrt(rand());
    if (y < 0.4 || y > top - 0.08) continue;
    if (Math.abs(x) < 1.7 && y > 0.9 && y < top - 0.5 && rand() > 0.15) continue;
    out.push({
      position: [x, y, HEDGE.z + HEDGE.depth / 2 + 0.05 + rand() * 0.12],
      facing: [(rand() - 0.5) * 0.6, (rand() - 0.3) * 0.6, 1],
      scale: 0.08 + rand() * 0.07,
      hue: rand(),
      spin: rand() * Math.PI * 2,
    });
  }
  return out;
}

/** A climbing stem spiralling around the arch ring. */
export function vinePath(phase: number, turns = 9, samples = 220): V3[] {
  const line = archCentreline(48);
  const { t, depth, z } = ARCH;
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

/** Envelope proportions for the screen: portrait on phones (fills the middle band), landscape on desktop. */
export function envelopeSize(aspect: number): { w: number; h: number; flap: number } {
  return aspect < 0.85 ? { w: 1.1, h: 1.5, flap: 0.46 } : { w: 1.62, h: 1.06, flap: 0.58 };
}

export const ENVELOPE_AT: V3 = [0, 1.2, 3.2];

/** The opening's camera track (8 s). Shots carry `fit` boxes so phones and desktops both compose. */
export function buildTrack(env: { w: number; h: number; flap: number }): TrackKey[] {
  const [ex, ey, ez] = ENVELOPE_AT;
  const sealY = ey + env.h / 2 - env.h * env.flap + 0.06;
  const shot = (s: Shot): Shot => s;
  return [
    { at: 0, shot: shot({ position: [ex, ey + 0.42, ez + 4.4], target: [ex, ey - 0.02, ez], fov: 27, fit: [env.w * 1.14, env.h * 1.78] }) },
    { at: 0.55, shot: shot({ position: [ex, sealY + 0.25, ez + 2.4], target: [ex, sealY, ez], fov: 27, fit: [env.w * 0.86, env.h * 1.15] }) },
    { at: 1.65, shot: shot({ position: [ex, ey + 0.5, ez + 4.2], target: [ex, ey + 0.2, ez], fov: 27, fit: [env.w * 1.3, env.h * 2.2] }) },
    { at: 2.9, shot: shot({ position: [-0.6, 0.42, 4.6], target: [0, 1.5, ARCH.z], fov: 46, fit: [3.0, 4.6] }) },
    { at: 4.8, shot: shot({ position: [-0.3, 0.5, 3.4], target: [0, 1.6, ARCH.z], fov: 44, fit: [2.8, 4.4] }) },
    { at: 6.8, shot: shot({ position: [0.05, 0.82, 2.9], target: [0, 1.05, -1.9], fov: 40, fit: [2.0, 2.4] }) },
    { at: 8.0, shot: S3 },
  ];
}

/** S3, the heart: swans centred under the arch, basmala and names above. Also the ambient frame. */
export const S3: Shot = { position: [0, 2.9, 5.5], target: [0, 1.95, ARCH.z + 0.2], fov: 33.4, fit: [2.55, 4.15] };

/** Content backdrop: S3, craned up the arch into the sky as the guest scrolls. */
export function ambientShot(scroll: number, drift: number): Shot {
  const s = clamp01(scroll);
  const e = s * s * (3 - 2 * s);
  return {
    position: [Math.sin(drift) * 0.18, S3.position[1] + e * 6.2, S3.position[2] + e * 1.4],
    target: [0, S3.target[1] + e * 7.8, S3.target[2]],
    fov: S3.fov,
    fit: S3.fit,
  };
}
