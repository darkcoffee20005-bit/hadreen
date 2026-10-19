'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, type Group, type ShaderMaterial } from 'three';
import { mixHex as mix } from '@/lib/invite/stage/color';
import { CHANDELIER, HANG } from '../camera';
import { candleGeometries, chandelierFrame, crystalGeometry } from '../geometry';
import { crystalLayout } from '../layout';
import { glowTexture, starTexture } from '../textures';
import { spriteGeometry, spriteMaterial } from './sprites';

export interface ChandelierRefs {
  pivot: React.RefObject<Group | null>;
  sparkle: ShaderMaterial;
  halo: ShaderMaterial;
  flames: MeshBasicMaterial;
}

/**
 * The crystal chandelier, hanging from the vault: a gilt frame (one merged mesh), ivory candles
 * with flames, and instanced faceted crystals. High tier: real transmission (glass that bends
 * the light behind it). Medium/low: mirror-faceted crystals lit by the environment, plus
 * twinkling star sprites — sparkle without bloom or transmission.
 */
export function useChandelier(count: number, transmission: boolean, low: boolean, crystal: string, gold: string, candle: string) {
  const chain = HANG[1] - CHANDELIER[1] - 1.34;
  const geo = useMemo(() => ({ frame: chandelierFrame(chain, low), crystal: crystalGeometry(), ...candleGeometries() }), [chain, low]);
  const crystals = useMemo(() => crystalLayout(count), [count]);
  const mats = useMemo(() => {
    const frame = new MeshStandardMaterial({ color: gold, metalness: 0.9, roughness: 0.28, emissive: gold, emissiveIntensity: 0.05 });
    const glass = transmission
      ? new MeshPhysicalMaterial({ color: crystal, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.25, ior: 1.6, dispersion: 0.6, envMapIntensity: 2.4, specularIntensity: 1 })
      : new MeshStandardMaterial({ color: crystal, metalness: 1, roughness: 0.04, envMapIntensity: 3.4, emissive: mix(crystal, '#ffd9c4', 0.3), emissiveIntensity: 0.62 });
    const sleeve = new MeshStandardMaterial({ color: '#fbf3e6', roughness: 0.55, emissive: '#ffd8a8', emissiveIntensity: 0.12 });
    const flames = new MeshBasicMaterial({ color: mix(candle, '#ffffff', 0.45), toneMapped: false });
    return { frame, glass, sleeve, flames };
  }, [transmission, crystal, gold, candle]);
  const sprites = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const star = starTexture();
    const glow = glowTexture();
    const sparkle = spriteMaterial(star, mix(crystal, '#ffffff', 0.4), 0);
    const halo = spriteMaterial(glow, mix(candle, '#fff1dd', 0.3), 1);
    const sparkleGeo = spriteGeometry(crystals.map((c) => ({ p: [c.p[0], c.p[1] - c.s * 0.7, c.p[2]] as [number, number, number], size: 0.2 + c.s * 2.6, phase: c.phase })));
    const pos = geo.flames.attributes.position!;
    // One halo per flame (centres of the merged flame spheres).
    const flamePts: { p: [number, number, number]; size: number; phase: number }[] = [];
    const per = pos.count / 14;
    for (let f = 0; f < 14; f++) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (let k = 0; k < per; k++) {
        x += pos.getX(f * per + k);
        y += pos.getY(f * per + k);
        z += pos.getZ(f * per + k);
      }
      flamePts.push({ p: [x / per, y / per, z / per], size: 0.34, phase: f * 1.7 });
    }
    return { star, glow, sparkle, halo, sparkleGeo, haloGeo: spriteGeometry(flamePts) };
  }, [crystal, candle, crystals, geo]);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      if (sprites) {
        sprites.star.dispose();
        sprites.glow.dispose();
        sprites.sparkle.dispose();
        sprites.halo.dispose();
        sprites.sparkleGeo.dispose();
        sprites.haloGeo.dispose();
      }
    },
    [geo, mats, sprites],
  );
  return { geo, crystals, mats, sprites };
}

export function Chandelier({ c, pivot }: { c: ReturnType<typeof useChandelier>; pivot: React.RefObject<Group | null> }) {
  const inst = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = inst.current;
    if (!m) return;
    const o = new Object3D();
    c.crystals.forEach((k, i) => {
      o.position.set(...k.p);
      o.rotation.set(k.squash < 0 ? Math.PI : 0, k.rot, 0);
      const sq = Math.abs(k.squash);
      o.scale.set(k.s * 1.15, k.s * sq * 1.4, k.s * 1.15);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [c.crystals]);
  return (
    <group ref={pivot} position={HANG}>
      <group position={[0, CHANDELIER[1] - HANG[1], 0]} scale={1.22}>
        <mesh geometry={c.geo.frame} material={c.mats.frame} />
        <mesh geometry={c.geo.sleeves} material={c.mats.sleeve} />
        <mesh geometry={c.geo.flames} material={c.mats.flames} />
        <instancedMesh ref={inst} args={[c.geo.crystal, c.mats.glass, c.crystals.length]} frustumCulled={false} />
        {c.sprites && <points geometry={c.sprites.haloGeo} material={c.sprites.halo} frustumCulled={false} renderOrder={8} />}
        {c.sprites && <points geometry={c.sprites.sparkleGeo} material={c.sprites.sparkle} frustumCulled={false} renderOrder={9} />}
      </group>
    </group>
  );
}
