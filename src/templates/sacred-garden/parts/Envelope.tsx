'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  FrontSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector2,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { canvas, cssFontFamily, heightToNormal, tintFromHeight } from '@/lib/invite/stage/textures';
import { envelopeMaps, sealHeight } from '../art';
import { grid } from '../geometry';
import { FLAPS, SEAL_SEEDS, sealRim, shardMotion, type FlapId } from '../layout';

export interface EnvelopeAnim {
  /** 0..1 the seal warms and glows before it gives. */
  glow: number;
  /** 0 whole … 1 the four shards have fallen away. */
  crack: number;
  /** Each flap: 0 closed … 1 folded open outwards. */
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** 0..1 warm light spilling from inside the open envelope. */
  light: number;
  /** 0..1 the whole envelope dissolves into the light. */
  fade: number;
  /** 0..1 position of the glint sweeping the seal. */
  glint: number;
}

export const ENVELOPE_REST: EnvelopeAnim = { glow: 0, crack: 0, top: 0, bottom: 0, left: 0, right: 0, light: 0, fade: 0, glint: 0 };

const COLS = 10;
const ROWS = 14;

/**
 * One triangular flap in its hinge frame: hinge along x (length `hinge`) at y = 0, tip at
 * (0, -depth). UVs address the envelope's shared face texture, through the flap's placement.
 */
function flapGeometry(hinge: number, depth: number, place: (x: number, y: number) => [number, number], w: number, h: number): BufferGeometry {
  const g = grid(COLS, ROWS, (u, v) => {
    const s = 1 - u * 2;
    return [s * (hinge / 2) * (1 - v), -v * depth, 0];
  });
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) {
    const [x, y] = place(pos.getX(i), pos.getY(i));
    uv.setXY(i, x / w + 0.5, y / h + 0.5);
  }
  return g;
}

/**
 * Folds a flap open: the hinge turns by A while the paper lags behind (curvature k), so it
 * peels outwards in a soft curl rather than swinging like a board.
 */
