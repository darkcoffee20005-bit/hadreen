import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, LatheGeometry, Vector2 } from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import {
  fbm1,
  LAKE_Y,
  layerFront,
  mountainHeight,
  PROMONTORY,
  promontoryHeight,
  ridgeHeight,
  SLOPE,
  slopeY,
  type MountainLayer,
} from './world';

/** Grid helper: (cols+1)×(rows+1) vertices from f(i, j) → [x, y, z, colour]. */
function grid(cols: number, rows: number, f: (u: number, v: number) => [number, number, number, string]): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const c = new Color();
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const [x, y, z, hex] = f(i / cols, j / rows);
      pos.push(x, y, z);
      c.set(hex); // Color.set converts sRGB hex to the linear working space.
      col.push(c.r, c.g, c.b);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** One mountain layer: shore at the lake, rising to its ridge `depth` behind. */
export function mountainGeometry(l: MountainLayer, cols = 150, rows = 7): BufferGeometry {
  return grid(cols, rows, (u, v) => {
    const x = (u * 2 - 1) * l.halfWidth;
    const d = v * l.depth;
    const h = mountainHeight(l, x, d);
    const ridge = ridgeHeight(l, x);
    const k = h / Math.max(1, ridge);
    let hex = mixHex(l.shore, l.ridgeColor, Math.pow(k, 0.8));
    // Woods and meadows: soft patches of lighter and darker green/blue.
    const patch = fbm1(x * 0.021 + d * 0.06, l.seed + 9);
    hex = mixHex(hex, patch > 0.5 ? '#A9C2A0' : '#4F7458', Math.min(1, Math.abs(patch - 0.5) * 1.1) * (l.snowLine > 1 ? (l.base < 50 ? 1 : 0.45) : 0.25));
    if (k > l.snowLine && v > 0.6) hex = mixHex(hex, '#F3F6FA', Math.min(1, (k - l.snowLine) / (1 - l.snowLine) * 1.6));
    return [x, LAKE_Y + h - 0.4, layerFront(l, x) - d, hex];
  });
}

export function promontoryGeometry(): BufferGeometry {
  const p = PROMONTORY;
  return grid(48, 36, (u, v) => {
    const x = p.cx + (u * 2 - 1) * p.rx * 1.6;
    const z = p.cz - (v * 2 - 1) * p.rz * 1.6;
    const h = promontoryHeight(x, z);
    const k = Math.max(0, h) / p.height;
    const woods = fbm1(x * 0.09 + z * 0.05, 17);
    return [x, LAKE_Y + h, z, mixHex(mixHex('#6E9160', '#94AF7C', k), woods > 0.55 ? '#557A4C' : '#A8BC8A', Math.abs(woods - 0.55) * 0.9)];
  });
}

export function slopeGeometry(): BufferGeometry {
  return grid(70, 40, (u, v) => {
    const x = (u * 2 - 1) * SLOPE.x;
    const z = SLOPE.zTop + (SLOPE.zLake - 3 - SLOPE.zTop) * v;
    const y = slopeY(x, z);
    const patch = Math.sin(x * 0.21 + z * 0.13) * 0.5 + 0.5;
    // Terraced gardens: hedge rows and the odd gravel path.
    const terrace = Math.sin(z * 1.7 + Math.sin(x * 0.05) * 2);
    let hex = mixHex(mixHex('#6E9460', '#8FAE72', patch), '#5E8456', v * 0.5);
    if (terrace > 0.75) hex = mixHex(hex, '#4C7343', 0.6);
    else if (terrace < -0.93) hex = mixHex(hex, '#D8C3A0', 0.55);
    return [x, y, z, hex];
  });
}

/** Box UVs in world units (÷ `unit`), so a tiling texture keeps its scale on long boxes. */
export function worldBoxUV(g: BufferGeometry, w: number, h: number, d: number, unit: number): BufferGeometry {
  const uv = g.getAttribute('uv');
  // BoxGeometry face order: +x, −x, +y, −y, +z, −z (4 vertices each, one segment).
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [a, b] = dims[f]!;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * a) / unit, (uv.getY(i) * b) / unit);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/** A hip roof over a unit footprint (with overhang), ridge along x; base at y = 0. */
export function hipRoofGeometry(rise = 0.32, overhang = 0.08): BufferGeometry {
  const w = 0.5 + overhang;
  const d = 0.5 + overhang;
  const r = 0.22;
  const v = [
    [-w, 0, d], [w, 0, d], [w, 0, -d], [-w, 0, -d], // eaves
    [-r, rise, 0], [r, rise, 0], // ridge
  ] as const;
  const tris = [
    [0, 1, 5], [0, 5, 4], // front
    [2, 3, 4], [2, 4, 5], // back
    [1, 2, 5], // right hip
    [3, 0, 4], // left hip
    [0, 3, 2], [0, 2, 1], // soffit
  ];
  const pos: number[] = [];
  for (const t of tris) for (const i of t) pos.push(...v[i]!);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Flame-shaped cypress (unit height). */
export function cypressGeometry(segments = 7): BufferGeometry {
  const pts: Vector2[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75) * (1 - t * 0.35) + (i === 0 ? 0.08 : 0);
    pts.push(new Vector2(Math.max(0.001, r), t));
  }
  return new LatheGeometry(pts, segments);
}

