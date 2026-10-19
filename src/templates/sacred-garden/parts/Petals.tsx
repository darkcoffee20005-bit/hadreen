'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, MeshStandardMaterial, Object3D, type InstancedMesh } from 'three';
import { useInviteStore } from '@/lib/invite/machine';
import { buildPetal } from '../geometry';
import { POOL, rng, smoothstep } from '../layout';

/**
 * Rose petals in one instanced draw: some drifting down through the golden light, the rest
 * floating on the pond. Motion is a pure function of time (fixed in capture mode).
 */
export function Petals({ air, floating, colors }: { air: number; floating: number; colors: string[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const store = useInviteStore();
  const count = air + floating;
  const geometry = useMemo(() => buildPetal(), []);
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: DoubleSide }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const seeds = useMemo(() => {
    const rand = rng(97);
    return Array.from({ length: count }, (_, i) => ({
      air: i < air,
      x: (rand() * 2 - 1) * 3.2,
      y: rand() * 5,
      z: -3.6 + rand() * 6.2,
      fz: POOL.zFar + 0.3 + rand() * 9.5,
      fx: (rand() * 2 - 1) * (POOL.x - 0.25),
      speed: 0.16 + rand() * 0.14,
      sway: 0.15 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      size: 0.032 + rand() * 0.02,
      tint: Math.floor(rand() * 64),
    }));
  }, [count, air]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    seeds.forEach((s, i) => m.setColorAt(i, c.set(colors[s.tint % colors.length]!)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds, colors]);

  const o = useMemo(() => new Object3D(), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = store.getState().capture ? 6 : state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      if (s.air) {
        const fall = (s.y + t * s.speed) % 5;
        const y = 5.4 - fall;
        o.position.set(s.x + Math.sin(t * 0.6 + s.phase) * s.sway + Math.sin(t * 0.13 + s.phase) * 0.4, y, s.z + Math.cos(t * 0.5 + s.phase) * s.sway * 0.6);
        o.rotation.set(t * 1.1 + s.phase, t * 0.7 + s.phase * 2, s.phase + Math.sin(t * 1.7 + s.phase) * 0.6);
        o.scale.setScalar(s.size * smoothstep(0.2, 0.7, y) * smoothstep(5.4, 4.9, y));
      } else {
        const span = POOL.x * 2 - 0.5;
        const x = ((((s.fx + t * 0.025 + Math.sin(t * 0.11 + s.phase) * 0.12 + POOL.x) % span) + span) % span) - POOL.x + 0.25;
        o.position.set(x, 0.006, s.fz + Math.sin(t * 0.09 + s.phase) * 0.1);
        o.rotation.set(-Math.PI / 2 + Math.sin(t * 0.8 + s.phase) * 0.06, 0, s.phase + t * 0.03);
        o.scale.setScalar(s.size * 1.1);
      }
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
