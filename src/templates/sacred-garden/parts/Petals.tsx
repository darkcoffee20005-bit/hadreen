'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, DoubleSide, MeshStandardMaterial, Object3D, type InstancedMesh } from 'three';
import { useInviteStore } from '@/lib/invite/machine';
import { buildPetal } from '../geometry';
import { ARCH, FLOOR_Y, RAIL, rng, smoothstep } from '../layout';

/**
 * Rose petals in one instanced draw: some drifting down through the arch in the evening light,
 * the rest strewn on the marble floor. Motion is a pure function of time (fixed in capture mode).
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
      x: (rand() * 2 - 1) * 2.6,
      y: rand() * 6,
      z: RAIL.z + 0.4 + rand() * 5,
      // Floor petals gather near the balustrade and the rose bushes, thinning toward the camera.
      fz: RAIL.z + 0.35 + Math.pow(rand(), 1.8) * 4.2,
      fx: (rand() * 2 - 1) * (ARCH.a + 0.2) * (0.55 + rand() * 0.45),
      speed: 0.16 + rand() * 0.14,
      sway: 0.15 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      size: 0.045 + rand() * 0.03,
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
        const fall = (s.y + t * s.speed) % 6;
        const y = 6.4 - fall;
        o.position.set(s.x + Math.sin(t * 0.6 + s.phase) * s.sway + Math.sin(t * 0.13 + s.phase) * 0.4, FLOOR_Y + y, s.z + Math.cos(t * 0.5 + s.phase) * s.sway * 0.6);
        o.rotation.set(t * 1.1 + s.phase, t * 0.7 + s.phase * 2, s.phase + Math.sin(t * 1.7 + s.phase) * 0.6);
        o.scale.setScalar(s.size * smoothstep(0.05, 0.5, y) * smoothstep(6.4, 5.8, y));
      } else {
        o.position.set(s.fx, FLOOR_Y + 0.008, s.fz);
        o.rotation.set(-Math.PI / 2 + Math.sin(s.phase) * 0.15, 0, s.phase * 3);
        o.scale.setScalar(s.size * 1.3);
      }
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
