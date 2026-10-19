import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { altitudeAt, dirAt, headingAt, positionAt, R, type Route } from './route';

/**
 * Geometry builders for destination-love. The airliner is modelled at length 1 (nose +Z, up +Y)
 * and scaled in the scene; it comes out as two merged meshes (ivory paint, gold trim).
 */
function wing(points: [number, number][], thickness: number, y: number): BufferGeometry {
  // Drawn in plan view (x, z); extruded upward by `thickness`.
  const shape = new Shape(points.map(([x, z]) => new Vector2(x, -z)));
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: thickness * 0.35, bevelSize: thickness * 0.4, bevelSegments: 1, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y - thickness / 2, 0);
  return g;
}

function fin(points: [number, number][], thickness: number): BufferGeometry {
  // Drawn in side view (z, y); extruded sideways.
  const shape = new Shape(points.map(([z, y]) => new Vector2(-z, y)));
  const g = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: thickness * 0.3, bevelSize: thickness * 0.3, bevelSegments: 1, curveSegments: 1 });
  g.rotateY(Math.PI / 2);
  g.translate(-thickness / 2, 0, 0);
  return g;
}

export function planeGeometry(): { body: BufferGeometry; trim: BufferGeometry } {
  const profile = [
    [0.0, -0.5],
    [0.018, -0.485],
    [0.034, -0.43],
    [0.05, -0.32],
    [0.06, -0.18],
    [0.062, 0.18],
    [0.059, 0.3],
    [0.05, 0.39],
    [0.034, 0.455],
    [0.016, 0.49],
    [0.0, 0.5],
  ].map(([r, y]) => new Vector2(r!, y!));
  const fuselage = new LatheGeometry(profile, 20);
  fuselage.rotateX(Math.PI / 2); // lathe axis Y → Z (nose +Z)
  fuselage.scale(1, 0.94, 1);
  const right = wing(
    [
      [0.04, 0.13],
      [0.5, -0.11],
      [0.5, -0.19],
      [0.04, -0.09],
    ],
    0.014,
    -0.026,
  );
  const left = wing(
    [
      [-0.04, 0.13],
      [-0.04, -0.09],
      [-0.5, -0.19],
      [-0.5, -0.11],
    ],
    0.014,
    -0.026,
  );
  const tailR = wing(
    [
      [0.02, -0.33],
      [0.19, -0.43],
      [0.19, -0.49],
      [0.02, -0.45],
    ],
    0.01,
    0.012,
  );
  const tailL = wing(
    [
      [-0.02, -0.33],
      [-0.02, -0.45],
      [-0.19, -0.49],
      [-0.19, -0.43],
    ],
    0.01,
    0.012,
  );
  const vfin = fin(
    [
      [-0.26, 0.04],
      [-0.47, 0.04],
      [-0.5, 0.215],
      [-0.43, 0.215],
    ],
    0.012,
  );
  const nacelle = (x: number) => {
    const g = new CylinderGeometry(0.03, 0.025, 0.14, 14, 1, false);
    g.rotateX(Math.PI / 2);
    g.translate(x, -0.058, 0.07);
    return g.toNonIndexed();
  };
  const winglet = (x: number) =>
    fin(
      [
        [-0.11, 0],
        [-0.19, 0],
        [-0.2, 0.07],
        [-0.165, 0.07],
      ],
      0.008,
    ).translate(x, -0.02, 0);
  const body = mergeGeometries([fuselage.toNonIndexed(), vfin])!;
  const trim = mergeGeometries([right, left, tailR, tailL, nacelle(0.19), nacelle(-0.19), winglet(0.497), winglet(-0.497)])!;
  [fuselage, right, left, tailR, tailL, vfin].forEach((g) => g.dispose());
  return { body, trim };
}

/** A plane (w×h) whose u runs over [u0, u1] of a texture. */
export function partGeometry(w: number, h: number, u0: number, u1: number): PlaneGeometry {
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv') as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
  uv.needsUpdate = true;
  return g;
}

