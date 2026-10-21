'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useInviteStore } from '@/lib/invite/machine';
import type { Tier } from '@/lib/invite/quality/tiers';
import { mixHex, shadeHex } from '@/lib/invite/stage/color';
import { marbleMap, stoneNormal } from '../art';
import { buildLeaf, buildRose, buildVines, lin, paint } from '../geometry';
import { allRoses, ARCH_AT, FLOOR, FLOOR_Y, leafLayout, RAIL, strandLayout, strandLeaves, type LeafSpot, type RoseSpot } from '../layout';
import { balusterXs, buildBalustrade, buildBaluster, buildCurtains, buildLanterns, buildLoggia } from '../terrace';
import { detailFor } from './Garden';

export interface TerraceColors {
  stone: string;
  marble: string;
  rose: string;
  leaf: string;
  sun: string;
}

/** Everything static on the terrace, built once per tier. */
export function useTerraceAssets(colors: TerraceColors, tier: Tier) {
  const detail = detailFor(tier);
  const assets = useMemo(() => {
    const archRoses = detail === 'low' ? 90 : detail === 'medium' ? 150 : 200;
    const strands = strandLayout(detail === 'low' ? 10 : 18);
    // A few small blossoms along the trailing strands.
    const blossoms: RoseSpot[] = strands.flatMap((pts, i) =>
      [3, 6].map((k, j) => ({ position: pts[Math.min(pts.length - 1, k + (i % 2))]!, facing: [0.15 * (j ? 1 : -1), -0.25, 1] as [number, number, number], scale: 0.035 + ((i * 7 + j * 3) % 5) * 0.004, hue: ((i * 0.37 + j * 0.21) % 1), spin: i + j })),
    );
    const roses = [...allRoses(archRoses, detail === 'low' ? 18 : 30, detail === 'low' ? 22 : 38), ...blossoms];
    const leaves = [...leafLayout(roses, detail === 'low' ? 80 : 190), ...strandLeaves(strands)];
    const strandGeo = strands.map((pts) => {
      const t = new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 10, 0.008, 4, false);
      return paint(t, () => lin(shadeHex(colors.leaf, 0.7)));
    });
    const vines = buildVines(shadeHex(colors.leaf, 0.85), detail);
    const vinesAll = mergeGeometries([vines.index ? vines.toNonIndexed() : vines, ...strandGeo.map((g) => g.toNonIndexed())], false)!;
    vines.dispose();
    strandGeo.forEach((g) => g.dispose());
    const lanterns = buildLanterns(detail);
    const floor = new PlaneGeometry(FLOOR.half * 2, FLOOR.zNear - FLOOR.zFar);
    floor.rotateX(-Math.PI / 2);
    floor.translate(0, FLOOR_Y, (FLOOR.zNear + FLOOR.zFar) / 2);
    const geometry = {
      loggia: buildLoggia(colors.stone, detail),
      balustrade: buildBalustrade(colors.stone, detail),
      baluster: buildBaluster(detail),
      curtains: buildCurtains(detail),
      rose: buildRose(detail),
      leaf: buildLeaf(),
      vines: vinesAll,
      floor,
      brass: lanterns.brass,
      glass: lanterns.glass,
      candles: lanterns.candles,
    };
    const browser = typeof document !== 'undefined';
    const normal = browser ? stoneNormal() : null;
    normal?.repeat.set(0.6, 0.6);
    const marble = browser ? marbleMap(colors.marble) : null;
    marble?.repeat.set((FLOOR.half * 2) / 1.8, (FLOOR.zNear - FLOOR.zFar) / 1.8);
    const rich = detail !== 'low';
    const materials = {
      stone: new MeshStandardMaterial({ vertexColors: true, normalMap: normal, normalScale: new Vector2(0.18, 0.18), roughness: 0.92 }),
      rose: rich
        ? new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.7, sheenColor: mixHex(colors.rose, '#ffffff', 0.5), sheenRoughness: 0.5, side: DoubleSide })
        : new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }),
      leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }),
      vine: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      floor: new MeshStandardMaterial({ map: marble, roughness: 0.3, metalness: 0, envMapIntensity: 0.55 }),
      curtain: curtainMaterial(),
      brass: new MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.32 }),
      glass: new MeshStandardMaterial({ color: '#FFE9C8', emissive: '#FFB866', emissiveIntensity: 0.9, transparent: true, opacity: 0.36, roughness: 0.08, depthWrite: false, side: DoubleSide }),
      candle: new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: '#FFD9A6', emissiveIntensity: 0.25 }),
      flames: flameMaterial(),
    };
    return { geometry, materials, roses, leaves, flames: lanterns.flames, balusters: balusterXs(), textures: [normal, marble], detail };
  }, [detail, colors.stone, colors.marble, colors.leaf, colors.rose]);

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
export type TerraceAssets = ReturnType<typeof useTerraceAssets>;

