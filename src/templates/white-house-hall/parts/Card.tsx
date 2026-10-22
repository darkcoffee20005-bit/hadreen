'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, type CanvasTexture, type Group, type MeshBasicMaterial } from 'three';
import { tilt } from '@/lib/invite/interaction/tilt';
import { WaxSeal, type SealState } from '@/lib/invite/kit/WaxSeal';
import { useInviteStore } from '@/lib/invite/machine';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { CARD, DRAW, G, SEAL_Y } from '../camera';
import { cardTextures, drawingTexture, loadFonts, poolTexture, type CardText } from '../textures';
import { introState, smoothstep } from '../timeline';

export interface CardMaps {
  map: CanvasTexture;
  normal: CanvasTexture;
  drawing: CanvasTexture;
}

/** Builds the card's textures once the fonts are in. The drawing texture is shared with the façade. */
export function useCardMaps(text: Omit<CardText, 'display' | 'serif'> & { displayVar: string; serifVar: string }, k: number, drawingPx: number, paper: string, ink: string, hall: string, onReady: () => void) {
  const [maps, setMaps] = useState<CardMaps | null>(null);
  const { greeting, lead, names, date, displayVar, serifVar } = text;
  useEffect(() => {
    let cancelled = false;
    let built: CardMaps | null = null;
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue(displayVar).trim() || 'serif';
    const serif = css.getPropertyValue(serifVar).trim() || 'serif';
    void loadFonts([`700 ${Math.round(0.4 * k)}px ${display}`, `400 ${Math.round(0.12 * k)}px ${serif}`], `${names}${greeting}${lead}${date}${hall}`).then(() => {
      if (cancelled) return;
      const card = cardTextures(k, { greeting, lead, names, date, display, serif }, paper, ink, hall);
      built = { ...card, drawing: drawingTexture(drawingPx, hall, serif) };
      setMaps(built);
      onReady();
    });
    return () => {
      cancelled = true;
      if (built) Object.values(built).forEach((t) => t.dispose());
    };
  }, [greeting, lead, names, date, displayVar, serifVar, k, drawingPx, paper, ink, hall, onReady]);
  return maps;
}

/**
 * The gate: a letterpress card on deep black. The façade drawing is its own plane drawn over the
 * veil (renderOrder 901), so when the camera has leaned into it and the paper has whitened all
 * round, the drawing is the only thing left, exactly as its twin over the real façade.
 */
export function Card({
  maps,
  monogram,
  fontVar,
  director,
  ink,
  paper,
}: {
  maps: CardMaps | null;
  monogram: string;
  fontVar: string;
  director: Director;
  ink: string;
  paper: string;
}) {
  const store = useInviteStore();
  const group = useRef<Group>(null);
  const sealGroup = useRef<Group>(null);
  const seal = useRef<SealState>({ crack: 0, glint: 0 });
  const drawingMat = useRef<MeshBasicMaterial>(null);
  const pool = useMemo(() => (typeof document === 'undefined' ? null : poolTexture()), []);
  useEffect(() => () => pool?.dispose(), [pool]);
  const inkColor = useMemo(() => new Color(ink), [ink]);

  useFrame((state) => {
    const { capture, phase } = store.getState();
    const s = introState(director.time);
    const t = state.clock.elapsedTime;
    if (group.current) {
      const k = capture ? 0 : phase === 'opening' ? 1 - s.seal : 1;
      group.current.rotation.set(tilt.y * 0.06 * k, tilt.x * 0.08 * k, 0);
      group.current.visible = s.gate;
    }
    if (sealGroup.current) {
      const l = s.seal;
      sealGroup.current.position.set(0, SEAL_Y + l * 0.55, 0.035 + l * 2.2);
      sealGroup.current.rotation.set(-l * 0.9, 0, l * 0.25);
      sealGroup.current.visible = l < 0.999;
    }
    seal.current.crack = smoothstep(0.4, 1, s.seal);
    seal.current.glint = capture ? 0.35 : (t * 0.18) % 1;
    if (drawingMat.current) drawingMat.current.color.copy(inkColor);
  });

  return (
    <group position={G}>
      <mesh position={[0, 0, -1.6]}>
        <planeGeometry args={[60, 40]} />
        <meshBasicMaterial map={pool} color="#ffffff" />
      </mesh>
      <group ref={group}>
        <mesh>
          <boxGeometry args={[CARD.w, CARD.h, 0.014]} />
          <meshStandardMaterial color={maps ? '#ffffff' : paper} map={maps?.map ?? null} normalMap={maps?.normal ?? null} normalScale={[0.6, 0.6]} roughness={0.9} metalness={0} emissive={paper} emissiveIntensity={0.3} emissiveMap={maps?.map ?? null} />
        </mesh>
        {maps && (
          <mesh position={[0, DRAW.cy, 0.0075]} renderOrder={901}>
            <planeGeometry args={[DRAW.w, DRAW.h]} />
            <meshBasicMaterial ref={drawingMat} color={ink} alphaMap={maps.drawing} transparent depthTest={false} depthWrite={false} opacity={0.94} toneMapped={false} />
          </mesh>
        )}
        <group ref={sealGroup} position={[0, SEAL_Y, 0.035]}>
          <WaxSeal monogram={monogram} color="#161616" relief="#77736a" radius={0.27} state={seal} fontVar={fontVar} />
        </group>
      </group>
    </group>
  );
}
