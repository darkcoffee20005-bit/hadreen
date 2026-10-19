import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector2,
  Vector3,
  Color,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARM_A, ARM_B, TRUNK_LEAN } from './layout';

/**
 * Procedural geometry for blossom-oud: the horseshoe arch (wall, voussoirs, alfiz), the curtain
 * sheet, the chandelier (frame, candles, crystal drop), the palm (trunk, frond) and the lantern.
 */

export interface ArchSpec {
  r: number;
  cy: number;
  /** How far the horseshoe returns below the circle's centre (radians). */
  horseshoe: number;
}

/** Points along the horseshoe arc, from the left springing over the crown to the right one. */
export function archArc(a: ArchSpec, segments = 48, grow = 0): [number, number][] {
  const start = Math.PI + a.horseshoe;
  const end = -a.horseshoe;
  const r = a.r + grow;
  const out: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = start + (end - start) * (i / segments);
    out.push([Math.cos(t) * r, a.cy + Math.sin(t) * r]);
  }
  return out;
}

/** A thick wall (front face at z = depth) pierced to the floor by a horseshoe arch. */
export function archWallGeometry(width: number, height: number, depth: number, a: ArchSpec, curveSegments = 40): BufferGeometry {
  const s = new Shape();
  const arc = archArc(a, curveSegments);
  const [lx] = arc[0]!;
  const [rx] = arc[arc.length - 1]!;
  s.moveTo(-width / 2, 0);
  s.lineTo(lx, 0);
  for (const [x, y] of arc) s.lineTo(x, y);
  s.lineTo(rx, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
}

/**
 * Alternating voussoirs around the arch (Córdoba-style), as a shallow relief band: front face
 * plus its outer edge, vertex-coloured.
 */
export function voussoirGeometry(a: ArchSpec, band: number, count: number, colours: [string, string], depth = 0.08): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nrm: number[] = [];
  const cA = new Color(colours[0]);
  const cB = new Color(colours[1]);
  const start = Math.PI + a.horseshoe;
  const end = -a.horseshoe;
  const sub = 3;
  for (let i = 0; i < count; i++) {
    const c = i % 2 === 0 ? cA : cB;
    for (let k = 0; k < sub; k++) {
      const t0 = start + ((end - start) * (i * sub + k)) / (count * sub);
      const t1 = start + ((end - start) * (i * sub + k + 1)) / (count * sub);
      const p = (t: number, r: number, z: number) => [Math.cos(t) * r, a.cy + Math.sin(t) * r, z];
      const i0 = p(t0, a.r, depth);
      const i1 = p(t1, a.r, depth);
      const o0 = p(t0, a.r + band, depth);
      const o1 = p(t1, a.r + band, depth);
      // A hairline joint between voussoirs: darken the first sub-strip's inner edge slightly.
      const shade = k === 0 ? 0.86 : 1;
      const quad = (q: number[][], n: number[], sh: number) => {
        for (const v of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
          pos.push(...v!);
          col.push(c.r * sh, c.g * sh, c.b * sh);
          nrm.push(...n);
        }
      };
      quad([i0, i1, o1, o0], [0, 0, 1], shade);
      const ob0 = p(t0, a.r + band, 0);
      const ob1 = p(t1, a.r + band, 0);
      const tm = (t0 + t1) / 2;
      quad([o0, o1, ob1, ob0], [Math.cos(tm), Math.sin(tm), 0], 0.8);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return g;
}

/** A flat rectangular frame (the alfiz around an arch), `w` wide strip. */
export function frameGeometry(width: number, height: number, w: number, depth = 0.06): BufferGeometry {
  const s = new Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  const hole = new Path();
  hole.moveTo(-width / 2 + w, w);
  hole.lineTo(-width / 2 + w, height - w);
  hole.lineTo(width / 2 - w, height - w);
  hole.lineTo(width / 2 - w, w);
  hole.closePath();
  s.holes.push(hole);
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

/** The curtain sheet: a unit plane in [0,1]², x = across (0 outer edge … 1 seam), y = up. */
export function curtainSheet(segX: number, segY: number): BufferGeometry {
  const g = new PlaneGeometry(1, 1, segX, segY);
  g.translate(0.5, 0.5, 0);
  return g;
}

/** A faceted crystal drop hanging from its top (y = 0 … −1.3), flat-shaded so facets glint. */
export function crystalGeometry(): BufferGeometry {
  const prof = [
    new Vector2(0.0001, 0),
    new Vector2(0.18, -0.08),
    new Vector2(0.42, -0.36),
    new Vector2(0.5, -0.56),
    new Vector2(0.34, -0.92),
    new Vector2(0.0001, -1.3),
  ];
  const g = new LatheGeometry(prof, 8).toNonIndexed();
  g.computeVertexNormals();
  return g;
}

/** Simple tube from points. */
function tube(points: [number, number, number][], radius: number, seg = 24, radial = 6): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  return new TubeGeometry(curve, seg, radius, radial, false);
}

/**
 * The chandelier's gilt frame in its local frame (centre at the origin): a turned column, two
 * tiers of scrolled arms with candle cups, a crown ring and a chain up to `chain` units above.
 */
export function chandelierFrame(chain: number, low: boolean): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const radial = low ? 10 : 18;
  const col = [
    [0.001, -0.98],
    [0.07, -0.95],
    [0.09, -0.86],
    [0.04, -0.78],
    [0.16, -0.62],
    [0.32, -0.42],
    [0.36, -0.3],
    [0.12, -0.24],
    [0.05, -0.1],
    [0.09, 0.02],
    [0.05, 0.12],
    [0.05, 0.4],
    [0.11, 0.5],
    [0.05, 0.6],
    [0.05, 0.72],
    [0.16, 0.8],
    [0.05, 0.88],
    [0.04, 1.08],
    [0.1, 1.15],
    [0.03, 1.24],
    [0.03, 1.32],
    [0.001, 1.34],
  ].map(([r, y]) => new Vector2(r!, y!));
  parts.push(new LatheGeometry(col, radial));
  const armSeg = low ? 12 : 20;
  const arms = (n: number, r: number, y: number, from: number, rot: number) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const at = (rr: number, yy: number): [number, number, number] => [c * rr, yy, s * rr];
      parts.push(tube([at(0.06, from), at(r * 0.35, from - 0.16), at(r * 0.75, from - 0.12), at(r * 0.98, y - 0.12), at(r, y - 0.04)], 0.022, armSeg, 5));
      // A little scroll under the arm.
      parts.push(tube([at(r * 0.3, from - 0.13), at(r * 0.42, from - 0.28), at(r * 0.55, from - 0.24), at(r * 0.5, from - 0.15)], 0.012, 10, 4).translate(0, 0, 0));
      const cup = new CylinderGeometry(0.075, 0.035, 0.05, 10).translate(...at(r, y));
      const bobeche = new CylinderGeometry(0.11, 0.1, 0.012, 12).translate(...at(r, y - 0.03));
      parts.push(cup, bobeche);
    }
  };
  arms(ARM_A.n, ARM_A.r, ARM_A.y, -0.3, 0);
  arms(ARM_B.n, ARM_B.r, ARM_B.y, 0.4, 0.3);
  parts.push(new TorusGeometry(0.36, 0.014, 6, 32).rotateX(Math.PI / 2).translate(0, 1.1, 0));
  parts.push(new TorusGeometry(0.8, 0.012, 6, 40).rotateX(Math.PI / 2).translate(0, -0.3, 0));
  // Chain: a rod with a few links.
  parts.push(new CylinderGeometry(0.018, 0.018, chain, 6).translate(0, 1.34 + chain / 2, 0));
  const links = low ? 4 : 9;
  for (let i = 0; i < links; i++) {
    const g = new TorusGeometry(0.05, 0.012, 5, 10);
    if (i % 2) g.rotateY(Math.PI / 2);
    parts.push(g.translate(0, 1.4 + (i + 0.5) * (chain / links), 0));
  }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)).map(stripUv), false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Candle sleeves (ivory) at every cup, and their flames (emissive). */
