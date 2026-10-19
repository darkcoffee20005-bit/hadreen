'use client';

import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SpriteMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { landDots, LAND_LATTICE } from '@/lib/land-dots';
import { LAND_BITS } from '@/lib/land-dots.data';
import type { Tier } from '@/lib/invite/quality/tiers';
import { cloudTexture, glowTexture } from '../art';
import { cloudGeometry, dotsGeometry, globeGeometry, latticeSpacing, planeGeometry, starGeometry, trailGeometry } from '../geometry';
import { R, type Route } from '../route';
import * as S from '../shaders';

/**
 * The globe's building blocks as memoised geometry + material pairs (one draw call each), with
 * their GPU resources disposed when they change. The scene updates their uniforms per frame.
 */
export interface Palette {
  nightTop: string;
  nightLow: string;
  globe: string;
  globeShade: string;
  globeNight: string;
  landGold: string;
  landDeep: string;
  trail: string;
  atmosphere: string;
  pass: string;
  passInk: string;
  passAccent: string;
  gold: string;
  goldInk: string;
  inkSoft: string;
  onAccent: string;
  livery: string;
}

type U = Record<string, { value: unknown }>;
export type Uniforms<T extends string> = Record<T, { value: unknown }>;

function useDisposable<T extends { geometry: BufferGeometry | null; material: Material | null; extra?: (Texture | null)[] }>(make: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(make, deps);
  useEffect(
    () => () => {
      v.geometry?.dispose();
      v.material?.dispose();
      v.extra?.forEach((t) => t?.dispose());
    },
    [v],
  );
  return v;
}

const col = (hex: string) => new Color(hex);

export function useGlobe(tier: Tier, p: Palette) {
  return useDisposable(() => {
    const material = new ShaderMaterial({
      vertexShader: S.GLOBE_VERT,
      fragmentShader: S.GLOBE_FRAG,
      uniforms: {
        uLight: { value: new Vector3(0, 1, 0) },
        uDay: { value: col(p.globe) },
        uShade: { value: col(p.globeShade) },
        uNight: { value: col(p.globeNight) },
        uRim: { value: col(p.atmosphere) },
        uGrat: { value: col(p.landGold) },
        uGratK: { value: 0.2 },
        uRimK: { value: 0.55 },
      },
    });
    return { geometry: globeGeometry(tier), material };
  }, [tier, p]);
}

export function useDots(tier: Tier, p: Palette) {
  return useDisposable(() => {
    const { positions } = landDots(LAND_BITS[tier], tier, 1);
    const geometry = dotsGeometry(positions);
    const material = new ShaderMaterial({
      vertexShader: S.DOTS_VERT,
      fragmentShader: S.DOTS_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uRadius: { value: R + 0.004 },
        uSize: { value: latticeSpacing(LAND_LATTICE[tier]) * R * 0.66 },
        uSpacing: { value: latticeSpacing(LAND_LATTICE[tier]) * R },
        uLight: { value: new Vector3(0, 1, 0) },
        uGold: { value: col(p.landGold) },
        uGoldHi: { value: col('#FFF3D2') },
        uNightGlow: { value: col(p.trail).multiplyScalar(0.62) },
        uCity: { value: col('#FFE3A6') },
        uCityPos: { value: new Vector3() },
        uCityK: { value: 0 },
        uTime: { value: 0 },
        uTwinkle: { value: 1 },
      },
    });
    return { geometry, material };
  }, [tier, p]);
}

/** Medium/high: the analytic halo shell. */
export function useAtmosphere(p: Palette, thick = 0.4) {
  return useDisposable(() => {
    const material = new ShaderMaterial({
      vertexShader: S.ATMO_VERT,
      fragmentShader: S.ATMO_FRAG,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: col(p.atmosphere) },
        uLight: { value: new Vector3(0, 1, 0) },
        uR: { value: R },
        uThick: { value: thick },
        uK: { value: 0.85 },
      },
    });
    return { geometry: new SphereGeometry(R + thick, 64, 40), material };
  }, [p, thick]);
}

/** Low tier: a sprite halo behind the globe. */
export function useHalo(p: Palette) {
  return useDisposable(() => {
    const map = glowTexture(0.84, 0.9, 256);
    const material = new SpriteMaterial({ map, color: col(p.atmosphere), transparent: true, depthWrite: false, opacity: 0.55 });
    return { geometry: null, material, extra: [map] };
  }, [p]);
}

