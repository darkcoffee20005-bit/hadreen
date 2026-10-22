import type { Shot, TrackKey, Vec3 } from '@/lib/invite/stage/rig';
import { easeInOutCubic } from './timeline';

/**
 * Where everything sits. World units; the envelope's centre is the origin, its back (the side
 * with the flap) faces the camera. Pure functions, unit-tested.
 */
export const ENVELOPE = { width: 2.6, height: 1.8, depth: 0.045 } as const;
/** The flap: hinged along the top edge, its tip a little below the middle (as on the design). */
export const FLAP_DEPTH = 1.05;
/** The card inside: landscape while it's in the envelope. */
export const CARD = { width: 2.36, height: 1.56, restY: -0.06, slide: 1.62 } as const;
/** How far the card stops in front of the camera once it covers the screen. */
export const COVER_DISTANCE = 2;
/** The painted olive wall behind the envelope (close enough that the envelope's shadow reads). */
export const WALL_Z = -0.95;
export const DATE_Y = -1.36;

export const PEARL_RADIUS = 0.034;
export const PEARLS_PER_EDGE = 22;

// ───────────────────────────── the flap ─────────────────────────────

/**
 * A point of the flap in its hinge frame. Rest: (x, -d) with d the distance down from the hinge.
 * Opening turns the hinge by `open` (0..1 → 0..≈190°) while the paper lags a little behind
 * (curvature k), so the flap peels up and leans back rather than swinging like a board.
 * Returns the point and the paper's normal there (towards the camera when closed).
 */
export function curlPoint(x: number, d: number, open: number, depth = FLAP_DEPTH): { p: Vec3; n: Vec3 } {
  const A = open * Math.PI * 1.06;
  const k = (-1.5 * Math.sin(Math.PI * Math.min(1, open * 1.08))) / depth;
  let y: number;
  let z: number;
  if (Math.abs(k) < 1e-5) {
    y = -d * Math.cos(A);
    z = d * Math.sin(A);
  } else {
    y = -(Math.sin(A + k * d) - Math.sin(A)) / k;
    z = (Math.cos(A) - Math.cos(A + k * d)) / k;
  }
  const th = A + k * d;
  return { p: [x, y, z], n: [0, Math.sin(th), Math.cos(th)] };
}

/** The flap's outline at rest: hinge corners and the tip, in its hinge frame. */
export function flapHalfWidth(d: number, depth = FLAP_DEPTH, width: number = ENVELOPE.width): number {
  return (width / 2) * (1 - d / depth);
}

/**
 * Pearls strung along the flap's two edges, from each top corner to the tip. `s` runs 0 at the
 * corner … 1 at the tip; `side` is −1 (left) or 1 (right). Inset a hair so they sit on the paper.
 */
export function pearlRest(perEdge = PEARLS_PER_EDGE): { x: number; d: number; s: number; side: -1 | 1 }[] {
  const out: { x: number; d: number; s: number; side: -1 | 1 }[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < perEdge; i++) {
      const s = (i + 0.5) / perEdge;
      const d = s * FLAP_DEPTH * 0.985;
      const x = side * (flapHalfWidth(d) - 0.012 * (1 - s));
      out.push({ x, d, s, side });
    }
  }
  return out;
}

// ───────────────────────────── the camera ─────────────────────────────

export const GATE_SHOT: Shot = { position: [0, 0.12, 7.2], target: [0, 0.02, 0], fov: 35, fit: [3.2, 4.4] };
/** Following the card up out of the pocket. */
export const LIFT_SHOT: Shot = { position: [0, 0.75, 7.0], target: [0, 0.7, 0], fov: 35, fit: [3.0, 4.6] };

export const TRACK: TrackKey[] = [
  { at: 0, shot: GATE_SHOT },
  { at: 1.1, shot: GATE_SHOT },
  { at: 2.8, shot: LIFT_SHOT, ease: easeInOutCubic },
];

/** After the opening the card fills the screen; the camera barely breathes. */
export function ambientShot(scroll: number, seconds: number): Shot {
  const drift = Math.sin(seconds * 0.4) * 0.02;
  return { ...LIFT_SHOT, position: [drift, LIFT_SHOT.position[1] - scroll * 0.05, LIFT_SHOT.position[2]] };
}

// ───────────────────────────── the card's flight ─────────────────────────────

/** World-space size that exactly covers a camera's view at `distance` (with a little bleed). */
export function coverSize(fovDeg: number, aspect: number, distance = COVER_DISTANCE, bleed = 1.04): [number, number] {
  const h = 2 * distance * Math.tan((fovDeg * Math.PI) / 360) * bleed;
  return [h * aspect, h];
}

/**
 * The card's size along its own axes while it flies: from its paper size to the screen. On a
 * portrait screen it turns upright (a quarter turn), so its long side ends along the screen's height.
 */
export function cardScale(fly: number, cover: [number, number], upright: boolean): [number, number] {
  const [cw, ch] = upright ? [cover[1], cover[0]] : cover;
  return [CARD.width + (cw - CARD.width) * fly, CARD.height + (ch - CARD.height) * fly];
}

/** The card's position inside the envelope frame while it slides out. */
export function cardSlideY(slide: number): number {
  return CARD.restY + CARD.slide * slide;
}

// ───────────────────────────── the flowers ─────────────────────────────

export interface Bloom {
  x: number;
  y: number;
  z: number;
  /** Turn of the whole flower around its stem (radians). */
  spin: number;
  size: number;
  /** Tilt of the flower's face away from the viewer (radians). */
  tilt: number;
  bud?: boolean;
}

export interface Leaf {
  x: number;
  y: number;
  z: number;
  /** Direction the leaf points, radians (0 = +x). */
  angle: number;
  length: number;
  /** How far the leaf's face turns from the viewer. */
  roll: number;
}

/** The little white bouquet tucked at the envelope's lower-left corner (cluster frame). */
export const CORNER_BLOOMS: Bloom[] = [
  { x: 0, y: 0, z: 0.06, spin: 0.2, size: 1, tilt: 0.25 },
  { x: 0.27, y: -0.15, z: 0.03, spin: 1.1, size: 0.8, tilt: 0.4 },
  { x: -0.2, y: 0.22, z: 0.02, spin: 2.3, size: 0.75, tilt: 0.9, bud: true },
];

export const CORNER_LEAVES: Leaf[] = [
  { x: -0.06, y: 0.04, z: 0.0, angle: Math.PI * 0.82, length: 0.36, roll: 0.35 },
  { x: -0.04, y: -0.04, z: -0.005, angle: Math.PI * 1.12, length: 0.33, roll: -0.3 },
  { x: 0.05, y: -0.08, z: -0.01, angle: Math.PI * 1.42, length: 0.3, roll: 0.25 },
  { x: 0.3, y: -0.2, z: -0.01, angle: Math.PI * 1.72, length: 0.26, roll: -0.35 },
  { x: -0.16, y: 0.18, z: -0.01, angle: Math.PI * 0.62, length: 0.24, roll: 0.3 },
  { x: 0.12, y: 0.1, z: -0.012, angle: Math.PI * 0.35, length: 0.22, roll: -0.25 },
];

/** Where the cluster sits on the envelope. */
export const CORNER_AT: Vec3 = [-0.98, -0.5, ENVELOPE.depth / 2 + 0.03];

/** A pearl string hanging between two points, sagging like a chain (parabola approximation). */
export function hangingString(a: [number, number], b: [number, number], sag: number, count: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u)]);
  }
  return out;
}
