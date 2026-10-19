'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, TorusGeometry, Vector2, type Group } from 'three';
import { mixHex as mix } from '@/lib/invite/stage/color';
import { CURTAIN_H, CURTAIN_W, CURTAIN_Z, TIE_Y } from '../camera';
import { curtainSheet } from '../geometry';

/**
 * Rose-satin curtains in the mouth of the horseshoe arch: one deformed sheet drawn twice (the
 * right panel mirrored). The GPU deformation gathers the fabric toward the gold tiebacks as
 * `uOpen` rises — the pleats crowd together and deepen, the leading edge sweeps into an
 * hourglass — and breathes gently while closed. A gold galloon runs down the leading edge and
 * along the hem. The GLSL mirrors `curtainProfile` (unit-tested).
 */
export function curtainProfile(v: number, tie: number): number {
  const above = Math.min(1, Math.max(0, (v - tie) / (1 - tie)));
  const below = Math.min(1, Math.max(0, (tie - v) / tie));
  return 0.2 + 0.32 * Math.pow(above, 0.75) + 0.2 * Math.pow(below, 1.4);
}

const DEFORM = /* glsl */ `
uniform float uOpen; uniform float uTime; uniform float uBreath; uniform float uW; uniform float uH; uniform float uTie; uniform float uDepth;
varying float vFold; varying vec2 vCu;
float cuFold(float u){ return 0.55 * sin(u * 56.55 + 0.4) + 0.3 * sin(u * 103.0 + 1.7) + 0.15 * sin(u * 21.0 + 2.9); }
float cuProfile(float v){
  float above = clamp((v - uTie) / (1.0 - uTie), 0.0, 1.0);
  float below = clamp((uTie - v) / uTie, 0.0, 1.0);
  return 0.2 + 0.32 * pow(above, 0.75) + 0.2 * pow(below, 1.4);
}
vec3 cuPoint(float u, float v){
  float o = uOpen;
  float g = mix(1.0, cuProfile(v), o);
  float b = uBreath * (1.0 - v);
  float x = -uW + u * (uW + 0.03) * g + b * 0.03 * sin(uTime * 0.6 + v * 2.0) * u;
  float y = v * uH + o * u * pow(1.0 - v, 3.0) * 0.45;
  float amp = uDepth * (0.6 + 0.4 * pow(1.0 / g, 0.65));
  float z = cuFold(u) * amp;
  float tieBand = exp(-pow((v - uTie) * 5.0, 2.0));
  z += o * 0.22 * sin(3.14159 * u) * (1.0 - tieBand);
  z += b * 0.07 * sin(uTime * 0.8 + v * 2.5 + u * 3.0);
  return vec3(x, y, z);
}
`;

export interface CurtainUniforms {
  [k: string]: { value: number };
  uOpen: { value: number };
  uTime: { value: number };
  uBreath: { value: number };
}