export function useTrail(route: Route, p: Palette, glow: boolean) {
  return useDisposable(() => {
    const material = new ShaderMaterial({
      vertexShader: S.TRAIL_VERT,
      fragmentShader: S.TRAIL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      side: DoubleSide,
      uniforms: {
        uWidth: { value: glow ? 0.009 : 0.005 },
        uPixel: { value: 0.001 },
        uMinPx: { value: glow ? 2.2 : 1.4 },
        uMaxPx: { value: glow ? 9 : 4 },
        uHead: { value: 0 },
        uTail: { value: route.virtual ? 0.22 : 0 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uGlow: { value: glow ? 1 : 0 },
        uColor: { value: col(p.trail).multiplyScalar(glow ? 1.25 : 1) },
        uEdge: { value: col(p.landDeep) },
        uCore: { value: col('#FFF7E2').multiplyScalar(glow ? 1.6 : 1) },
      },
    });
    return { geometry: trailGeometry(route), material };
  }, [route, p, glow]);
}

export function useClouds(route: Route, count: number, p: Palette) {
  return useDisposable(() => {
    if (count === 0) return { geometry: null, material: null };
    const map = cloudTexture();
    const material = new ShaderMaterial({
      vertexShader: S.CLOUD_VERT,
      fragmentShader: S.CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap: { value: map },
        uK: { value: 0 },
        uColor: { value: col('#FFFBF2') },
        uShadow: { value: col(p.globeShade) },
      },
    });
    return { geometry: cloudGeometry(route, count), material, extra: [map] };
  }, [route, count, p]);
}

export function useStars(count: number, p: Palette) {
  return useDisposable(() => {
    const material = new ShaderMaterial({
      vertexShader: S.STAR_VERT,
      fragmentShader: S.STAR_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uTw: { value: 1 },
        uPx: { value: 1 },
        uA: { value: col('#FFF6E4') },
        uB: { value: col(p.trail) },
      },
    });
    return { geometry: starGeometry(count), material };
  }, [count, p]);
}

export function useMarker(p: Palette, halo: string) {
  return useDisposable(() => {
    const material = new ShaderMaterial({
      vertexShader: S.MARKER_VERT,
      fragmentShader: S.MARKER_FRAG,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      uniforms: {
        uColor: { value: col(p.landDeep) },
        uHalo: { value: col(halo) },
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uOpacity: { value: 1 },
        uGlow: { value: 0 },
      },
    });
    return { geometry: new PlaneGeometry(1, 1), material };
  }, [p, halo]);
}

export function usePlane(p: Palette) {
  const v = useMemo(() => {
    const { body, trim } = planeGeometry();
    return {
      body,
      trim,
      paint: new MeshStandardMaterial({ color: col(p.livery), roughness: 0.28, metalness: 0.15, envMapIntensity: 1.2 }),
      gold: new MeshStandardMaterial({ color: col(p.landGold), roughness: 0.3, metalness: 1, envMapIntensity: 1.2 }),
    };
  }, [p.landGold, p.livery]);
  useEffect(
    () => () => {
      v.body.dispose();
      v.trim.dispose();
      v.paint.dispose();
      v.gold.dispose();
    },
    [v],
  );
  return v;
}

/** Soft glows: the wedding city's light (additive) and the plane's shadow on the porcelain. */
export function useGlows(p: Palette) {
  const v = useMemo(() => {
    const glow = glowTexture();
    return {
      glow,
      city: new SpriteMaterial({ map: glow, color: col('#FFE0A0'), blending: AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }),
      shadowGeo: new PlaneGeometry(1, 1),
      shadow: new MeshBasicMaterial({ color: col(p.nightTop), alphaMap: glow, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1 }),
    };
  }, [p.nightTop]);
  useEffect(
    () => () => {
      v.glow.dispose();
      v.city.dispose();
      v.shadowGeo.dispose();
      v.shadow.dispose();
    },
    [v],
  );
  return v;
}

export function uniforms(m: Material | null): U {
  return (m as ShaderMaterial | null)?.uniforms ?? {};
}