export function candleGeometries(): { sleeves: BufferGeometry; flames: BufferGeometry } {
  const sleeves: BufferGeometry[] = [];
  const flames: BufferGeometry[] = [];
  for (const [arm, rot] of [
    [ARM_A, 0],
    [ARM_B, 0.3],
  ] as const) {
    for (let i = 0; i < arm.n; i++) {
      const a = (i / arm.n) * Math.PI * 2 + rot;
      const x = Math.cos(a) * arm.r;
      const z = Math.sin(a) * arm.r;
      sleeves.push(new CylinderGeometry(0.03, 0.03, 0.2, 8).translate(x, arm.y + 0.1, z));
      flames.push(new SphereGeometry(0.03, 8, 6).scale(1, 1.9, 1).translate(x, arm.y + 0.25, z));
    }
  }
  const s = mergeGeometries(sleeves.map(stripUv), false)!;
  const f = mergeGeometries(flames.map(stripUv), false)!;
  sleeves.forEach((g) => g.dispose());
  flames.forEach((g) => g.dispose());
  return { sleeves: s, flames: f };
}

function stripUv(g: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  return g;
}

/**
 * A palm trunk: unit height (scaled per instance), a slight curve leaning +x by TRUNK_LEAN at
 * the top, a flared foot, ringed bark UVs (v along the height).
 */
