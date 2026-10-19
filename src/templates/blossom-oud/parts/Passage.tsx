'use client';

import { useEffect, useMemo } from 'react';
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry } from 'three';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { ARCH, archHalfWidth, HANG, WALL_DEPTH, WALL_FRONT } from '../camera';
import { archWallGeometry, voussoirGeometry } from '../geometry';
import { marbleTexture, zelligeTexture } from '../textures';
import { mergeAll } from './merge';

export interface PassagePalette {
  palace: string;
  satinDeep: string;
  gold: string;
  plum: string;
  palm: string;
  satin: string;
}

const BAND = 0.55;

/**
 * The gate wall: a thick plaster wall pierced by a horseshoe arch (its vault is the passage the
 * chandelier hangs in), rose-and-ivory voussoirs, a gilt alfiz frame, a zellige dado and a
 * rose-marble floor in large diamonds.
 */
export function Passage({ pal, low }: { pal: PassagePalette; low: boolean }) {
  const parts = useMemo(() => {
    const wall = archWallGeometry(26, 16, WALL_DEPTH, ARCH, low ? 28 : 48);
    const vous = voussoirGeometry(ARCH, BAND, 23, [mix(pal.palace, '#ffffff', 0.25), mix(pal.satinDeep, pal.palace, 0.12)]);
    const half = ARCH.r + BAND + 0.45;
    const top = ARCH.cy + ARCH.r + BAND + 0.5;
    const base = ARCH.cy - 1.25;
    const bar = 0.14;
    const gold = mergeAll([
      new BoxGeometry(bar, top - base, 0.08).translate(-half, (top + base) / 2, 0),
      new BoxGeometry(bar, top - base, 0.08).translate(half, (top + base) / 2, 0),
      new BoxGeometry(half * 2 + bar, bar, 0.08).translate(0, top, 0),
      new BoxGeometry(0.04, top - base - 0.3, 0.06).translate(-half + 0.26, (top + base) / 2 - 0.15, 0),
      new BoxGeometry(0.04, top - base - 0.3, 0.06).translate(half - 0.26, (top + base) / 2 - 0.15, 0),
      new BoxGeometry(half * 2 - 0.48, 0.04, 0.06).translate(0, top - 0.26, 0),
      // Imposts at the springing, and the ceiling rose the chandelier hangs from.
      new BoxGeometry(0.5, 0.14, 0.5).translate(-archHalfWidth() - 0.05, ARCH.cy - ARCH.r * Math.sin(ARCH.horseshoe) - 0.07, -0.25),
      new BoxGeometry(0.5, 0.14, 0.5).translate(archHalfWidth() + 0.05, ARCH.cy - ARCH.r * Math.sin(ARCH.horseshoe) - 0.07, -0.25),
      new CylinderGeometry(0.42, 0.3, 0.1, 20).translate(0, HANG[1] + 0.12, HANG[2] - WALL_FRONT),
    ]);
    const dado = new PlaneGeometry(1, 1);
    return { wall, vous, gold, dado };
  }, [pal.palace, pal.satinDeep, low]);
  const mats = useMemo(() => {
    const zel = typeof document === 'undefined' ? null : zelligeTexture({ ground: mix(pal.palace, '#ffffff', 0.2), star: mix(pal.satinDeep, pal.satin, 0.25), cross: mix(pal.palm, '#ffffff', 0.12), line: shade(pal.plum, 1.1) });
    const marble = typeof document === 'undefined' ? null : marbleTexture(mix(pal.palace, '#ffffff', 0.35), mix(pal.satin, pal.palace, 0.35), shade(pal.satinDeep, 0.8));
    if (zel) zel.repeat.set(10, 1);
    if (marble) marble.repeat.set(9, 9);
    return {
      zel,
      marble,
      wall: new MeshStandardMaterial({ color: pal.palace, roughness: 0.92 }),
      vous: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
      gold: new MeshStandardMaterial({ color: pal.gold, metalness: 0.88, roughness: 0.3, emissive: pal.gold, emissiveIntensity: 0.06 }),
      dado: new MeshStandardMaterial({ map: zel, roughness: 0.35, metalness: 0.05 }),
      floor: new MeshStandardMaterial({ map: marble, roughness: 0.18, metalness: 0.02, envMapIntensity: 0.9 }),
    };
  }, [pal]);
  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m?.dispose());
    },
    [parts, mats],
  );
  const jamb = archHalfWidth();
  const dadoW = 13 - jamb;
  return (
    <group>
      <mesh geometry={parts.wall} material={mats.wall} position={[0, 0, WALL_FRONT - WALL_DEPTH]} />
      <mesh geometry={parts.vous} material={mats.vous} position={[0, 0, WALL_FRONT]} />
      <mesh geometry={parts.gold} material={mats.gold} position={[0, 0, WALL_FRONT + 0.04]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={parts.dado} material={mats.dado} position={[s * (jamb + dadoW / 2), 0.62, WALL_FRONT + 0.006]} scale={[dadoW, 1.24, 1]} />
      ))}
      {/* Marble courtyard and passage floor. */}
      <mesh material={mats.floor} rotation-x={-Math.PI / 2} position={[0, 0.004, 7]}>
        <planeGeometry args={[26, 26]} />
      </mesh>
    </group>
  );
}
