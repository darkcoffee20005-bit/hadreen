import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  OctahedronGeometry,
  PlaneGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { COL_BASE, COL_CAPITAL, COLUMN, DOOR, ENT, FANLIGHT, LAMPS, PEDIMENT, PORCH, STEPS, WALL, WING, WINDOWS } from './facade';

/** Merge a mixed list (indexed or not) into one non-indexed geometry with position/normal/uv. */
export function merge(list: BufferGeometry[]): BufferGeometry {
  const flat = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  const out = mergeGeometries(flat)!;
  list.forEach((g) => g.dispose());
  flat.forEach((g) => g.dispose());
  return out;
}

const at = (g: BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => at(new BoxGeometry(w, h, d), x, y, z);

/** Flute depth at angle `a` for `n` flutes (0 at the arrises, 1 at the bottom of a flute). */
export function fluteDepth(a: number, n = 20): number {
  const v = 0.5 + 0.5 * Math.cos(a * n);
  return v * v;
}

/** One Corinthian column standing at the origin (y = 0 → COLUMN.height), fluted, with base and capital. */
export function columnGeometry(detail = 1): BufferGeometry {
  const { radius: r0, top: r1, height } = COLUMN;
  const parts: BufferGeometry[] = [];
  // Base: plinth and a lathe of tori and fillets.
  parts.push(box(r0 * 2.9, 0.1, r0 * 2.9, 0, 0.05, 0));
  const base: Vector2[] = [];
  const bump = (y0: number, y1: number, r: number, k: number) => {
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      base.push(new Vector2(r + Math.sin(t * Math.PI) * k, y0 + (y1 - y0) * t));
    }
  };
  bump(0.1, 0.2, r0 * 1.12, 0.05);
  bump(0.2, 0.26, r0 * 1.0, 0.0);
  bump(0.26, COL_BASE, r0 * 1.04, 0.035);
  parts.push(new LatheGeometry(base, 28 * detail));
  // Shaft, fluted.
  const shaftH = height - COL_BASE - COL_CAPITAL;
  const shaft = new CylinderGeometry(r1, r0, shaftH, Math.round(80 * detail), 1, true);
  const pos = shaft.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.07 * fluteDepth(a);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  shaft.computeVertexNormals();
  parts.push(at(shaft, 0, COL_BASE + shaftH / 2, 0));
  // Capital: astragal, bell, two rows of acanthus, volutes, abacus.
  const c0 = height - COL_CAPITAL;
  parts.push(at(new TorusGeometry(r1 * 1.02, 0.025, 6, 28).rotateX(Math.PI / 2), 0, c0 + 0.02, 0));
  const bell: Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    bell.push(new Vector2(r1 * (1 + 0.55 * t * t), c0 + 0.03 + t * (COL_CAPITAL - 0.15)));
  }
  parts.push(new LatheGeometry(bell, 24));
  for (const [row, count, h, rr, tilt] of [
    [0, 8, 0.22, 1.08, 0.35],
    [1, 8, 0.3, 1.25, 0.5],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const a = ((i + row * 0.5) / count) * Math.PI * 2;
      const leaf = new PlaneGeometry(0.15, h, 1, 4);
      const lp = leaf.attributes.position!;
      for (let j = 0; j < lp.count; j++) {
        const y = lp.getY(j) / h + 0.5; // 0 bottom … 1 tip
        const x = lp.getX(j);
        lp.setX(j, x * (1 - 0.6 * y * y));
        lp.setZ(j, y * y * 0.09);
      }
      leaf.computeVertexNormals();
      leaf.rotateX(-tilt * 0.3);
      leaf.translate(0, h / 2, r1 * rr);
      leaf.rotateY(a);
      leaf.translate(0, c0 + 0.04 + row * 0.12, 0);
      parts.push(leaf);
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const v = new TorusGeometry(0.055, 0.02, 6, 12);
    v.rotateY(a + Math.PI / 2);
    v.translate(Math.cos(a) * r1 * 1.55, height - 0.2, Math.sin(a) * r1 * 1.55);
    parts.push(v);
  }
  parts.push(box(r1 * 3.7, 0.12, r1 * 3.7, 0, height - 0.06, 0));
  return merge(parts);
}

/** A flat shape (x, y) extruded from z0 to z1. */
function extrude(shape: Shape, z0: number, z1: number): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, z0);
  return g;
}