export function trunkGeometry(radial = 8, rings = 16): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const r = 0.17 * (1 - 0.3 * t) + 0.13 * Math.pow(1 - t, 6);
    const cx = TRUNK_LEAN * t * t;
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      pos.push(cx + Math.cos(a) * r, t, Math.sin(a) * r);
      uv.push(i / radial, t);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * (radial + 1) + i;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * One palm frond along +x (unit length, scaled per instance), arching down toward the tip, its
 * leaflets folded up in a shallow V. uv.x runs base → tip, uv.y across.
 */
export function frondGeometry(seg = 10): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const y = Math.sin(u * 1.4) * 0.22 - u * u * 0.62;
    const half = 0.17 * Math.sin(Math.min(1, u * 1.15) * Math.PI) + 0.02;
    for (let k = 0; k <= 2; k++) {
      const v = k / 2;
      const across = (v - 0.5) * 2;
      pos.push(u, y + Math.abs(across) * half * 0.45, across * half);
      uv.push(u, v);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let k = 0; k < 2; k++) {
      const a = i * 3 + k;
      const b = a + 3;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A garden lantern on a post (metal) and its glass (lit), unit-ish: ~2.35 tall. */
export function lanternGeometries(low: boolean): { metal: BufferGeometry; glass: BufferGeometry } {
  const sides = 6;
  const parts: BufferGeometry[] = [];
  parts.push(new CylinderGeometry(0.05, 0.07, 1.62, low ? 6 : 8).translate(0, 0.81, 0));
  parts.push(new CylinderGeometry(0.16, 0.2, 0.12, low ? 6 : 8).translate(0, 0.06, 0));
  parts.push(new CylinderGeometry(0.17, 0.12, 0.06, sides).translate(0, 1.65, 0));
  // Ribs of the lantern cage.
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    parts.push(new CylinderGeometry(0.012, 0.012, 0.42, 4).translate(Math.cos(a) * 0.155, 1.89, Math.sin(a) * 0.155));
  }
  const cap = [
    [0.21, 2.09],
    [0.21, 2.12],
    [0.15, 2.2],
    [0.07, 2.3],
    [0.02, 2.36],
    [0.035, 2.4],
    [0.001, 2.45],
  ].map(([r, y]) => new Vector2(r!, y!));
  parts.push(new LatheGeometry(cap, sides));
  const metal = mergeGeometries(parts.map((p) => stripUv(p.index ? p.toNonIndexed() : p)), false)!;
  parts.forEach((p) => p.dispose());
  const glassProf = [
    [0.12, 1.68],
    [0.155, 1.78],
    [0.16, 1.95],
    [0.14, 2.08],
  ].map(([r, y]) => new Vector2(r!, y!));
  const glass = stripUv(new LatheGeometry(glassProf, sides).toNonIndexed());
  return { metal, glass };
}
