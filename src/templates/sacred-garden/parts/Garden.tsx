'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { BufferGeometry, Material, Mesh } from 'three';
import { useInviteStore } from '@/lib/invite/machine';
import type { Tier } from '@/lib/invite/quality/tiers';
import type { Detail } from '../geometry';
import { swanPlacement } from '../layout';

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
      const bob = capture ? 0 : Math.sin(t * 1.1 + i * 1.9) * 0.012;
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
