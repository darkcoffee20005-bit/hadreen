'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Mesh,
} from 'three';
import { useInviteStore } from '@/lib/invite/machine';
import type { Tier } from '@/lib/invite/quality/tiers';
import { mixHex, shadeHex } from '@/lib/invite/stage/color';
import { grassMap, leafNormal, stoneNormal } from '../art';
import { buildArch, buildCypress, buildDeck, buildHedge, buildLawn, buildLeaf, buildPalm, buildRose, buildSwan, buildVines, type Detail } from '../geometry';
import { HEDGE, hedgeRoseLayout, leafLayout, roseLayout, rng, swanPlacement, type LeafSpot, type RoseSpot } from '../layout';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface GardenColors {
  stone: string;
  rose: string;
  leaf: string;
  pond: string;
  seal: string;
  sun: string;
}

/**
 * Discards whatever is on the wrong side of the water line (y = 0): the real world keeps what's
 * above it, the mirrored world (the pond's reflection on medium/low) keeps what's below it.
 */
export function clipAtWater<T extends Material>(m: T, keep: 'above' | 'below'): T {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSgY;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 sgW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          sgW = instanceMatrix * sgW;
        #endif
        vSgY = (modelMatrix * sgW).y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSgY;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nif (vSgY ${keep === 'above' ? '<' : '>'} 0.0) discard;`);
  };
  m.customProgramCacheKey = () => `sg-clip-${keep}`;
  return m;
}

export function detailFor(tier: Tier): Detail {
  return tier === 'low' ? 'low' : tier === 'medium' ? 'medium' : 'high';
}

/** Cypress rows lining the pool, and a stand of taller ones behind the hedge. */
function cypressSpots(): { x: number; z: number; h: number }[] {
  const rand = rng(7);
  const out: { x: number; z: number; h: number }[] = [];
  for (const side of [-1, 1]) for (let z = -7.6; z <= 6.5; z += 2.35) out.push({ x: side * (5.2 + rand() * 0.25), z, h: 5.6 + rand() * 1.8 });
  for (let x = -10.5; x <= 10.5; x += 2.1) if (Math.abs(x) > 1.2) out.push({ x: x + (rand() - 0.5) * 0.6, z: -11.2 - rand() * 1.5, h: 7.2 + rand() * 2.6 });
  // A pair flanking the far end of the pool, just outside the arch's view through it.
  for (const side of [-1, 1]) out.push({ x: side * 2.55, z: -7.4, h: 5.4 + rand() * 0.4 }, { x: side * 3.9, z: -7.9, h: 4.6 + rand() * 0.5 });
  return out;
}

/** Everything static in the garden, built once per tier (geometry, materials, layouts). */
export function useGardenAssets(colors: GardenColors, tier: Tier) {
  const detail = detailFor(tier);
  const assets = useMemo(() => {
    const roseCount = detail === 'low' ? 70 : detail === 'medium' ? 120 : 160;
    const roses = roseLayout(roseCount);
    const leaves = leafLayout(roses, detail === 'low' ? 60 : 160);
    const hedgeRoses = hedgeRoseLayout(detail === 'low' ? 70 : detail === 'medium' ? 150 : 220);
    const cypress = cypressSpots();
    const palmParts = [
      buildPalm(9.5, 3, '#6E5B45', shadeHex(colors.leaf, 0.8), detail).translate(-8.2, 0, -13),
      buildPalm(10.5, 5, '#6E5B45', shadeHex(colors.leaf, 0.8), detail).translate(9.2, 0, -14),
      buildPalm(8.2, 9, '#6E5B45', shadeHex(colors.leaf, 0.8), detail).translate(-12.5, 0, -7.5),
    ];
    const palms = mergeGeometries(palmParts, false)!;
    palmParts.forEach((g) => g.dispose());
    const geometry = {
      arch: buildArch(colors.stone, colors.pond, detail),
      deck: buildDeck(colors.stone),
      lawn: buildLawn(),
      rose: buildRose(detail),
      roseSmall: buildRose('low'),
      leaf: buildLeaf(),
      vines: buildVines(shadeHex(colors.leaf, 0.85), detail),
      cypress: buildCypress(mixHex(shadeHex(colors.leaf, 0.75), colors.pond, 0.3), detail),
      hedge: buildHedge(30, 5, HEDGE.depth, mixHex(shadeHex(colors.leaf, 0.78), colors.pond, 0.3), detail),
      palms,
      swan: buildSwan(detail),
    };
    const normal = typeof document === 'undefined' ? null : stoneNormal();
    const grass = typeof document === 'undefined' ? null : grassMap(colors.leaf);
    if (grass) grass.repeat.set(0.35, 0.35);
    const leafy = typeof document === 'undefined' ? null : leafNormal();
    const leafyTall = leafy?.clone() ?? null;
    leafy?.repeat.set(26, 4);
    leafyTall?.repeat.set(4, 9);
    const rich = detail !== 'low';
    const stone = (keep: 'above' | 'below') => clipAtWater(new MeshStandardMaterial({ vertexColors: true, normalMap: normal, normalScale: new Vector2(0.55, 0.55), roughness: 0.92 }), keep);
    const swan = (keep: 'above' | 'below') =>
      clipAtWater(
        rich
          ? new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.6, sheenColor: '#fff1e2', sheenRoughness: 0.45, side: DoubleSide })
          : new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: DoubleSide }),
        keep,
      );
    const materials = {
      stone: stone('above'),
      stoneMirror: stone('below'),
      swan: swan('above'),
      swanMirror: swan('below'),
      rose: rich
        ? new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.7, sheenColor: mixHex(colors.rose, '#ffffff', 0.5), sheenRoughness: 0.5, side: DoubleSide })
        : new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }),
      leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }),
      vine: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      hedge: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, normalMap: leafy, normalScale: new Vector2(0.9, 0.9) }),
      foliage: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, normalMap: leafyTall, normalScale: new Vector2(0.8, 0.8) }),
      palm: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
      lawn: new MeshStandardMaterial({ color: mixHex('#ffffff', colors.pond, 0.18), map: grass, roughness: 1 }),
    };
    return { geometry, materials, roses, hedgeRoses, leaves, cypress, textures: [normal, grass, leafy, leafyTall], detail };
  }, [detail, colors.stone, colors.pond, colors.leaf, colors.rose]);

  useEffect(
    () => () => {
      Object.values(assets.geometry).forEach((g) => g.dispose());
      Object.values(assets.materials).forEach((m) => m.dispose());
      assets.textures.forEach((t) => t?.dispose());
    },
    [assets],
  );
  return assets;
}
export type GardenAssets = ReturnType<typeof useGardenAssets>;

const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

function useRoseInstances(mesh: React.RefObject<InstancedMesh | null>, spots: RoseSpot[], ramp: string[]) {
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    const spin = new Quaternion();
    const c = new Color();
    spots.forEach((r, i) => {
      o.position.set(...r.position);
      o.quaternion.setFromUnitVectors(Y, new Vector3(...r.facing));
      o.quaternion.multiply(spin.setFromAxisAngle(Y, r.spin));
      o.scale.setScalar(r.scale);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(ramp[Math.floor(r.hue * ramp.length) % ramp.length]!));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [mesh, spots, ramp]);
}

function useLeafInstances(mesh: React.RefObject<InstancedMesh | null>, spots: LeafSpot[], leaf: string) {
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new Object3D();
    const spin = new Quaternion();
    const c = new Color();
    const base = new Color(leaf);
    spots.forEach((l, i) => {
      o.position.set(...l.position);
      o.quaternion.setFromUnitVectors(Z, new Vector3(...l.facing).normalize());
      o.quaternion.multiply(spin.setFromAxisAngle(Z, l.spin));
      o.scale.setScalar(l.scale);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.copy(base).multiplyScalar(l.shade));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [mesh, spots, leaf]);
}

/**
 * The garden's set: arch with its roses, leaves and vines, the deck and lawn, cypress rows, the
 * hedge and palms. Rendered twice on medium/low: once for real and once mirrored under the
 * water (the cheap reflection); `mirrored` swaps in the clip-below materials and skips the lawn.
 */
export function Garden({ assets, colors, mirrored = false }: { assets: GardenAssets; colors: GardenColors; mirrored?: boolean }) {
  const { geometry: g, materials: m } = assets;
  const roses = useRef<InstancedMesh>(null);
  const hedgeRoses = useRef<InstancedMesh>(null);
  const leaves = useRef<InstancedMesh>(null);
  const cypress = useRef<InstancedMesh>(null);
  const ramp = useMemo(
    () => [
      mixHex(colors.rose, '#ffffff', 0.5),
      mixHex(colors.rose, '#ffffff', 0.25),
      colors.rose,
      colors.rose,
      shadeHex(colors.rose, 0.82),
      mixHex(colors.rose, colors.seal, 0.4),
      '#F6E7DA',
    ],
    [colors.rose, colors.seal],
  );
  useRoseInstances(roses, assets.roses, ramp);
  useRoseInstances(hedgeRoses, assets.hedgeRoses, ramp);
  useLeafInstances(leaves, assets.leaves, colors.leaf);
  useLayoutEffect(() => {
    const mesh = cypress.current;
    if (!mesh) return;
    const o = new Object3D();
    assets.cypress.forEach((c, i) => {
      o.position.set(c.x, 0.08, c.z);
      o.scale.set(c.h * 0.95, c.h, c.h * 0.95);
      o.rotation.set(0, i * 1.3, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [assets.cypress]);

  return (
    <group>
      <mesh geometry={g.arch} material={mirrored ? m.stoneMirror : m.stone} position-z={-2.6} />
      <instancedMesh ref={roses} args={[g.rose, m.rose, assets.roses.length]} frustumCulled={false} />
      <instancedMesh ref={leaves} args={[g.leaf, m.leaf, assets.leaves.length]} frustumCulled={false} />
      <mesh geometry={g.vines} material={m.vine} />
      <mesh geometry={g.deck} material={mirrored ? m.stoneMirror : m.stone} />
      {!mirrored && <mesh geometry={g.lawn} material={m.lawn} />}
      <mesh geometry={g.hedge} material={m.hedge} position={[0, 0.05, HEDGE.z]} />
      <instancedMesh ref={hedgeRoses} args={[g.roseSmall, m.rose, assets.hedgeRoses.length]} frustumCulled={false} />
      <instancedMesh ref={cypress} args={[g.cypress, m.foliage, assets.cypress.length]} frustumCulled={false} />
      <mesh geometry={g.palms} material={m.palm} />
    </group>
  );
}

export interface SwimState {
  /** 0 resting at the pool's sides … 1 met in the heart. */
  swim: number;
}

/** The two swans; the mirrored pair (the reflection) follows exactly the same motion. */
export function SwanPair({ geometry, material, state, mirrored = false }: { geometry: BufferGeometry; material: Material; state: React.RefObject<SwimState>; mirrored?: boolean }) {
  const refs = [useRef<Mesh>(null), useRef<Mesh>(null)];
  const store = useInviteStore();
  useFrame((s) => {
    const { capture } = store.getState();
    const t = capture ? 0 : s.clock.elapsedTime;
    const u = state.current?.swim ?? 0;
    refs.forEach((ref, i) => {
      const mesh = ref.current;
      if (!mesh) return;
      const side = i === 0 ? -1 : 1;
      const p = swanPlacement(side, u);
      const bob = capture ? 0 : Math.sin(t * 1.1 + i * 1.9) * 0.005;
      mesh.position.set(p.x, bob, p.z);
      mesh.rotation.set(capture ? 0 : Math.sin(t * 0.7 + i) * 0.012, p.heading, capture ? 0 : Math.sin(t * 0.9 + i * 2.1) * 0.01);
    });
  });
  return (
    <group>
      <mesh ref={refs[0]} geometry={geometry} material={material} castShadow={!mirrored} />
      <mesh ref={refs[1]} geometry={geometry} material={material} castShadow={!mirrored} />
    </group>
  );
}
