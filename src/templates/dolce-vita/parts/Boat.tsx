'use client';

import { useEffect, useMemo, forwardRef } from 'react';
import { CylinderGeometry, DoubleSide, MeshStandardMaterial, type Group } from 'three';
import { hullGeometry, sailGeometry } from '../geometry';

/**
 * A small white sloop: lofted hull, mast, mainsail and jib. Its group is moved by the scene
 * (glide, drift, bob); local +x is the bow, so the scene turns it to sail toward −x.
 */
export const Boat = forwardRef<Group, { ink: string; gold: string }>(function Boat({ ink, gold }, ref) {
  const r = useMemo(() => {
    const hull = hullGeometry();
    const mast = new CylinderGeometry(0.012, 0.016, 1, 6).translate(0, 0.5, 0);
    const main = sailGeometry(1, 0.42, 0.04);
    const jib = sailGeometry(0.86, 0.36, 0.03);
    const white = new MeshStandardMaterial({ color: '#FBFAF6', roughness: 0.45 });
    const sail = new MeshStandardMaterial({ color: '#FFFDF8', roughness: 0.85, side: DoubleSide, emissive: '#FFF6E8', emissiveIntensity: 0.18 });
    const navy = new MeshStandardMaterial({ color: ink, roughness: 0.5 });
    const brass = new MeshStandardMaterial({ color: gold, roughness: 0.35, metalness: 0.8 });
    return { hull, mast, main, jib, white, sail, navy, brass };
  }, [ink, gold]);
  useEffect(() => () => Object.values(r).forEach((v) => v.dispose()), [r]);

  return (
    <group ref={ref}>
      <group scale={[7, 7, 7]}>
        <mesh geometry={r.hull} material={r.white} />
        {/* A navy boot stripe: the hull again, a hair larger and lower. */}
        <mesh geometry={r.hull} material={r.navy} scale={[1.01, 0.5, 1.03]} position-y={-0.045} />
        <mesh geometry={r.mast} material={r.brass} position={[0.08, 0, 0]} scale={[1, 1.05, 1]} />
        {/* Mainsail aft of the mast (toward −x), jib from the masthead to the bow. */}
        <mesh geometry={r.main} material={r.sail} position={[0.075, 0.07, 0]} rotation={[0, Math.PI - 0.18, 0]} />
        <mesh geometry={r.jib} material={r.sail} position={[0.09, 0.08, 0]} rotation={[0, 0.25, 0]} scale={[1.05, 1, 1]} />
      </group>
    </group>
  );
});