/** Classic vase-shaped baluster (unit height). */
export function balusterProfile(): Vector2[] {
  const p: [number, number][] = [
    [0.001, 0], [0.4, 0], [0.4, 0.06], [0.3, 0.09], [0.3, 0.13], [0.36, 0.2], [0.46, 0.34], [0.44, 0.46], [0.3, 0.6],
    [0.18, 0.72], [0.15, 0.78], [0.24, 0.82], [0.24, 0.86], [0.17, 0.89], [0.17, 0.93], [0.4, 0.95], [0.4, 1], [0.001, 1],
  ];
  return p.map(([r, y]) => new Vector2(r * 0.5, y));
}

/** A small bud vase (unit height). */
export function vaseProfile(): Vector2[] {
  const p: [number, number][] = [
    [0.001, 0], [0.3, 0], [0.36, 0.06], [0.5, 0.3], [0.52, 0.42], [0.4, 0.62], [0.22, 0.8], [0.2, 0.92], [0.28, 1], [0.24, 1.01], [0.16, 0.92], [0.001, 0.9],
  ];
  return p.map(([r, y]) => new Vector2(r * 0.5, y));
}

/** Iron bistro-table pedestal (unit height). */
export function pedestalProfile(): Vector2[] {
  const p: [number, number][] = [
    [0.001, 0], [0.5, 0], [0.48, 0.02], [0.2, 0.06], [0.07, 0.14], [0.05, 0.3], [0.05, 0.86], [0.09, 0.9], [0.06, 0.94], [0.16, 0.98], [0.16, 1], [0.001, 1],
  ];
  return p.map(([r, y]) => new Vector2(r * 0.5, y));
}

/**
 * A layered rose head (unit ≈ bloom diameter), facing +y. `layers` rings of cupped petals:
 * a tight spiral bud in the middle, opening outward and curling back at the rim.
 * Vertex colour darkens toward the heart.
 */
export function roseGeometry(layers = 4): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const rings = [
    { n: 3, r: 0.06, h: 0.32, open: 0.1, w: 0.5, shade: 0.62 },
    { n: 5, r: 0.13, h: 0.36, open: 0.3, w: 0.42, shade: 0.75 },
    { n: 6, r: 0.22, h: 0.34, open: 0.62, w: 0.38, shade: 0.88 },
    { n: 7, r: 0.3, h: 0.3, open: 1.0, w: 0.34, shade: 1 },
  ].slice(4 - Math.min(4, Math.max(2, layers)));
  const cols = 4;
  const rows = 3;
  let base = 0;
  rings.forEach((ring, ri) => {
    for (let p = 0; p < ring.n; p++) {
      const ang = (p / ring.n) * Math.PI * 2 + ri * 0.9;
      const span = ((Math.PI * 2) / ring.n) * (1 + ring.w);
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        // Petal leans outward with height; outer petals curl back at the tip.
        const lean = ring.open * (0.25 + v * 0.9) + v * v * ring.open * 0.6;
        const rr = ring.r + Math.sin(lean) * ring.h * v;
        const y = Math.cos(lean) * ring.h * v * 0.9 - ring.open * 0.05;
        for (let i = 0; i <= cols; i++) {
          const u = i / cols - 0.5;
          const a = ang + u * span * (0.75 + v * 0.35);
          const cup = (1 - Math.cos(u * Math.PI * 2)) * 0.02 * (1 - v);
          pos.push(Math.cos(a) * (rr - cup), y, Math.sin(a) * (rr - cup));
          const k = ring.shade * (0.82 + 0.18 * v);
          col.push(k, k, k);
        }
      }
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = base + j * (cols + 1) + i;
          const b = a + 1;
          const c = a + cols + 1;
          const d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      base += (rows + 1) * (cols + 1);
    }
  });
  // A closed bud in the heart, so no bloom shows a hole.
  const seg = 7;
  const tip = pos.length / 3;
  pos.push(0, 0.2, 0);
  col.push(0.5, 0.5, 0.5);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pos.push(Math.cos(a) * 0.075, 0.02, Math.sin(a) * 0.075);
    col.push(0.58, 0.58, 0.58);
  }
  for (let i = 0; i < seg; i++) idx.push(tip, tip + 1 + ((i + 1) % seg), tip + 1 + i);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A rose leaf (unit length along +z), gently folded along its midrib. */
