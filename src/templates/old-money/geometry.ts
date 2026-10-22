import { BufferAttribute, BufferGeometry } from 'three';
import { hexToRgb } from '@/lib/invite/stage/color';
import { FLAP_DEPTH, flapHalfWidth } from './layout';

type V3 = [number, number, number];
type RGB = [number, number, number];

/** A (cols × rows) quad grid from a position function, with vertex colours and 0..1 UVs. */
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

const lin = (hex: string): RGB => hexToRgb(hex).map((v) => Math.pow(v / 255, 2.2)) as RGB;
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const FLAP_COLS = 12;
export const FLAP_ROWS = 14;

/**
 * The flap as a grid in its hinge frame: hinge along x at y = 0, tip at (0, −FLAP_DEPTH).
 * Rows run down from the hinge; each row narrows to the tip. UVs address the flap texture
 * (u across the envelope's width, v down the flap's depth).
 */
export function flapGeometry(width: number): BufferGeometry {
  const g = grid(FLAP_COLS, FLAP_ROWS, (u, v) => {
    const d = v * FLAP_DEPTH;
    const half = flapHalfWidth(d, FLAP_DEPTH, width);
    // x runs right-to-left so the triangles wind counter-clockwise: the paper faces the camera.
    return [(1 - u * 2) * half, -d, 0];
  });
  // Texture coordinates follow the paper, not the grid: x across the full envelope width.
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / width + 0.5, 1 + pos.getY(i) / FLAP_DEPTH);
  return g;
}

/**
 * One petal: long, softly pointed, cupped across its width and lifting towards its tip.
 * Its base is at the origin, it points along +y. Vertex colours: a green-cream heart fading to white.
 */
export function petalGeometry(length = 0.17, width = 0.085, cup = 0.022, heart = '#E3E7C4', tip = '#FFFFFF'): BufferGeometry {
  const h = lin(heart);
  const w = lin(tip);
  return grid(
    6,
    10,
    (u, v) => {
      const across = u * 2 - 1;
      // Narrow at the heart, broad and rounded towards the tip (jasmine, not lily).
      const half = width * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.8)), 0.55) * (0.55 + 0.45 * Math.min(1, v * 2.2)) + 0.004 * (1 - v);
      const x = across * half;
      const y = v * length;
      const z = cup * across * across * Math.sin(Math.PI * Math.min(1, v * 1.2)) + 0.05 * length * v * v;
      return [x, y, z];
    },
    (_u, v) => mixRgb(h, w, Math.min(1, v * 2.4)),
  );
}

/** A leaf: pointed oval folded along its midrib, arching down; base at the origin, pointing +x. */
export function leafGeometry(length = 1, width = 0.24, base = '#5C7448', light = '#7E9467'): BufferGeometry {
  const b = lin(base);
  const l = lin(light);
  return grid(
    6,
    12,
    (u, v) => {
      const across = u * 2 - 1;
      const half = width * 0.5 * Math.pow(Math.sin(Math.PI * v), 0.85) * (1 - 0.25 * v);
      const x = v * length;
      const y = -across * half; // counter-clockwise: the leaf's face (and normals) towards +z
      const z = -Math.abs(across) * half * 0.35 - 0.12 * length * v * v;
      return [x, y, z];
    },
    (u, v) => {
      const rib = 1 - Math.min(1, Math.abs(u * 2 - 1) * 4);
      return mixRgb(b, l, 0.25 + 0.45 * rib * (1 - v * 0.5));
    },
  );
}
