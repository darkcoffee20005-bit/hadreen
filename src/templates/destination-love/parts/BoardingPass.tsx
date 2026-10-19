'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { CanvasTexture, FrontSide, MeshStandardMaterial, NoColorSpace, SRGBColorSpace, type Group } from 'three';
import type { Lang } from '@/lib/lang';
import { passTextures, type PassColors } from '../art';
import { partGeometry } from '../geometry';
import { MAIN_SHARE, PASS_ASPECT, type PassContent } from '../pass';

export const PASS_WIDTH = 1.6;
export const PASS_HEIGHT = PASS_WIDTH / PASS_ASPECT;

export interface PassHandle {
  root: Group;
  hinge: Group;
  stub: Group;
  /** Stub materials (front, back), so the torn stub can fade. */
  stubMats: MeshStandardMaterial[];
  /** -1: the stub is on the left (Arabic); +1: on the right. */
  side: 1 | -1;
}

function placeholder(srgb: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  return t;
}

/**
 * The boarding pass in 3D: main part and stub (split at the perforation, the stub hinged on it),
 * each with a printed front and an emerald back. The scene poses `root`, and tears the stub.
 */
export const BoardingPass = forwardRef<PassHandle, { content: PassContent; lang: Lang; colors: PassColors; onReady: () => void }>(function BoardingPass(
  { content, lang, colors, onReady },
  ref,
) {
  const root = useRef<Group>(null);
  const hinge = useRef<Group>(null);
  const stub = useRef<Group>(null);
  const rtl = content.rtl;
  const W = PASS_WIDTH;
  const perfShare = rtl ? 1 - MAIN_SHARE : MAIN_SHARE;
  const perfX = -W / 2 + perfShare * W;
  const main: [number, number] = rtl ? [perfX, W / 2] : [-W / 2, perfX];
  const stubX: [number, number] = rtl ? [-W / 2, perfX] : [perfX, W / 2];
  const u = (x: number) => (x + W / 2) / W;

  const parts = useMemo(() => {
    const geo = (r: [number, number], back: boolean) =>
      partGeometry(r[1] - r[0], PASS_HEIGHT, back ? 1 - u(r[1]) : u(r[0]), back ? 1 - u(r[0]) : u(r[1]));
    const front = new MeshStandardMaterial({
      map: placeholder(true),
      roughnessMap: placeholder(false),
      metalnessMap: placeholder(false),
      roughness: 1,
      metalness: 1,
      transparent: true,
      alphaTest: 0.04,
      side: FrontSide,
      envMapIntensity: 1.15,
    });
    const back = new MeshStandardMaterial({ map: placeholder(true), roughness: 0.6, metalness: 0, transparent: true, alphaTest: 0.04, side: FrontSide });
    return {
      mainFront: geo(main, false),
      mainBack: geo(main, true),
      stubFront: geo(stubX, false),
      stubBack: geo(stubX, true),
      front,
      back,
      stubFrontMat: front.clone(),
      stubBackMat: back.clone(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtl]);

  useEffect(() => {
    let cancelled = false;
    let made: Awaited<ReturnType<typeof passTextures>> | null = null;
    passTextures(content, lang, colors).then((t) => {
      if (cancelled) {
        Object.values(t).forEach((x) => x.dispose());
        return;
      }
      made = t;
      for (const m of [parts.front, parts.stubFrontMat]) {
        m.map = t.front;
        m.roughnessMap = t.surface;
        m.metalnessMap = t.surface;
      }
      for (const m of [parts.back, parts.stubBackMat]) m.map = t.back;
      onReady();
    });
    return () => {
      cancelled = true;
      if (made) Object.values(made).forEach((x) => x.dispose());
    };
  }, [content, lang, colors, parts, onReady]);

  useEffect(
    () => () => {
      const { front, back, stubFrontMat, stubBackMat, ...geos } = parts;
      Object.values(geos).forEach((g) => g.dispose());
      [front, back].forEach((m) => {
        m.map?.dispose();
        m.roughnessMap?.dispose();
        m.dispose();
      });
      stubFrontMat.dispose();
      stubBackMat.dispose();
    },
    [parts],
  );

  useImperativeHandle(
    ref,
    () => ({ root: root.current!, hinge: hinge.current!, stub: stub.current!, stubMats: [parts.stubFrontMat, parts.stubBackMat], side: rtl ? (-1 as const) : (1 as const) }),
    [parts, rtl],
  );

  const mainCx = (main[0] + main[1]) / 2;
  const stubCx = (stubX[0] + stubX[1]) / 2;
  return (
    <group ref={root} visible={false}>
      <group position={[mainCx, 0, 0]}>
        <mesh geometry={parts.mainFront} material={parts.front} renderOrder={8} />
        <mesh geometry={parts.mainBack} material={parts.back} rotation-y={Math.PI} renderOrder={8} />
      </group>
      <group ref={hinge} position={[perfX, 0, 0]}>
        <group ref={stub}>
          <group position={[stubCx - perfX, 0, 0]}>
            <mesh geometry={parts.stubFront} material={parts.stubFrontMat} renderOrder={8} />
            <mesh geometry={parts.stubBack} material={parts.stubBackMat} rotation-y={Math.PI} renderOrder={8} />
          </group>
        </group>
      </group>
    </group>
  );
});