/** The gold trail ribbon: two vertices per sample, expanded to face the camera in the shader. */
export function trailGeometry(route: Route, samples = 220): BufferGeometry {
  const pos = new Float32Array(samples * 2 * 3);
  const tan = new Float32Array(samples * 2 * 3);
  const side = new Float32Array(samples * 2);
  const s = new Float32Array(samples * 2);
  const p = new Vector3();
  const q = new Vector3();
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    positionAt(route, u, p, 0.012);
    positionAt(route, Math.min(1, u + 1e-3), q, 0.012).sub(positionAt(route, Math.max(0, u - 1e-3), new Vector3(), 0.012)).normalize();
    for (let k = 0; k < 2; k++) {
      const j = i * 2 + k;
      pos.set([p.x, p.y, p.z], j * 3);
      tan.set([q.x, q.y, q.z], j * 3);
      side[j] = k === 0 ? -1 : 1;
      s[j] = u;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < samples - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aTangent', new BufferAttribute(tan, 3));
  g.setAttribute('aSide', new BufferAttribute(side, 1));
  g.setAttribute('aS', new BufferAttribute(s, 1));
  g.setIndex(index);
  return g;
}

/** Land dots as instanced quads on the unit sphere (positions from land-dots). */
export function dotsGeometry(unitPositions: Float32Array): InstancedBufferGeometry {
  const base = new PlaneGeometry(1, 1);
  const g = new InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.getAttribute('position'));
  const n = unitPositions.length / 3;
  const seeds = new Float32Array(n);
  const rand = mulberry32(5);
  for (let i = 0; i < n; i++) seeds[i] = rand();
  g.setAttribute('aPos', new InstancedBufferAttribute(unitPositions, 3));
  g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  g.instanceCount = n;
  return g;
}

/** Cloud wisps scattered along the route corridor, around cruise height (globe-local). */
export function cloudGeometry(route: Route, count: number, seed = 21): InstancedBufferGeometry {
  const base = new PlaneGeometry(1, 1);
  const g = new InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.getAttribute('position'));
  const rand = mulberry32(seed);
  const offs = new Float32Array(count * 3);
  const data = new Float32Array(count * 3);
  const dir = new Vector3();
  const head = new Vector3();
  const lat = new Vector3();
  for (let i = 0; i < count; i++) {
    const s = 0.1 + ((i + rand() * 0.8) / count) * 0.78;
    dirAt(route, s, dir);
    headingAt(route, s, head);
    lat.crossVectors(head, dir);
    const side = (rand() < 0.5 ? -1 : 1) * (0.07 + rand() * 0.26);
    const alt = Math.max(0.05, altitudeAt(route, s) * (0.35 + rand() * 0.8)) + 0.04;
    const p = dir.clone().multiplyScalar(R + alt).addScaledVector(lat, side).addScaledVector(head, (rand() - 0.5) * 0.1);
    offs.set([p.x, p.y, p.z], i * 3);
    data.set([0.08 + rand() * 0.12, (rand() - 0.5) * 0.5, 0.22 + rand() * 0.3], i * 3);
  }
  g.setAttribute('aOffset', new InstancedBufferAttribute(offs, 3));
  g.setAttribute('aData', new InstancedBufferAttribute(data, 3));
  g.instanceCount = count;
  return g;
}

/** Stars on a far sphere, a little denser toward the horizon band. */
export function starGeometry(count: number, radius = 42, seed = 9): BufferGeometry {
  const rand = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = (rand() * 2 - 1) * 0.92;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius], i * 3);
    const big = rand();
    size[i] = big > 0.96 ? 3.2 : big > 0.8 ? 2.2 : 1.3;
    seeds[i] = rand();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return g;
}

export function globeGeometry(tier: 'low' | 'medium' | 'high'): SphereGeometry {
  const [w, h] = tier === 'high' ? [112, 72] : tier === 'medium' ? [80, 52] : [56, 36];
  return new SphereGeometry(R, w, h);
}

/** Lattice spacing (unit sphere) for a land-dot tier, so dots can be sized to their neighbours. */
export function latticeSpacing(n: number): number {
  return Math.sqrt((4 * Math.PI) / n);
}