export function useCurtains(satin: string, satinDeep: string, gold: string, low: boolean) {
  const geometry = useMemo(() => curtainSheet(low ? 110 : 190, low ? 50 : 90), [low]);
  const uniforms = useMemo<CurtainUniforms>(
    () => ({ uOpen: { value: 0 }, uTime: { value: 0 }, uBreath: { value: 1 }, uW: { value: CURTAIN_W }, uH: { value: CURTAIN_H }, uTie: { value: TIE_Y / CURTAIN_H }, uDepth: { value: 0.11 } }) as CurtainUniforms,
    [],
  );
  const material = useMemo(() => {
    const m = low
      ? new MeshStandardMaterial({ color: satin, roughness: 0.42, metalness: 0.08, side: DoubleSide })
      : new MeshPhysicalMaterial({ color: satin, roughness: 0.4, metalness: 0.05, sheen: 1, sheenRoughness: 0.32, sheenColor: new Color(mix(satin, '#fff4f2', 0.6)), side: DoubleSide });
    const deep = new Color(satinDeep);
    const g = new Color(gold);
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uDeep: { value: deep }, uGold: { value: g } });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${DEFORM}`)
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 cuP = cuPoint(position.x, position.y);
           vec3 cuPx = cuPoint(position.x + 0.004, position.y);
           vec3 cuPy = cuPoint(position.x, position.y + 0.004);
           vec3 objectNormal = normalize(cross(cuPx - cuP, cuPy - cuP));
           vFold = cuFold(position.x); vCu = position.xy;`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = cuP;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uDeep; uniform vec3 uGold; uniform float uOpen; varying float vFold; varying vec2 vCu;\nfloat cuGold = 0.0;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float cuAO = smoothstep(-0.95, 0.95, vFold);
           diffuseColor.rgb = mix(uDeep, diffuseColor.rgb, 0.35 + 0.65 * cuAO);
           cuGold = max(smoothstep(0.985, 0.99, vCu.x) * (1.0 - smoothstep(0.996, 0.999, vCu.x)), (1.0 - smoothstep(0.012, 0.016, vCu.y)) * step(0.004, vCu.y));
           diffuseColor.rgb = mix(diffuseColor.rgb, uGold, cuGold);`,
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, cuGold);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, cuGold);');
    };
    m.customProgramCacheKey = () => `bo-curtain-${low ? 'l' : 'h'}`;
    return m;
  }, [satin, satinDeep, gold, low, uniforms]);

  // The tieback: a gold cord around the gathered satin, with a tassel.
  const tie = useMemo(() => {
    const ring = new TorusGeometry(1, 0.16, 8, 28).rotateX(Math.PI / 2);
    const prof = [
      [0.001, 0.12],
      [0.05, 0.1],
      [0.07, 0.02],
      [0.04, -0.04],
      [0.09, -0.1],
      [0.13, -0.42],
      [0.1, -0.46],
      [0.001, -0.47],
    ].map(([r, y]) => new Vector2(r!, y!));
    const tassel = new LatheGeometry(prof, 14);
    const mat = new MeshStandardMaterial({ color: gold, metalness: 0.85, roughness: 0.35, emissive: gold, emissiveIntensity: 0.08 });
    return { ring, tassel, mat };
  }, [gold]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      tie.ring.dispose();
      tie.tassel.dispose();
      tie.mat.dispose();
    },
    [geometry, material, tie],
  );

  // Where the tied-back bundle sits (left panel), for the cord.
  const bundle = curtainProfile(TIE_Y / CURTAIN_H, TIE_Y / CURTAIN_H) * (CURTAIN_W + 0.03);
  const tieX = -CURTAIN_W + bundle * 0.5;
  return { geometry, material, uniforms, tie, tieX, bundle };
}

export function Curtains({ c }: { c: ReturnType<typeof useCurtains> }) {
  const ties = [useRef<Group>(null), useRef<Group>(null)];
  useFrame(() => {
    const k = smooth(0.45, 0.95, c.uniforms.uOpen.value);
    for (const t of ties) {
      const g = t.current;
      if (!g) continue;
      g.visible = k > 0.01;
      g.children[0]!.scale.set((c.bundle * 0.5 + 0.05) * k + 0.001, 0.4, 0.3 * k + 0.001);
      g.children[1]!.scale.setScalar(1.5 * k + 0.001);
    }
  });
  return (
    <group position={[0, 0, CURTAIN_Z]}>
      {[1, -1].map((side, i) => (
        <group key={side} scale={[side, 1, 1]}>
          <mesh geometry={c.geometry} material={c.material} frustumCulled={false} />
          <group ref={ties[i]} position={[c.tieX, TIE_Y, 0.02]} visible={false}>
            <mesh geometry={c.tie.ring} material={c.tie.mat} />
            <mesh geometry={c.tie.tassel} material={c.tie.mat} position={[c.bundle * 0.5, -0.1, 0.3]} />
          </group>
        </group>
      ))}
    </group>
  );
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