function curlFlap(g: BufferGeometry, rest: Float32Array, depth: number, open: number) {
  const pos = g.attributes.position!;
  const A = open * Math.PI * 0.94;
  const k = (-1.6 * Math.sin(Math.PI * Math.min(1, open * 1.08))) / depth;
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

type Tex = NonNullable<MeshStandardMaterial['map']>;

/**
 * Wax material that keeps only one Voronoi cell of the seal (its shard), with crack lines, a
 * sweeping glint and a warm inner glow that rises in its rim before it breaks.
 */
function shardMaterial(index: number, maps: { map: Tex; normal: Tex }, color: string, gold: boolean) {
  const m = new MeshPhysicalMaterial(
    gold
      ? // Antique gilt: metal, a soft polish and a thin lacquer that catches a second highlight.
        { color: '#ffffff', map: maps.map, normalMap: maps.normal, normalScale: new Vector2(1.5, 1.5), metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25, transparent: true }
      : {
          color: '#ffffff',
          map: maps.map,
          normalMap: maps.normal,
          normalScale: new Vector2(1.1, 1.1),
          roughness: 0.38,
          clearcoat: 0.85,
          clearcoatRoughness: 0.2,
          sheen: 0.35,
          sheenColor: mixHex(color, '#ffffff', 0.35),
          transparent: true,
        },
  );
  const uniforms = {
    uShard: { value: index },
    uSeeds: { value: SEAL_SEEDS.map(([x, y]) => new Vector2(x, y)) },
    uCrack: { value: 0 },
    uGlint: { value: 0 },
    uGlow: { value: 0 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uShard; uniform vec2 uSeeds[4]; uniform float uCrack; uniform float uGlint; uniform float uGlow;
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
        float rim = smoothstep(0.55, 0.95, length(sp));
        vec3 ember = vec3(1.0, 0.62, 0.36);
        diffuseColor.rgb *= 1.0 - crackLine * 0.6;
        totalEmissiveRadiance += ember * crackLine * uGlow * 2.2;
        totalEmissiveRadiance += ember * uGlow * (0.06 + rim * 0.75);
        float band = exp(-pow((sp.x * 0.8 + sp.y * 0.6) - mix(-4.0, 4.0, uGlint), 2.0) * 14.0);
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * band * ${gold ? '0.45' : '0.28'};`,
      );
  };
  m.customProgramCacheKey = () => `sg-seal-shard-v3-${gold ? 'gold' : 'wax'}`;
  return { material: m, uniforms };
}

/** A soft warm radial glow (additive sprite texture). */
function glowTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,244,222,1)');
  g.addColorStop(0.35, 'rgba(255,226,186,0.55)');
  g.addColorStop(1, 'rgba(255,214,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

interface FlapSpec {
  id: FlapId;
  hinge: number;
  depth: number;
  /** Hinge midpoint and rotation in the envelope plane (local -y points to the centre). */
  at: [number, number];
  angle: number;
  /** Stacking above the inner panel (top flap folds over everything). */
  z: number;
}

function flapSpecs(w: number, h: number): FlapSpec[] {
  return FLAPS.map((id) => {
    switch (id) {
      case 'left':
        return { id, hinge: h, depth: w / 2, at: [-w / 2, 0], angle: Math.PI / 2, z: 0.002 };
      case 'right':
        return { id, hinge: h, depth: w / 2, at: [w / 2, 0], angle: -Math.PI / 2, z: 0.002 };
      case 'bottom':
        return { id, hinge: w, depth: h / 2, at: [0, -h / 2], angle: Math.PI, z: 0.004 };
      default:
        return { id, hinge: w, depth: h / 2, at: [0, h / 2], angle: 0, z: 0.006 };
    }
  });
}

/**
 * The ivory envelope of the gate: four flaps folded to a diamond, meeting under a burgundy wax
 * seal. Opening: the seal glows and cracks away, the flaps peel open outwards one after another,
 * and warm light pours out of the envelope until it dissolves into the garden.
 */
export function GardenEnvelope({
  size,
  colors,
  monogram,
  fontVar,
  state,
  relief = 0.9,
}: {
  size: { w: number; h: number };
  colors: { paper: string; blush: string; gold: string; seal: string; sealRelief: string; sealFinish: string };
  monogram: string;
  fontVar: string;
  state: React.RefObject<EnvelopeAnim>;
  /** Strength of the blind emboss (normal scale). */
  relief?: number;
}) {
  const { w, h } = size;
  const R = Math.min(w, h) * 0.14;
  const specs = useMemo(() => flapSpecs(w, h), [w, h]);
  const shardGroups = useRef<(Group | null)[]>([]);
  const glowMesh = useRef<Mesh>(null);
  const last = useRef<Record<FlapId, number>>({ top: -1, bottom: -1, left: -1, right: -1 });

  const geo = useMemo(() => {
    const flaps = specs.map((f) => {
      const c = Math.cos(f.angle);
      const s = Math.sin(f.angle);
      const g = flapGeometry(f.hinge, f.depth, (x, y) => [f.at[0] + x * c - y * s, f.at[1] + x * s + y * c], w, h);
      return { geometry: g, rest: Float32Array.from(g.attributes.position!.array) };
    });
    return { flaps, inner: new PlaneGeometry(w * 0.995, h * 0.995), seal: sealGeometry(R), glow: new PlaneGeometry(1, 1) };
  }, [specs, w, h, R]);

  const mats = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const face = envelopeMaps(w, h, { paper: colors.paper, blush: colors.blush });
    const gold = colors.sealFinish === 'gold';
    const height = sealHeight(monogram, cssFontFamily(fontVar, 'serif'));
    const sealMaps = { map: tintFromHeight(height, colors.seal, colors.sealRelief), normal: heightToNormal(height, gold ? 3.6 : 3) };
    const glow = glowTexture();
    return {
      front: new MeshPhysicalMaterial({
        map: face.map,
        normalMap: face.normalMap,
        normalScale: new Vector2(relief, relief),
        roughness: 0.82,
        sheen: 0.5,
        sheenColor: '#ffffff',
        sheenRoughness: 0.6,
        side: FrontSide,
        transparent: true,
      }),
      back: new MeshStandardMaterial({ map: face.liner, roughness: 0.75, side: BackSide, transparent: true }),
      inner: new MeshBasicMaterial({ color: mixHex(colors.paper, colors.blush, 0.35), toneMapped: false, transparent: true }),
      glow: new MeshBasicMaterial({ map: glow, color: '#ffffff', blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
      shards: [0, 1, 2, 3].map((i) => shardMaterial(i, sealMaps, colors.seal, gold)),
      innerBase: new Color(mixHex(colors.paper, colors.blush, 0.35)),
      innerHot: new Color('#FFF3DF'),
      textures: [face.map, face.normalMap, face.liner, sealMaps.map, sealMaps.normal, glow],
    };
  }, [w, h, monogram, fontVar, relief, colors.paper, colors.blush, colors.seal, colors.sealRelief, colors.sealFinish]);

  useEffect(
    () => () => {
      geo.flaps.forEach((f) => f.geometry.dispose());
      geo.inner.dispose();
      geo.seal.dispose();
      geo.glow.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      if (!mats) return;
      mats.textures.forEach((t) => t.dispose());
      [mats.front, mats.back, mats.inner, mats.glow, ...mats.shards.map((s) => s.material)].forEach((m) => m.dispose());
    },
    [mats],
  );

  useFrame(() => {
    const s = state.current;
    if (!s || !mats) return;
    specs.forEach((f, i) => {
      const open = s[f.id];
      if (Math.abs(open - last.current[f.id]) < 1e-5) return;
      curlFlap(geo.flaps[i]!.geometry, geo.flaps[i]!.rest, f.depth, open);
      last.current[f.id] = open;
    });
    const keep = 1 - s.fade;
    mats.front.opacity = keep;
    mats.back.opacity = keep;
    // The inside heats from warm paper to a white-gold light that blooms.
    mats.inner.color.copy(mats.innerBase).lerp(mats.innerHot, Math.min(1, s.light * 1.4)).multiplyScalar(1 + s.light * s.light * 2.2);
    mats.inner.opacity = keep;
    mats.glow.opacity = Math.min(1, s.light * 1.2 + s.glow * 0.35 * (1 - s.crack)) * (0.4 + 0.6 * keep);
    if (glowMesh.current) {
      const k = (0.5 + s.glow * 0.4 + s.light * s.light * 2.6) * Math.max(w, h);
      glowMesh.current.scale.set(k, k, 1);
    }
    mats.shards.forEach(({ material, uniforms }, i) => {
      uniforms.uCrack.value = s.crack;
      uniforms.uGlint.value = s.glint;
      uniforms.uGlow.value = s.glow;
      const m = shardMotion(i, s.crack);
      material.opacity = m.opacity * keep;
      material.visible = material.opacity > 0.002;
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
      <mesh geometry={geo.inner} material={mats.inner} renderOrder={10} />
      {specs.map((f, i) => (
        <group key={f.id} position={[f.at[0], f.at[1], f.z]} rotation-z={f.angle}>
          <mesh geometry={geo.flaps[i]!.geometry} material={mats.front} renderOrder={11 + i} />
          <mesh geometry={geo.flaps[i]!.geometry} material={mats.back} renderOrder={11 + i} />
        </group>
      ))}
      <mesh ref={glowMesh} geometry={geo.glow} material={mats.glow} position={[0, 0, 0.05]} renderOrder={16} />
      <group position={[0, 0, 0.012]}>
        {mats.shards.map(({ material }, i) => {
          const [sx, sy] = SEAL_SEEDS[i]!;
          return (
            <group key={i} ref={(g) => void (shardGroups.current[i] = g)}>
              <mesh geometry={geo.seal} material={material} position={[-sx * R, -sy * R, 0]} renderOrder={17} />
            </group>
          );
        })}
      </group>
    </group>
  );
}
