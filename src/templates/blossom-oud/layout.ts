import { mulberry32 } from '@/lib/invite/audio/dsp';
import { AVENUE, PALACE_Z } from './camera';

/**
 * Where things stand, as pure data (seeded, so every frame and screenshot is reproducible).
 * Counts come from the tier (PLAN §9.2): crystals 300/140/48, palms 36/20/10, mist 6/4/2.
 */
export type Tier = 'low' | 'medium' | 'high';
export const CRYSTALS: Record<Tier, number> = { high: 300, medium: 140, low: 48 };
export const PALMS: Record<Tier, number> = { high: 36, medium: 20, low: 10 };
export const MIST: Record<Tier, number> = { high: 6, medium: 4, low: 2 };
export const LANTERNS: Record<Tier, number> = { high: 24, medium: 16, low: 10 };
export const FRONDS: Record<Tier, number> = { high: 14, medium: 12, low: 9 };

/* ───────────────────────── Chandelier crystals ───────────────────────── */

export interface Crystal {
  p: [number, number, number];
  /** Uniform size multiplier; `squash` < 1 makes a round bead instead of a long drop. */
  s: number;
  squash: number;
  rot: number;
  /** Seconds offset for the twinkle. */
  phase: number;
}

export const ARM_A = { n: 8, r: 1.08, y: 0.06 };
export const ARM_B = { n: 6, r: 0.64, y: 0.66 };

const swag = (out: Crystal[], a: number, b: number, r: number, y: number, beads: number, sag: number, phase: number) => {
  for (let k = 1; k <= beads; k++) {
    const u = k / (beads + 1);
    const ang = a + (b - a) * u;
    const rr = r * (0.94 + 0.06 * Math.cos((u - 0.5) * Math.PI)) - Math.sin(u * Math.PI) * 0.05;
    out.push({ p: [Math.cos(ang) * rr, y - Math.sin(u * Math.PI) * sag, Math.sin(ang) * rr], s: 0.032, squash: 0.75, rot: ang, phase: phase + k * 0.37 });
  }
};

/** The chandelier's crystals in its local frame (centre at the origin, ~2.2 wide, ~2.3 tall). */
export function crystalLayout(count: number): Crystal[] {
  const lvl = count >= 260 ? 2 : count >= 120 ? 1 : 0;
  const armDrops = [1, 2, 3][lvl]!;
  const swagA = [2, 6, 12][lvl]!;
  const swagB = [0, 4, 8][lvl]!;
  const cascade = [
    [8, 6, 4, 0],
    [12, 10, 7, 4],
    [20, 16, 12, 7],
  ][lvl]!;
  const crown = [0, 8, 16][lvl]!;
  const inner = [0, 0, 24][lvl]!;
  const out: Crystal[] = [];

  // The bottom drop and the cascade basket under the bowl.
  out.push({ p: [0, -1.18, 0], s: 0.11, squash: 1, rot: 0, phase: 0.3 });
  const rings = [
    [0.78, -0.32],
    [0.56, -0.58],
    [0.36, -0.82],
    [0.19, -1.0],
  ] as const;
  rings.forEach(([r, y], ri) => {
    const n = cascade[ri]!;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ri * 0.21;
      out.push({ p: [Math.cos(a) * r, y, Math.sin(a) * r], s: 0.06 - ri * 0.006, squash: 1, rot: a, phase: i * 0.71 + ri });
    }
  });
  // Drops hanging from each lower arm tip.
  for (let i = 0; i < ARM_A.n; i++) {
    const a = (i / ARM_A.n) * Math.PI * 2;
    for (let k = 0; k < armDrops; k++) {
      const big = k === armDrops - 1;
      out.push({ p: [Math.cos(a) * ARM_A.r, ARM_A.y - 0.16 - k * 0.15 - (big ? 0.05 : 0), Math.sin(a) * ARM_A.r], s: big ? 0.07 : 0.035, squash: big ? 1 : 0.7, rot: a, phase: i * 1.3 + k });
    }
  }
  // Festoons between the arm tips.
  for (let i = 0; i < ARM_A.n; i++) {
    const a = (i / ARM_A.n) * Math.PI * 2;
    swag(out, a, a + (Math.PI * 2) / ARM_A.n, ARM_A.r, ARM_A.y - 0.06, swagA, 0.26, i * 0.9);
  }
  for (let i = 0; i < ARM_B.n; i++) {
    const a = (i / ARM_B.n) * Math.PI * 2 + 0.3;
    if (swagB > 0) swag(out, a, a + (Math.PI * 2) / ARM_B.n, ARM_B.r, ARM_B.y - 0.05, swagB, 0.18, i * 1.1);
    if (lvl > 0) out.push({ p: [Math.cos(a) * ARM_B.r, ARM_B.y - 0.17, Math.sin(a) * ARM_B.r], s: 0.05, squash: 1, rot: a, phase: i * 0.6 });
  }
  // A ring of drops inside the lower arms, and a crown of spikes on top.
  for (let i = 0; i < inner; i++) {
    const a = (i / inner) * Math.PI * 2 + 0.13;
    out.push({ p: [Math.cos(a) * 0.86, -0.12 - (i % 2) * 0.09, Math.sin(a) * 0.86], s: 0.04, squash: 1, rot: a, phase: i * 0.43 });
  }
  for (let i = 0; i < crown; i++) {
    const a = (i / crown) * Math.PI * 2;
    out.push({ p: [Math.cos(a) * 0.36, 1.12, Math.sin(a) * 0.36], s: 0.05, squash: -1, rot: a, phase: i * 0.77 });
  }
  // Long pendants from the cascade ring, to reach the requested count exactly.
  const rand = mulberry32(31);
  let j = 0;
  while (out.length < count) {
    const a = (j / 24) * Math.PI * 2 + 0.07;
    const r = 0.66 + 0.1 * rand();
    out.push({ p: [Math.cos(a) * r, -0.5 - rand() * 0.25 - (j % 3) * 0.08, Math.sin(a) * r], s: 0.036, squash: 0.85, rot: a, phase: rand() * 6 });
    j++;
  }
  return out.slice(0, count);
}

