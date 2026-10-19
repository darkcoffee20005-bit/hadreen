'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, BoxGeometry, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type BufferGeometry, type Group } from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { cssFontFamily, heightToNormal, monogramHeight, tintFromHeight } from '@/lib/invite/stage/textures';
import { envelopeBodyMaps, envelopeFlapMaps } from '../art';
import { grid } from '../geometry';
import { SEAL_SEEDS, sealRim, shardMotion } from '../layout';

export interface EnvelopeAnim {
  /** 0 closed … 1 open (curls up over the top). */
  flap: number;
  /** 0 whole … 1 the four shards have fallen away. */
  crack: number;
  /** 0..1 position of the glint sweeping the seal. */
  glint: number;
}

const FLAP_COLS = 12;
const FLAP_ROWS = 18;

/** The flap at rest: a V from the hinge (y=0) down to its tip; UVs match the body's texture. */
function flapGeometry(w: number, h: number, depth: number): BufferGeometry {
  const g = grid(FLAP_COLS, FLAP_ROWS, (u, v) => {
    const s = 1 - u * 2;
    return [s * (w / 2) * Math.pow(1 - v, 0.96), -v * depth, 0];
  });
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, 1 + pos.getY(i) / h);
  return g;
}

/**
 * Bends the flap: the hinge turns by A while the paper lags behind it (curvature k), so the
 * flap peels up in a soft curl rather than swinging like a board.
 */
function curlFlap(g: BufferGeometry, rest: Float32Array, depth: number, flap: number) {
  const pos = g.attributes.position!;
  const A = flap * Math.PI * 0.97;
  const k = (-1.7 * Math.sin(Math.PI * Math.min(1, flap * 1.1))) / depth;
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3]!;
    const d = -rest[i * 3 + 1]!;
    let y: number;
    let z: number;
    if (Math.abs(k) < 1e-4) {
      y = -d * Math.cos(A);
      z = d * Math.sin(A);
    } else {
      y = -(Math.sin(A + k * d) - Math.sin(A)) / k;
      z = (Math.cos(A) - Math.cos(A + k * d)) / k;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}

/** A domed wax disc with a poured, irregular lip. Planar UVs across its face. */
function sealGeometry(R: number): BufferGeometry {
  const H = R * 0.22;
  const K = 9;
  const profile: [number, number][] = [];
  for (let k = 0; k <= K; k++) profile.push([(R * k) / K, H * (0.84 + 0.16 * (1 - (k / K) ** 2))]);
  profile.push([R * 1.035, H * 0.66], [R * 1.055, H * 0.3], [R * 1.02, 0]);
  const n = profile.length - 1;
  const g = grid(64, n, (u, v) => {
    const [r, z] = profile[Math.round(v * n)]!;
    const a = -u * Math.PI * 2;
    const wob = sealRim(a);
    return [Math.cos(a) * r * wob, Math.sin(a) * r * wob, z];
  });
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2.2 * R) + 0.5, pos.getY(i) / (2.2 * R) + 0.5);
  return g;
}

/** Wax material that keeps only one Voronoi cell of the seal (its shard), with crack lines and a glint. */
function shardMaterial(index: number, maps: { map: THREE_Texture; normal: THREE_Texture }, color: string) {
  const m = new MeshPhysicalMaterial({
    color: '#ffffff',
    map: maps.map,
    normalMap: maps.normal,
    normalScale: new Vector2(1.1, 1.1),
    roughness: 0.4,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
    sheen: 0.35,
    sheenColor: mixHex(color, '#ffffff', 0.35),
    transparent: true,
  });
  const uniforms = {
    uShard: { value: index },
    uSeeds: { value: SEAL_SEEDS.map(([x, y]) => new Vector2(x, y)) },
    uCrack: { value: 0 },
    uGlint: { value: 0 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uShard; uniform vec2 uSeeds[4]; uniform float uCrack; uniform float uGlint;
        float sgH(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float sgN(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(sgH(i), sgH(i + vec2(1.0, 0.0)), f.x), mix(sgH(i + vec2(0.0, 1.0)), sgH(i + vec2(1.0, 1.0)), f.x), f.y); }`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        vec2 sp = vMapUv * 2.0 - 1.0;
        float best = 1e9; float second = 1e9; float cell = 0.0;
        for (int i = 0; i < 4; i++) {
          float d = distance(sp, uSeeds[i]) + (sgN(sp * 6.0 + float(i) * 3.7) - 0.5) * 0.14 + (sgN(sp * 19.0 - float(i)) - 0.5) * 0.04;
          if (d < best) { second = best; best = d; cell = float(i); } else if (d < second) { second = d; }
        }
        if (abs(cell - uShard) > 0.5) discard;
        float sgEdge = second - best;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float crackLine = (1.0 - smoothstep(0.0, 0.03, sgEdge)) * smoothstep(0.0, 0.06, uCrack);
        diffuseColor.rgb *= 1.0 - crackLine * 0.8;
        float band = exp(-pow((sp.x * 0.8 + sp.y * 0.6) - mix(-4.0, 4.0, uGlint), 2.0) * 14.0);
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * band * 0.32;`,
      );
  };
  m.customProgramCacheKey = () => 'sg-seal-shard';
  return { material: m, uniforms };
}
type THREE_Texture = NonNullable<MeshStandardMaterial['map']>;

