'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  type Group,
  LatheGeometry,
  type Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  type Texture,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Lang } from '@/lib/lang';
import { mixHex } from '@/lib/invite/stage/color';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { archOffset, pointedArch, wallOutline, type P2 } from '../geometry';
import { marbleTextures, WALL, wallTextures, type WallPalette } from '../textures';
import { introState } from '../timeline';

export const WALL_DEPTH = 1.0;
const COLUMN_X = WALL.archWidth / 2 + 0.14;

const tube = (pts: P2[], z: number, r: number) =>
  new TubeGeometry(new CatmullRomCurve3(pts.map(([x, y]) => new Vector3(x, y, z)), false, 'centripetal', 0.5), 220, r, 8, false);

/**
 * S2/S3: the arch hall. An ivory wall with a pointed arch cut through it, carved and gilded in
 * the texture (zellige dado and alfiz, ablaq voussoirs, medallions, niches, inscription frieze),
 * gold trim, engaged columns with gilded capitals, a marble courtyard and the couple's names in
 * gold on the frieze.
 */
export function ArchHall({
  palette: p,
  lowTier,
  texScale,
  director,
  names,
  lang,
  onTextReady,
  away,
  goldText,
}: {
  palette: WallPalette;
  lowTier: boolean;
  texScale: number;
  director: Director;
  names: string;
  lang: Lang;
  onTextReady: () => void;
  away: React.RefObject<number>;
  goldText: { color: string; emissive: string };
}) {
  const nameGroup = useRef<Group>(null);
  const nameMat = useRef<MeshStandardMaterial>(null);

  const geo = useMemo(() => {
    const outline = wallOutline({ width: WALL.width, height: WALL.height, archWidth: WALL.archWidth, spring: WALL.spring, apex: WALL.apex, merlon: 1.05 });
    const wall = new ExtrudeGeometry(new Shape(outline.map(([x, y]) => new Vector2(x, y))), { depth: WALL_DEPTH, bevelEnabled: false });
    const trim = mergeGeometries([
      tube(pointedArch(WALL.archWidth, WALL.spring, WALL.apex, 40), 0.03, 0.05),
      tube(archOffset(WALL.archWidth, WALL.spring, WALL.apex, 0.43, 40), 0.02, 0.028),
    ])!;
    // Engaged columns: marble shafts, gilded bases and capitals.
    const shafts: CylinderGeometry[] = [];
    const gilt: LatheGeometry[] = [];
    const capital = [
      [0.13, 0],
      [0.16, 0.04],
      [0.15, 0.08],
      [0.17, 0.2],
      [0.24, 0.3],
      [0.25, 0.36],
      [0.0, 0.36],
    ].map(([r, y]) => new Vector2(r, y));
    const base = [
      [0.0, 0],
      [0.22, 0],
      [0.22, 0.08],
      [0.17, 0.14],
      [0.16, 0.22],
      [0.12, 0.3],
    ].map(([r, y]) => new Vector2(r, y));
    for (const side of [-1, 1]) {
      const s = new CylinderGeometry(0.105, 0.115, WALL.spring - 0.62, 20);
      s.translate(side * COLUMN_X, 0.3 + (WALL.spring - 0.62) / 2, 0.16);
      shafts.push(s);
      const c = new LatheGeometry(capital, 20);
      c.translate(side * COLUMN_X, WALL.spring - 0.34, 0.16);
      const b = new LatheGeometry(base, 20);
      b.translate(side * COLUMN_X, 0, 0.16);
      gilt.push(c, b);
    }
    const g = {
      wall,
      trim,
      shafts: mergeGeometries(shafts)!,
      gilt: mergeGeometries(gilt)!,
      floor: new PlaneGeometry(30, 60),
    };
    shafts.forEach((x) => x.dispose());
    gilt.forEach((x) => x.dispose());
    return g;
  }, []);

  const mats = useMemo(() => {
    let wallTex: { map: Texture; mr: Texture } | null = null;
    let marble: { map: Texture; mr: Texture } | null = null;
    if (typeof document !== 'undefined') {
      wallTex = wallTextures(
        p,
        {
          width: WALL.width,
          height: WALL.texHeight,
          archWidth: WALL.archWidth,
          spring: WALL.spring,
          apex: WALL.apex,
          bakedGobo: lowTier
            ? [
                [-3.05, 4.6],
                [3.05, 4.6],
              ]
            : null,
        },
        texScale,
      );
      for (const t of [wallTex.map, wallTex.mr]) {
        t.repeat.set(1 / WALL.width, 1 / WALL.texHeight);
        t.offset.set(0.5, 0);
      }
      marble = marbleTextures(p, lowTier ? 512 : 1024);
      for (const t of [marble.map, marble.mr]) t.repeat.set(15, 30);
    }
    return {
      face: new MeshStandardMaterial({ color: '#ffffff', map: wallTex?.map ?? null, roughnessMap: wallTex?.mr ?? null, metalnessMap: wallTex?.mr ?? null, roughness: 1, metalness: 1 }),
      side: new MeshStandardMaterial({ color: mixHex(p.ivoryWarm, p.ivory, 0.4), roughness: 0.92 }),
      gold: new MeshStandardMaterial({ color: p.gold, metalness: 1, roughness: 0.27, emissive: p.goldDeep, emissiveIntensity: lowTier ? 0.35 : 0.12 }),
      marble: new MeshStandardMaterial({ color: mixHex(p.ivory, '#ffffff', 0.3), roughness: 0.35, metalness: 0.05 }),
      floor: new MeshStandardMaterial({ color: '#e9e2d4', map: marble?.map ?? null, roughnessMap: marble?.mr ?? null, metalnessMap: marble?.mr ?? null, roughness: 1, metalness: 1 }),
    };
  }, [p, lowTier, texScale]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => {
        m.map?.dispose();
        m.roughnessMap?.dispose();
        m.dispose();
      });
    },
    [geo, mats],
  );

  useFrame(() => {
    const s = introState(director.time);
    const k = s.names * (1 - (away.current ?? 0));
    const g = nameGroup.current;
    if (g) {
      const mesh = g.children[0] as Mesh | undefined;
      const fit = mesh ? Math.min(1, 6.0 / Math.max(0.01, mesh.scale.x)) : 1;
      g.scale.setScalar(fit * (1.05 - 0.05 * s.names));
      g.visible = k > 0.005;
    }
    if (nameMat.current) {
      nameMat.current.opacity = k;
      nameMat.current.emissiveIntensity = 0.25 + 1.4 * (1 - s.names);
    }
  });

  return (
    <group>
      <mesh geometry={geo.wall} material={[mats.face, mats.side]} position-z={-WALL_DEPTH} receiveShadow />
      <mesh geometry={geo.trim} material={mats.gold} />
      <mesh geometry={geo.shafts} material={mats.marble} receiveShadow />
      <mesh geometry={geo.gilt} material={mats.gold} />
      <mesh geometry={geo.floor} material={mats.floor} rotation-x={-Math.PI / 2} position={[0, 0, 30]} receiveShadow />
      <group ref={nameGroup} position={[0, (WALL.frieze.y0 + WALL.frieze.y1) / 2, 0.05]}>
        <GoldText text={names} lang={lang} height={0.82} color={goldText.color} emissive={goldText.emissive} emissiveIntensity={0.3} materialRef={nameMat} onReady={onTextReady} />
      </group>
    </group>
  );
}
