'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, Euler, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, type InstancedMesh } from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { leafGeometry, petalGeometry } from '../geometry';
import type { Bloom, Leaf } from '../layout';

const PETALS = 5;
const STAMENS = 7;

/**
 * A small bouquet of white five-petalled flowers with a closed bud and pointed leaves: three
 * instanced meshes (petals, leaves, stamens) whatever its size. Positions are in the cluster's
 * own frame; the parent group places, scales and sways it.
 */
export function Flowers({ blooms, leaves, petal, leaf }: { blooms: Bloom[]; leaves: Leaf[]; petal: string; leaf: string }) {
  const petals = useRef<InstancedMesh>(null);
  const leafMesh = useRef<InstancedMesh>(null);
  const stamens = useRef<InstancedMesh>(null);

  const geo = useMemo(
    () => ({
      petal: petalGeometry(0.16, 0.115, 0.026, mixHex(leaf, '#F4F2DC', 0.82), '#FFFFFF'),
      leaf: leafGeometry(1, 0.26, leaf, mixHex(leaf, '#C9D3A8', 0.45)),
      stamen: new SphereGeometry(1, 8, 6),
    }),
    [leaf],
  );
  const mats = useMemo(
    () => ({
      petal: new MeshPhysicalMaterial({ color: petal, vertexColors: true, roughness: 0.62, sheen: 0.8, sheenColor: '#ffffff', sheenRoughness: 0.5, side: DoubleSide }),
      leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0, side: DoubleSide }),
      stamen: new MeshStandardMaterial({ color: '#D7CF8E', roughness: 0.6, emissive: '#6F6A2E', emissiveIntensity: 0.15 }),
    }),
    [petal],
  );
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  const counts = useMemo(() => {
    let p = 0;
    let s = 0;
    for (const b of blooms) {
      p += b.bud ? 3 : PETALS;
      s += b.bud ? 0 : STAMENS + 1;
    }
    return { petals: p, stamens: s, leaves: leaves.length };
  }, [blooms, leaves]);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const v = new Vector3();
    const sc = new Vector3();
    const flower = new Matrix4();
    const local = new Matrix4();
    let pi = 0;
    let si = 0;
    for (const b of blooms) {
      // The flower's own frame: placed, turned about its axis, its face tilted back a little.
      flower.compose(v.set(b.x, b.y, b.z), q.setFromEuler(e.set(b.tilt * 0.6, b.tilt * 0.3, b.spin)), sc.setScalar(b.size));
      if (b.bud) {
        for (let i = 0; i < 3; i++) {
          // Three petals wrapped closed into a teardrop pointing along +y, their hollows inwards.
          local.compose(v.set(0, 0, 0), q.setFromEuler(e.set(0.38, (i / 3) * Math.PI * 2 + Math.PI, 0, 'YXZ')), sc.set(0.62, 1.2, 1));
          petals.current?.setMatrixAt(pi++, m.multiplyMatrices(flower, local));
        }
        continue;
      }
      for (let i = 0; i < PETALS; i++) {
        const a = (i / PETALS) * Math.PI * 2 + (i % 2) * 0.06;
        local.compose(v.set(0, 0, 0.004 * (i % 2)), q.setFromEuler(e.set(0.2 + 0.06 * (i % 3), 0, a, 'ZXY')), sc.set(1, 0.94 + 0.08 * ((i * 7) % 3) / 2, 1));
        petals.current?.setMatrixAt(pi++, m.multiplyMatrices(flower, local));
      }
      local.compose(v.set(0, 0, 0.018), q.identity(), sc.setScalar(0.017));
      stamens.current?.setMatrixAt(si++, m.multiplyMatrices(flower, local));
      for (let i = 0; i < STAMENS; i++) {
        const a = (i / STAMENS) * Math.PI * 2;
        local.compose(v.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.03), q.identity(), sc.setScalar(0.0075));
        stamens.current?.setMatrixAt(si++, m.multiplyMatrices(flower, local));
      }
    }
    leaves.forEach((l, i) => {
      local.compose(v.set(l.x, l.y, l.z), q.setFromEuler(e.set(l.roll, 0, l.angle, 'ZYX')), sc.setScalar(l.length));
      leafMesh.current?.setMatrixAt(i, local);
    });
    for (const mesh of [petals.current, stamens.current, leafMesh.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [blooms, leaves, counts]);

  return (
    <group>
      <instancedMesh ref={leafMesh} args={[geo.leaf, mats.leaf, counts.leaves]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={petals} args={[geo.petal, mats.petal, counts.petals]} castShadow receiveShadow frustumCulled={false} />
      {counts.stamens > 0 && <instancedMesh ref={stamens} args={[geo.stamen, mats.stamen, counts.stamens]} frustumCulled={false} />}
    </group>
  );
}