export function leafGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rows = 4;
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const w = Math.sin(Math.PI * Math.pow(v, 0.62)) * 0.4;
    const z = v;
    const droop = -v * v * 0.18;
    pos.push(-w, droop - w * 0.25, z, 0, droop, z, w, droop - w * 0.25, z);
  }
  for (let j = 0; j < rows; j++) {
    const a = j * 3;
    idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sail as a curved triangle: luff along the mast (x = 0, y 0→h), foot along +x. Belly bulges in z. */
export function sailGeometry(h: number, foot: number, belly: number, rows = 8): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = 6;
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const width = foot * (1 - v);
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const x = width * u;
      pos.push(x, h * v, Math.sin(Math.PI * u) * belly * (1 - v * 0.6));
      uv.push(u, v);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Hull: a lofted shape, bow at +x. Length 1, beam ~0.3, depth ~0.14 (deck at y = 0). */
export function hullGeometry(): BufferGeometry {
  const stations = 12;
  const around = 8;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let s = 0; s <= stations; s++) {
    const t = s / stations; // 0 stern … 1 bow
    const x = t - 0.5;
    const beam = 0.15 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.85)), 0.7) + 0.005;
    const depth = 0.12 * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.9)));
    const sheer = 0.02 * Math.pow(t, 3);
    for (let a = 0; a <= around; a++) {
      const th = (a / around) * Math.PI; // 0 = port deck edge … π = starboard deck edge
      const y = -Math.sin(th) * depth + sheer;
      const z = Math.cos(th) * beam;
      pos.push(x, y, z);
    }
  }
  for (let s = 0; s < stations; s++) {
    for (let a = 0; a < around; a++) {
      const i = s * (around + 1) + a;
      const j = i + around + 1;
      idx.push(i, i + 1, j, i + 1, j + 1, j);
    }
  }
  // Deck: fan over each station.
  const deckStart = pos.length / 3;
  for (let s = 0; s <= stations; s++) {
    const p = s * (around + 1);
    pos.push(pos[p * 3]!, pos[p * 3 + 1]!, pos[p * 3 + 2]!);
    const q = s * (around + 1) + around;
    pos.push(pos[q * 3]!, pos[q * 3 + 1]!, pos[q * 3 + 2]!);
  }
  for (let s = 0; s < stations; s++) {
    const a = deckStart + s * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Outline of the envelope's front pocket (the folded side and bottom flaps), centred at 0. */
export function pocketOutline(w: number, h: number): [number, number][] {
  const top = h * 0.12;
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, top],
    [w * 0.04, -h * 0.1],
    [-w * 0.04, -h * 0.1],
    [-w / 2, top],
  ];
}

/** Outline of the envelope's flap, hinged along y = 0, tip pointing down (−y). */
export function flapOutline(w: number, h: number): [number, number][] {
  const tip = -h * 0.58;
  return [
    [-w / 2, 0],
    [w / 2, 0],
    [w * 0.05, tip + h * 0.04],
    [0, tip],
    [-w * 0.05, tip + h * 0.04],
  ];
}

/** Flat polygon geometry (fan, convex enough for these outlines) with 0..1 UVs over its bounds. */
export function polygonGeometry(pts: [number, number][]): BufferGeometry {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const pos: number[] = [];
  const uv: number[] = [];
  for (const [x, y] of pts) {
    pos.push(x, y, 0);
    uv.push((x - minX) / w, (y - minY) / h);
  }
  // Ear-clipping is overkill: these outlines are fans from their centroid.
  const cx = xs.reduce((a, b) => a + b, 0) / pts.length;
  const cy = ys.reduce((a, b) => a + b, 0) / pts.length;
  pos.push(cx, cy, 0);
  uv.push((cx - minX) / w, (cy - minY) / h);
  const c = pts.length;
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++) idx.push(c, i, (i + 1) % pts.length);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
