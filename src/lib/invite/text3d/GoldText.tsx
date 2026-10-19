'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, type CanvasTexture, type Mesh, type MeshStandardMaterial } from 'three';
import type { Lang } from '@/lib/lang';
import { cssFontFamily, textTexture } from '../stage/textures';
import { cssFontVar, type TextRole } from './fonts';

interface Props {
  text: string;
  lang: Lang;
  role?: TextRole;
  /** World-space height of the text block. */
  height: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  position?: [number, number, number];
  materialRef?: React.Ref<MeshStandardMaterial>;
  onReady?: () => void;
}

/**
 * Text inside the 3D scene, shaped by the browser itself (so Aref Ruqaa's joins, ligatures and
 * dots are exactly as in the DOM) and drawn on a canvas used as an alpha map on a gold PBR plane.
 * Chosen over troika after the Phase 2 spike: see PLAN.md §17.
 * Every string shown here is also in the DOM.
 */
export function GoldText({
  text,
  lang,
  role = 'display',
  height,
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  opacity = 1,
  position = [0, 0, 0],
  materialRef,
  onReady,
}: Props) {
  const [tex, setTex] = useState<{ texture: CanvasTexture; aspect: number } | null>(null);
  const mesh = useRef<Mesh>(null);
  const [variable, fallback] = cssFontVar(lang, role);

  useEffect(() => {
    let cancelled = false;
    const family = cssFontFamily(variable, fallback);
    textTexture(text, { family, weight: role === 'display' ? 700 : 400, rtl: lang === 'ar', px: role === 'display' ? 180 : 120 }).then((t) => {
      if (cancelled) {
        t.texture.dispose();
        return;
      }
      setTex(t);
      onReady?.();
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang, role, variable, fallback, onReady]);

  useEffect(() => () => tex?.texture.dispose(), [tex]);

  const scale = useMemo<[number, number, number]>(() => [height * (tex?.aspect ?? 1), height, 1], [height, tex]);
  if (!tex) return null;
  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        metalness={0.85}
        roughness={0.32}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        alphaMap={tex.texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