function rectHole(shape: Shape, x0: number, y0: number, x1: number, y1: number) {
  const h = new Shape();
  h.moveTo(x0, y0);
  h.lineTo(x0, y1);
  h.lineTo(x1, y1);
  h.lineTo(x1, y0);
  h.closePath();
  shape.holes.push(h);
}

/**
 * Everything in off-white stone except the columns: ground podium, steps, porch, the wall with its
 * doorway (an arched opening for door and fanlight) and windows, door and window surrounds,
 * entablature with dentils, the pediment and its recessed tympanum, and the lower wings.
 */
export function stoneGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const P = PORCH;
  // Porch podium and steps.
  parts.push(box(9.9, P, 2.6, 0, P / 2, -0.3));
  for (let i = 0; i < STEPS.count; i++) {
    const y = (i + 1) * STEPS.rise;
    const zFront = STEPS.front - i * STEPS.tread;
    const w = (STEPS.halfWidth + (STEPS.count - 1 - i) * 0.04) * 2;
    parts.push(box(w, y, zFront - 1.0, 0, y / 2, (zFront + 1.0) / 2));
  }
  // Main wall with the doorway (door + fanlight arch) and the two window openings.
  const W = WALL.halfWidth;
  const D = DOOR.halfWidth;
  const wall = new Shape();
  wall.moveTo(-W, P);
  wall.lineTo(-D, P);
  wall.lineTo(-D, FANLIGHT.cy);
  wall.lineTo(-FANLIGHT.r, FANLIGHT.cy);
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    wall.lineTo(Math.cos(a) * FANLIGHT.r, FANLIGHT.cy + Math.sin(a) * FANLIGHT.r);
  }
  wall.lineTo(D, FANLIGHT.cy);
  wall.lineTo(D, P);
  wall.lineTo(W, P);
  wall.lineTo(W, WALL.top);
  wall.lineTo(-W, WALL.top);
  wall.closePath();
  for (const x of WINDOWS.xs) rectHole(wall, x - WINDOWS.halfWidth, WINDOWS.bottom, x + WINDOWS.halfWidth, WINDOWS.top);
  parts.push(extrude(wall, WALL.z - WALL.depth, WALL.z));
  // Door surround, lintel and the cartouche ledge.
  parts.push(box(0.16, DOOR.top - P + 0.04, 0.12, -D - 0.08, (P + DOOR.top) / 2, WALL.z + 0.06));
  parts.push(box(0.16, DOOR.top - P + 0.04, 0.12, D + 0.08, (P + DOOR.top) / 2, WALL.z + 0.06));
  parts.push(box((D + 0.3) * 2, DOOR.lintel, 0.18, 0, DOOR.top + DOOR.lintel / 2, WALL.z + 0.09));
  // Window surrounds: sill, jambs and a small triangular hood.
  for (const x of WINDOWS.xs) {
    const h = WINDOWS.halfWidth;
    parts.push(box(h * 2 + 0.2, 0.12, 0.2, x, WINDOWS.bottom - 0.06, WALL.z + 0.1));
    parts.push(box(0.08, WINDOWS.top - WINDOWS.bottom, 0.08, x - h - 0.04, (WINDOWS.top + WINDOWS.bottom) / 2, WALL.z + 0.04));
    parts.push(box(0.08, WINDOWS.top - WINDOWS.bottom, 0.08, x + h + 0.04, (WINDOWS.top + WINDOWS.bottom) / 2, WALL.z + 0.04));
    const hood = new Shape();
    hood.moveTo(x - h - 0.16, WINDOWS.top + 0.1);
    hood.lineTo(x, WINDOWS.top + 0.42);
    hood.lineTo(x + h + 0.16, WINDOWS.top + 0.1);
    hood.closePath();
    parts.push(extrude(hood, WALL.z, WALL.z + 0.14));
    parts.push(box(h * 2 + 0.34, 0.06, 0.16, x, WINDOWS.top + 0.07, WALL.z + 0.08));
  }
  // Entablature: architrave, frieze, dentils, cornice (front and returns).
  const E = ENT;
  const zf = COLUMN.z + 0.4; // the entablature's front face
  const depth = zf - (WALL.z - WALL.depth);
  const zc = (zf + WALL.z - WALL.depth) / 2;
  parts.push(box(E.halfWidth * 2, E.architrave, depth, 0, E.bottom + E.architrave / 2, zc));
  parts.push(box(E.halfWidth * 2 - 0.02, E.frieze, depth - 0.04, 0, E.bottom + E.architrave + E.frieze / 2, zc - 0.02));
  const y2 = E.bottom + E.architrave + E.frieze;
  for (let x = -E.halfWidth + 0.165; x < E.halfWidth - 0.05; x += 0.2) parts.push(box(0.09, 0.09, 0.09, x, y2 - 0.045, zf + 0.0));
  parts.push(box(E.corniceHalfWidth * 2, E.cornice, depth + 0.24, 0, y2 + E.cornice / 2, zc + 0.08));
  // Pediment: the recessed tympanum and the raking cornice frame in front of it.
  const Pd = PEDIMENT;
  const tri = new Shape();
  tri.moveTo(-Pd.halfWidth + 0.1, Pd.base);
  tri.lineTo(0, Pd.apex - 0.05);
  tri.lineTo(Pd.halfWidth - 0.1, Pd.base);
  tri.closePath();
  parts.push(extrude(tri, WALL.z - WALL.depth, zf - 0.05));
  const frame = new Shape();
  frame.moveTo(-Pd.halfWidth, Pd.base);
  frame.lineTo(0, Pd.apex);
  frame.lineTo(Pd.halfWidth, Pd.base);
  frame.closePath();
  const slope = (Pd.apex - Pd.base) / Pd.halfWidth;
  const ih = Pd.halfWidth - Pd.inset / Math.sin(Math.atan(slope)) - 0.1;
  const inner = new Shape();
  inner.moveTo(-ih, Pd.base + 0.12);
  inner.lineTo(ih, Pd.base + 0.12);
  inner.lineTo(0, Pd.base + 0.12 + ih * slope);
  inner.closePath();
  frame.holes.push(inner);
  parts.push(extrude(frame, zf - 0.05, zf + 0.2));
  // Acroteria.
  parts.push(at(new CylinderGeometry(0, 0.16, 0.3, 4), 0, Pd.apex + 0.12, zf + 0.05));
  for (const s of [-1, 1]) parts.push(at(new CylinderGeometry(0, 0.13, 0.26, 4), s * (Pd.halfWidth - 0.1), Pd.base + 0.12, zf + 0.05));
  // Wings: lower walls either side, with windows and a cornice.
  for (const s of [-1, 1]) {
    const wing = new Shape();
    const x0 = WING.from - 0.02;
    const x1 = WING.to;
    wing.moveTo(x0, 0);
    wing.lineTo(x1, 0);
    wing.lineTo(x1, WING.top);
    wing.lineTo(x0, WING.top);
    wing.closePath();
    for (const wx of WING.windowXs) rectHole(wing, wx - WING.windowHalfWidth, WING.windowBottom, wx + WING.windowHalfWidth, WING.windowTop);
    const g = extrude(wing, WALL.z - WALL.depth - 0.4, WALL.z - 0.3);
    if (s < 0) g.scale(-1, 1, 1);
    parts.push(g);
    parts.push(box(x1 - x0 + 0.1, 0.22, 0.85, s * (x0 + x1) / 2, WING.top + 0.11, WALL.z - 0.55));
    for (const wx of WING.windowXs) parts.push(box(WING.windowHalfWidth * 2 + 0.2, 0.1, 0.24, s * wx, WING.windowBottom - 0.05, WALL.z - 0.2));
  }
  // The returns: side walls closing the porch behind the outer columns.
  parts.push(box(0.4, WALL.top - P, Math.abs(WALL.z - WALL.depth) + 0.4, -W - 0.2, (P + WALL.top) / 2, (WALL.z - WALL.depth) / 2 + 0.2));
  parts.push(box(0.4, WALL.top - P, Math.abs(WALL.z - WALL.depth) + 0.4, W + 0.2, (P + WALL.top) / 2, (WALL.z - WALL.depth) / 2 + 0.2));
  return merge(parts);
}

