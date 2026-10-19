'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, type Group, type MeshPhysicalMaterial } from 'three';
import { mulberry32 } from '../audio/dsp';
import { cssFontFamily, heightToNormal, monogramHeight, tintFromHeight } from '../stage/textures';

export interface SealState {
  /** 0 = whole, 1 = the two halves have flown apart and faded. */
  crack: number;
  /** 0..1 glint sweeping across the wax (idle). */
  glint: number;
}

/** A wax seal with an irregular poured rim and the couple's monogram pressed into it. */
export function WaxSeal({
  monogram,
  color,
  relief,
  radius = 0.32,
  state,
  fontVar = '--font-aref',
}: {
  monogram: string;
  color: string;
  /** Gild the pressed monogram and rings with this colour (e.g. gold dust rubbed into the relief). */
  relief?: string;
  radius?: number;
  state: React.RefObject<SealState>;
  fontVar?: string;
}) {
  const halves = [useRef<Group>(null), useRef<Group>(null)];
  const materials = [useRef<MeshPhysicalMaterial>(null), useRef<MeshPhysicalMaterial>(null)];

  // Two half-discs (so the seal can crack in two), with a wobbly poured-wax rim.
  const geometries = useMemo(() => {
    return [0, 1].map((side) => {
      const g = new CylinderGeometry(radius, radius * 1.04, radius * 0.22, 40, 1, false, side * Math.PI, Math.PI);
      const rand = mulberry32(17);
      const pos = g.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r = Math.hypot(x, z);
        if (r > radius * 0.9) {
          const a = Math.atan2(z, x);
          const wobble = 1 + 0.06 * Math.sin(a * 7) + 0.04 * Math.sin(a * 13 + 1.3) + (rand() - 0.5) * 0.02;
          pos.setX(i, x * wobble);
          pos.setZ(i, z * wobble);
        }
      }
      g.rotateX(Math.PI / 2); // face the camera
      g.computeVertexNormals();
      // Planar UVs across the face (the cylinder's own cap UVs are turned 90°).
      const uv = g.attributes.uv!;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (radius * 2.2) + 0.5, pos.getY(i) / (radius * 2.2) + 0.5);
      return g;
    });
  }, [radius]);

  const maps = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const height = monogramHeight(monogram, cssFontFamily(fontVar, 'serif'));
    return { normal: heightToNormal(height, 3), color: relief ? tintFromHeight(height, color, relief) : null };
  }, [monogram, fontVar, color, relief]);

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      maps?.normal.dispose();
      maps?.color?.dispose();
    },
    [geometries, maps],
  );

  useFrame(() => {
    const s = state.current;
    if (!s) return;
    const c = s.crack;
    halves.forEach((ref, i) => {
      const g = ref.current;
      if (!g) return;
      const dir = i === 0 ? 1 : -1;
      g.position.set(dir * c * 0.55, -c * c * 1.6, c * 0.35);
      g.rotation.set(c * 0.9, dir * c * 0.6, dir * c * 1.4);
    });
    materials.forEach((m) => {
      if (!m.current) return;
      m.current.opacity = 1 - Math.max(0, (c - 0.55) / 0.45);
      m.current.clearcoatRoughness = 0.25 + 0.2 * Math.sin(s.glint * Math.PI);
    });
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <group key={i} ref={halves[i]}>
          <mesh geometry={g} castShadow>
            <meshPhysicalMaterial
              ref={materials[i]}
              color={maps?.color ? '#ffffff' : color}
              map={maps?.color ?? null}
              roughness={0.42}
              clearcoat={0.7}
              clearcoatRoughness={0.3}
              sheen={0.4}
              sheenColor={color}
              normalMap={maps?.normal ?? null}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
