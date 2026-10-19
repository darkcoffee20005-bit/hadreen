'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
  type CanvasTexture,
  type Texture,
} from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { cssFontFamily } from '@/lib/invite/stage/textures';
import { cssFontVar } from '@/lib/invite/text3d/fonts';
import type { Lang } from '@/lib/lang';
import { flapOutline, pocketOutline, polygonGeometry } from '../geometry';
import { SPARK_FRAG, SPARK_VERT } from '../shaders';
import { cardTextures, envelopeTextures, letterTexture } from '../textures';
import { CARD_SIZE, CARD_TILT, ENVELOPE_SIZE } from '../world';

/** The display font's family, once the browser has it (canvas text must not draw in a fallback). */
export function useDisplayFamily(lang: Lang): string | null {
  const [family, setFamily] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const [variable, fallback] = cssFontVar(lang, 'display');
    const f = cssFontFamily(variable, fallback);
    const done = () => !cancelled && setFamily(f);
    if (typeof document === 'undefined' || !document.fonts) done();
    else document.fonts.load(`700 64px ${f}`).then(done, done);
    return () => {
      cancelled = true;
    };
  }, [lang]);
  return family;
}

/** The gate card's materials: paper with gilded wreath and monogram (metal where gold). */
export function useCardMaterial(monogram: string, family: string | null, paper: string, gold: string, onReady?: () => void) {
  const material = useMemo(() => {
    if (!family || typeof document === 'undefined') return null;
    const { map, metal } = cardTextures({ monogram, family }, paper, gold);
    return new MeshStandardMaterial({ map, metalnessMap: metal, metalness: 1, roughness: 0.42 });
  }, [monogram, family, paper, gold]);
  useEffect(() => {
    if (material) onReady?.();
    return () => {
      material?.map?.dispose();
      material?.metalnessMap?.dispose();
      material?.dispose();
    };
  }, [material, onReady]);
  return material;
}

export function GateCard({ material }: { material: MeshStandardMaterial | null }) {
  const geometry = useMemo(() => new BoxGeometry(CARD_SIZE[0], CARD_SIZE[1], 0.004), []);
  const edge = useMemo(() => new MeshStandardMaterial({ color: '#F3F7FB', roughness: 0.8 }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      edge.dispose();
    },
    [geometry, edge],
  );
  // Box faces: +x, −x, +y, −y, +z (front: the paper), −z.
  return <mesh geometry={geometry} material={material ? [edge, edge, edge, edge, material, edge] : edge} castShadow receiveShadow />;
}

/** The burst's sparks, foil flakes and the card's idle glints (one points draw). */
export function useSparks(count: number, gold: string, foil: string, dot: Texture | null) {
  const r = useMemo(() => {
    const rand = mulberry32(77);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('seed', new BufferAttribute(new Float32Array(count * 4).map(() => rand()), 4));
    const m = new ShaderMaterial({
      uniforms: {
        uT: { value: -1 },
        uGate: { value: 1 },
        uClock: { value: 0 },
        uScale: { value: 30 },
        uHalf: { value: new Vector2(CARD_SIZE[0] * 0.44, CARD_SIZE[1] * 0.41) },
        uTilt: { value: CARD_TILT },
        uDot: { value: dot },
        uGold: { value: new Color(gold) },
        uFoil: { value: new Color(foil) },
      },
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [count, gold, foil, dot]);
  useEffect(
    () => () => {
      r.geometry.dispose();
      r.material.dispose();
    },
    [r],
  );
  return r;
}

export interface EnvelopeParts {
  back: BufferGeometry;
  pocket: BufferGeometry;
  flap: BufferGeometry;
  letter: BoxGeometry;
  paper: MeshStandardMaterial;
  liner: MeshStandardMaterial;
  letterMat: MeshStandardMaterial;
  plain: MeshStandardMaterial;
  maps: CanvasTexture[];
}

/** The powder-blue envelope, its striped liner and the letter with its watercolour of the lake. */
export function useEnvelope(
  monogram: string,
  family: string | null,
  tones: { paper: string; gold: string; liner: string; rose: string; ink: string; powder: string; mountain: string; lake: string },
  onReady?: () => void,
): EnvelopeParts | null {
  const parts = useMemo(() => {
    if (!family || typeof document === 'undefined') return null;
    const [w, h] = ENVELOPE_SIZE;
    const env = envelopeTextures(tones.paper, tones.gold, tones.liner, tones.rose);
    const letterMap = letterTexture({ monogram, family }, { ink: tones.ink, gold: tones.gold, powder: tones.powder, mountain: tones.mountain, lake: tones.lake, rose: tones.rose });
    return {
      back: polygonGeometry([
        [-w / 2, -h / 2],
        [w / 2, -h / 2],
        [w / 2, h / 2],
        [-w / 2, h / 2],
      ]),
      pocket: polygonGeometry(pocketOutline(w, h)),
      flap: polygonGeometry(flapOutline(w, h)),
      letter: new BoxGeometry(w * 0.9, h * 0.92 * 1.0, 0.002),
      paper: new MeshStandardMaterial({ color: '#ffffff', map: env.map, roughness: 0.82, side: DoubleSide }),
      liner: new MeshStandardMaterial({ color: '#ffffff', map: env.linerMap, roughness: 0.7, side: DoubleSide }),
      letterMat: new MeshStandardMaterial({ color: '#ffffff', map: letterMap, roughness: 0.75 }),
      plain: new MeshStandardMaterial({ color: '#FCF9F2', roughness: 0.8 }),
      maps: [env.map, env.linerMap, letterMap],
    };
  }, [monogram, family, tones.paper, tones.gold, tones.liner, tones.rose, tones.ink, tones.powder, tones.mountain, tones.lake]);
  useEffect(() => {
    if (parts) onReady?.();
    return () => {
      if (!parts) return;
      for (const v of [parts.back, parts.pocket, parts.flap, parts.letter, parts.paper, parts.liner, parts.letterMat, parts.plain, ...parts.maps]) v.dispose();
    };
  }, [parts, onReady]);
  return parts;
}