/** The ironwork-and-glass fanlight plane (semicircle), facing +z. */
export function fanlightGeometry(): BufferGeometry {
  const s = new Shape();
  s.moveTo(-FANLIGHT.r, 0);
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI - (i / 32) * Math.PI;
    s.lineTo(Math.cos(a) * FANLIGHT.r, Math.sin(a) * FANLIGHT.r);
  }
  s.closePath();
  const g = extrude(s, 0, 0.001);
  // UVs: map the bounding box (x ∈ [-r, r], y ∈ [0, r]) to the texture.
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * FANLIGHT.r) + 0.5, pos.getY(i) / FANLIGHT.r);
  return g;
}

/** A lamp post: plinth, fluted post, a collar and a globe seat. Origin at its foot. */
export function lampPostGeometry(): BufferGeometry {
  const h = LAMPS.height;
  const profile = [
    [0.16, 0],
    [0.16, 0.3],
    [0.1, 0.36],
    [0.065, 0.5],
    [0.05, h - 0.6],
    [0.08, h - 0.5],
    [0.05, h - 0.42],
    [0.11, h - 0.3],
    [0.02, h - 0.24],
  ].map(([r, y]) => new Vector2(r!, y!));
  return new LatheGeometry(profile, 16);
}

/** A white drape hanging from y = 0 down to -h: folds across its width, gathered a little at the top. */
export function drapeGeometry(w: number, h: number, folds = 7): BufferGeometry {
  const g = new PlaneGeometry(w, h, folds * 6, 4);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) / h + 0.5; // 1 top … 0 bottom
    const fold = Math.sin((x / w + 0.5) * folds * Math.PI * 2);
    pos.setZ(i, fold * (0.05 + 0.04 * (1 - y)));
    pos.setX(i, x * (0.9 + 0.1 * (1 - y)));
  }
  g.translate(0, -h / 2, 0);
  g.computeVertexNormals();
  return g;
}