export function GardenEnvelope({
  size,
  colors,
  monogram,
  fontVar,
  state,
}: {
  size: { w: number; h: number; flap: number };
  colors: { paper: string; wine: string; gold: string; seal: string };
  monogram: string;
  fontVar: string;
  state: React.RefObject<EnvelopeAnim>;
}) {
  const { w, h, flap } = size;
  const thick = 0.026;
  const depth = h * flap;
  const R = Math.min(w, h) * 0.125;
  const sealY = h / 2 - depth + R * 0.5;
  const shardGroups = useRef<(Group | null)[]>([]);
  const lastFlap = useRef(-1);

  const geo = useMemo(() => {
    const flapGeo = flapGeometry(w, h, depth);
    return { body: new BoxGeometry(w, h, thick), flap: flapGeo, rest: Float32Array.from(flapGeo.attributes.position!.array), seal: sealGeometry(R) };
  }, [w, h, depth, R]);

  const mats = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const body = envelopeBodyMaps(w, h, flap, colors);
    const fl = envelopeFlapMaps(w, h, flap, colors);
    const height = monogramHeight(monogram, cssFontFamily(fontVar, 'serif'));
    const sealMaps = { map: tintFromHeight(height, colors.seal, mixHex(colors.gold, '#ffffff', 0.1)), normal: heightToNormal(height, 3) };
    const paper = (m: typeof body) =>
      new MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, normalScale: new Vector2(0.7, 0.7), roughnessMap: m.ormMap, metalnessMap: m.ormMap, roughness: 1, metalness: 1, sheen: 0.4, sheenColor: '#ffffff', sheenRoughness: 0.6 });
    const shards = [0, 1, 2, 3].map((i) => shardMaterial(i, sealMaps, colors.seal));
    // Drawn in the transparent pass (fully opaque) after the pond's film, which otherwise tints the
    // envelope's lower edge on tall screens.
    return {
      body: Object.assign(paper(body), { transparent: true }),
      flapFront: Object.assign(paper(fl), { side: FrontSide, transparent: true }),
      flapBack: new MeshStandardMaterial({ map: fl.liner, roughness: 0.55, metalness: 0.15, side: BackSide, transparent: true }),
      shards,
      textures: [body.map, body.normalMap, body.ormMap, fl.map, fl.normalMap, fl.ormMap, fl.liner, sealMaps.map, sealMaps.normal],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, flap, monogram, fontVar, colors.paper, colors.wine, colors.gold, colors.seal]);

  useEffect(
    () => () => {
      geo.body.dispose();
      geo.flap.dispose();
      geo.seal.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      if (!mats) return;
      mats.textures.forEach((t) => t.dispose());
      [mats.body, mats.flapFront, mats.flapBack, ...mats.shards.map((s) => s.material)].forEach((m) => m.dispose());
    },
    [mats],
  );

  useFrame(() => {
    const s = state.current;
    if (!s) return;
    if (Math.abs(s.flap - lastFlap.current) > 1e-5) {
      curlFlap(geo.flap, geo.rest, depth, s.flap);
      lastFlap.current = s.flap;
    }
    mats?.shards.forEach(({ material, uniforms }, i) => {
      uniforms.uCrack.value = s.crack;
      uniforms.uGlint.value = s.glint;
      const m = shardMotion(i, s.crack);
      material.opacity = m.opacity;
      material.visible = m.opacity > 0.002;
      const g = shardGroups.current[i];
      if (!g) return;
      const [sx, sy] = SEAL_SEEDS[i]!;
      g.position.set(sx * R + m.offset[0] * R, sy * R + m.offset[1] * R, m.offset[2] * R);
      g.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
    });
  });

  if (!mats) return null;
  return (
    <group>
      <mesh geometry={geo.body} material={mats.body} renderOrder={10} />
      <group position={[0, h / 2 - 0.004, thick / 2 + 0.002]}>
        <mesh geometry={geo.flap} material={mats.flapFront} renderOrder={11} />
        <mesh geometry={geo.flap} material={mats.flapBack} renderOrder={11} />
      </group>
      <group position={[0, sealY, thick / 2 + 0.004]}>
        {mats.shards.map(({ material }, i) => {
          const [sx, sy] = SEAL_SEEDS[i]!;
          return (
            <group key={i} ref={(g) => void (shardGroups.current[i] = g)}>
              <mesh geometry={geo.seal} material={material} position={[-sx * R, -sy * R, 0]} renderOrder={12} />
            </group>
          );
        })}
      </group>
    </group>
  );
}
