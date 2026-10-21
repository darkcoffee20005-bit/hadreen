'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, MeshBasicMaterial, ShaderMaterial } from 'three';
import { useInviteStore } from '@/lib/invite/machine';
import type { Tier } from '@/lib/invite/quality/tiers';
import { buildMountains, buildVillage, type VistaColors } from '../terrace';
import { clipAtWater, detailFor } from './Garden';

/** The view beyond the balustrade: layered mountains and the lakeside village with its first lights. */
export function useVistaAssets(colors: VistaColors, tier: Tier) {
  const detail = detailFor(tier);
  const assets = useMemo(() => {
    const village = buildVillage(colors, detail);
    const lights = new BufferGeometry();
    lights.setAttribute('position', new BufferAttribute(new Float32Array(village.lights.flat()), 3));
    lights.setAttribute('seed', new BufferAttribute(new Float32Array(village.lights.map((_, i) => (i * 0.618) % 1)), 1));
    const basic = (keep: 'above' | 'below') => clipAtWater(new MeshBasicMaterial({ vertexColors: true, fog: false }), keep);
    return {
      mountains: buildMountains(colors, detail),
      village: village.buildings,
      lights,
      materials: { land: basic('above'), landMirror: basic('below'), lights: lightMaterial(1), lightsMirror: lightMaterial(0.55) },
    };
  }, [colors, detail]);
  useEffect(
    () => () => {
      assets.mountains.dispose();
      assets.village.dispose();
      assets.lights.dispose();
      Object.values(assets.materials).forEach((m) => m.dispose());
    },
    [assets],
  );
  return assets;
}
export type VistaAssets = ReturnType<typeof useVistaAssets>;

function lightMaterial(strength: number) {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      uniform float uScale;
      varying float vA;
      void main() {
        vA = 0.75 + 0.25 * sin(uTime * (1.5 + seed * 2.0) + seed * 40.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.5, 0.9 * uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOn;
      varying float vA;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float a = exp(-dot(p, p) * 3.5);
        gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * a * vA * uOn * ${strength.toFixed(2)}, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

/** `mirrored`: the copy under the lake (its reflection on medium/low). `lights` 0..1 fades the village lights up. */
export function Vista({ assets, mirrored = false, lights }: { assets: VistaAssets; mirrored?: boolean; lights: React.RefObject<number> }) {
  const store = useInviteStore();
  const m = assets.materials;
  const lm = mirrored ? m.lightsMirror : m.lights;
  useFrame((state) => {
    const t = store.getState().capture ? 2 : state.clock.elapsedTime;
    lm.uniforms.uTime!.value = t;
    lm.uniforms.uOn!.value = lights.current ?? 1;
    lm.uniforms.uScale!.value = state.size.height * state.viewport.dpr * 0.5;
  });
  return (
    <group>
      <mesh geometry={assets.mountains} material={mirrored ? m.landMirror : m.land} renderOrder={1} />
      <mesh geometry={assets.village} material={mirrored ? m.landMirror : m.land} renderOrder={1} />
      <points geometry={assets.lights} material={lm} renderOrder={2} frustumCulled={false} />
    </group>
  );
}