/** Sheer voile: double-sided, translucent, faintly self-lit by the sunset behind it, swaying in a breeze. */
function curtainMaterial() {
  const m = new MeshStandardMaterial({ color: '#FFFBF6', emissive: '#FFEBD8', emissiveIntensity: 0.42, transparent: true, opacity: 0.6, roughness: 1, side: DoubleSide, depthWrite: false });
  const uniforms = { uTime: { value: 0 }, uAmp: { value: 1 } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uAmp;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float sgV = uv.y;
      float sgW1 = sin(uTime * 0.7 + sgV * 2.6 + uv.x * 1.7);
      float sgW2 = sin(uTime * 1.13 + sgV * 4.1 - uv.x * 2.3);
      transformed.z += (sgW1 * 0.07 + sgW2 * 0.03) * sgV * sgV * uAmp;
      transformed.x += sgW2 * 0.025 * sgV * sgV * uAmp;`,
    );
    // Thinner (more see-through) between the pleats' folds.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opacity_fragment>',
      `#include <opacity_fragment>
      diffuseColor.a *= 0.75 + 0.25 * abs(sin(vUv.x * 60.0));`,
    );
    shader.vertexShader = shader.vertexShader.replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec2 vUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\nvarying vec2 vUv;');
  };
  m.customProgramCacheKey = () => 'sg-curtain';
  return Object.assign(m, { userData: { uniforms } });
}

/** Candle flames: a bright core and a wide warm halo per point, flickering. */
function flameMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float seed;
      uniform float uTime;
      uniform float uScale;
      varying float vFlick;
      void main() {
        vFlick = 0.86 + 0.08 * sin(uTime * 11.0 + seed * 7.0) + 0.06 * sin(uTime * 23.0 + seed * 3.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale * vFlick / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGlow;
      varying float vFlick;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        float halo = exp(-r * r * 4.0) * 0.55;
        float core = exp(-(p.x * p.x * 60.0 + (p.y + 0.05) * (p.y + 0.05) * 22.0));
        vec3 col = vec3(1.0, 0.72, 0.38) * halo + vec3(1.0, 0.93, 0.78) * core * 1.6;
        gl_FragColor = vec4(col * vFlick * uGlow, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

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
 * The loggia terrace: the wall and its rose-wrapped arch with trailing greenery and sheer
 * curtains, the balustrade with its urn bouquets, the marble floor and the lanterns.
 */
export function Terrace({ assets, colors, tier, glow }: { assets: TerraceAssets; colors: TerraceColors; tier: Tier; glow: React.RefObject<number> }) {
  const { geometry: g, materials: m } = assets;
  const store = useInviteStore();
  const roses = useRef<InstancedMesh>(null);
  const leaves = useRef<InstancedMesh>(null);
  const balusters = useRef<InstancedMesh>(null);
  const ramp = useMemo(
    () => [
      mixHex(colors.rose, '#ffffff', 0.62),
      mixHex(colors.rose, '#ffffff', 0.4),
      mixHex(colors.rose, '#ffffff', 0.18),
      colors.rose,
      shadeHex(colors.rose, 0.92),
      '#FCF5EC',
      '#F7E8D8',
      '#FFFFFF',
      mixHex(colors.rose, '#F6D6A8', 0.45),
    ],
    [colors.rose],
  );
  useRoseInstances(roses, assets.roses, ramp);
  useLeafInstances(leaves, assets.leaves, colors.leaf);
  useLayoutEffect(() => {
    const mesh = balusters.current;
    if (!mesh) return;
    const o = new Object3D();
    assets.balusters.forEach((x, i) => {
      o.position.set(x, FLOOR_Y + 0.22, RAIL.z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [assets.balusters]);

  const flames = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(assets.flames.flatMap((f) => f.at)), 3));
    geo.setAttribute('size', new BufferAttribute(new Float32Array(assets.flames.map((f) => 0.42 * f.size)), 1));
    geo.setAttribute('seed', new BufferAttribute(new Float32Array(assets.flames.map((_, i) => i * 1.37)), 1));
    return geo;
  }, [assets.flames]);
  useEffect(() => () => flames.dispose(), [flames]);

  const curtainU = (m.curtain.userData as { uniforms: { uTime: { value: number }; uAmp: { value: number } } }).uniforms;
  useFrame((state) => {
    const { capture } = store.getState();
    const t = capture ? 3 : state.clock.elapsedTime;
    curtainU.uTime.value = t;
    curtainU.uAmp.value = tier === 'low' ? 0 : 1;
    m.flames.uniforms.uTime!.value = t;
    m.flames.uniforms.uScale!.value = state.size.height * state.viewport.dpr * 0.9;
    const flick = 0.85 + 0.1 * Math.sin(t * 9.3) + 0.05 * Math.sin(t * 17.1);
    const k = 0.55 + 0.45 * (glow.current ?? 1);
    m.glass.emissiveIntensity = 0.9 * flick * k;
    m.flames.uniforms.uGlow!.value = k;
  });

  return (
    <group>
      <group position={ARCH_AT}>
        <mesh geometry={g.loggia} material={m.stone} />
        <instancedMesh ref={roses} args={[g.rose, m.rose, assets.roses.length]} frustumCulled={false} />
        <instancedMesh ref={leaves} args={[g.leaf, m.leaf, assets.leaves.length]} frustumCulled={false} />
        <mesh geometry={g.vines} material={m.vine} />
        <mesh geometry={g.curtains} material={m.curtain} renderOrder={6} />
      </group>
      <mesh geometry={g.floor} material={m.floor} />
      <mesh geometry={g.balustrade} material={m.stone} />
      <instancedMesh ref={balusters} args={[g.baluster, m.stone, assets.balusters.length]} frustumCulled={false} />
      <mesh geometry={g.brass} material={m.brass} />
      <mesh geometry={g.candles} material={m.candle} />
      <mesh geometry={g.glass} material={m.glass} renderOrder={7} />
      <points geometry={flames} material={m.flames} renderOrder={8} frustumCulled={false} />
    </group>
  );
}