/* ───────────────────────── The avenue ───────────────────────── */

export interface Palm {
  x: number;
  z: number;
  height: number;
  /** Direction the trunk leans (radians about y) and the crown's turn. */
  turn: number;
  /** Crown top (where the fronds start), world space. */
  top: [number, number, number];
  phase: number;
}

/** Trunk lean at the top, in world units at unit scale (the trunk geometry uses the same curve). */
export const TRUNK_LEAN = 0.42;

export function palmLayout(count: number): Palm[] {
  const rand = mulberry32(7);
  const perSide = Math.max(1, Math.round(count / 2));
  const span = AVENUE.end - AVENUE.start;
  const out: Palm[] = [];
  for (let i = 0; i < perSide; i++) {
    for (const side of [-1, 1]) {
      const z = AVENUE.start + (span * i) / Math.max(1, perSide - 1) + (rand() - 0.5) * 0.6;
      const x = side * (AVENUE.palmX + (rand() - 0.5) * 0.35);
      const height = 6.8 + rand() * 1.5;
      // Lean gently outward, away from the walk.
      const turn = (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 0.9;
      const lean = TRUNK_LEAN;
      out.push({ x, z, height, turn, top: [x + Math.cos(turn) * lean, height, z - Math.sin(turn) * lean], phase: rand() * 6.28 });
    }
  }
  return out.slice(0, count);
}

export interface Frond {
  /** Palm index and the frond's turn (about y), droop (about its base) and length. */
  palm: number;
  yaw: number;
  pitch: number;
  length: number;
}

export function frondLayout(palms: Palm[], perPalm: number): Frond[] {
  const rand = mulberry32(11);
  const out: Frond[] = [];
  palms.forEach((p, i) => {
    for (let k = 0; k < perPalm; k++) {
      const upper = k % 3 === 0;
      out.push({
        palm: i,
        yaw: (k / perPalm) * Math.PI * 2 + p.phase + (rand() - 0.5) * 0.35,
        pitch: upper ? -0.55 + rand() * 0.25 : -0.1 + rand() * 0.55,
        length: (upper ? 2.3 : 2.9) + rand() * 0.6,
      });
    }
  });
  return out;
}

export interface Lantern {
  p: [number, number, number];
  /** Order down the avenue (0 = nearest the arch), for lighting them in turn. */
  order: number;
  seed: number;
}

/** Lanterns on posts between the palms, both sides; plus two flanking the gate arch. */
export function lanternLayout(count: number): Lantern[] {
  const perSide = Math.max(1, Math.round(count / 2));
  const span = AVENUE.end - AVENUE.start;
  const out: Lantern[] = [];
  for (let i = 0; i < perSide; i++) {
    const z = AVENUE.start - 2 + ((span + 2) * (i + 0.5)) / perSide;
    for (const side of [-1, 1]) out.push({ p: [side * AVENUE.lanternX, 0, z], order: i, seed: i * 2 + (side > 0 ? 1 : 0) });
  }
  return out.slice(0, count);
}

export interface MistPlane {
  z: number;
  y: number;
  width: number;
  height: number;
  seed: number;
}

export function mistLayout(count: number): MistPlane[] {
  const out: MistPlane[] = [];
  const near = -15;
  const far = PALACE_Z + 8;
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1);
    out.push({ z: near + (far - near) * u, y: 0, width: 44, height: 5.2 + (i % 2) * 1.2, seed: i * 1.37 + 0.4 });
  }
  return out;
}