/** Positions of a chandelier's crystals around its centre (strands from two rings and a pendant cluster). */
export function crystalLayout(scale: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const rand = mulberry32(31);
  const rings: [number, number, number, number][] = [
    // radius, y, strands, drops
    [0.66, 0.05, 30, 4],
    [0.42, -0.25, 20, 5],
    [0.2, -0.55, 12, 4],
  ];
  for (const [r, y, strands, drops] of rings) {
    const n = Math.max(6, Math.round(strands * scale));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      for (let d = 0; d < drops; d++) {
        const sag = d * 0.085;
        out.push([Math.cos(a) * (r - d * 0.012), y - sag - rand() * 0.01, Math.sin(a) * (r - d * 0.012)]);
      }
    }
  }
  // Swags between the upper ring's strands.
  const swags = Math.max(6, Math.round(24 * scale));
  for (let i = 0; i < swags; i++) {
    const a0 = (i / swags) * Math.PI * 2;
    for (let k = 1; k < 4; k++) {
      const a = a0 + (k / 4) * ((Math.PI * 2) / swags);
      out.push([Math.cos(a) * 0.72, 0.18 - Math.sin((k / 4) * Math.PI) * 0.16, Math.sin(a) * 0.72]);
    }
  }
  out.push([0, -0.82, 0]);
  return out;
}

/** The chandelier's frame (chain to the ceiling, stem, two rings, arms and candle cups), origin at its centre. */
export function chandelierFrameGeometry(drop: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(at(new CylinderGeometry(0.012, 0.012, drop, 5, 1, true), 0, drop / 2 + 0.35, 0));
  const stem = [
    [0.0, -0.75],
    [0.06, -0.7],
    [0.04, -0.4],
    [0.09, -0.15],
    [0.05, 0.1],
    [0.07, 0.3],
    [0.02, 0.36],
  ].map(([r, y]) => new Vector2(r!, y!));
  parts.push(new LatheGeometry(stem, 12));
  parts.push(at(new TorusGeometry(0.66, 0.016, 5, 40).rotateX(Math.PI / 2), 0, 0.05, 0));
  parts.push(at(new TorusGeometry(0.42, 0.014, 5, 32).rotateX(Math.PI / 2), 0, -0.25, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const arm = new CylinderGeometry(0.01, 0.01, 0.66, 4).rotateZ(Math.PI / 2).translate(0.33, 0, 0).rotateY(-a);
    parts.push(at(arm, 0, 0.05, 0));
    parts.push(at(new CylinderGeometry(0.035, 0.025, 0.06, 8), Math.cos(a) * 0.66, 0.1, Math.sin(a) * 0.66));
  }
  return merge(parts);
}

/** Candle-bulb positions on a chandelier (relative to its centre). */
export function bulbLayout(): [number, number, number][] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [Math.cos(a) * 0.66, 0.2, Math.sin(a) * 0.66] as [number, number, number];
  });
}

/** One crystal drop: a stretched octahedron. */
export function crystalGeometry(): BufferGeometry {
  return new OctahedronGeometry(0.03, 0).applyMatrix4(new Matrix4().makeScale(1, 1.9, 1));
}
