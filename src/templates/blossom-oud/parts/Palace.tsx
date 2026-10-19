'use client';

import { useEffect, useMemo } from 'react';
import { BoxGeometry, Color, CylinderGeometry, ExtrudeGeometry, LatheGeometry, MeshStandardMaterial, ShaderMaterial, Shape, ShapeGeometry, Vector2, type BufferGeometry } from 'three';
import type { Lang } from '@/lib/lang';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { NAMES_Y, PALACE_Z } from '../camera';
import { archArc, archWallGeometry, frameGeometry, voussoirGeometry, type ArchSpec } from '../geometry';
import { FitGoldText } from './FitGoldText';
import { mergeAll } from './merge';

export interface PalacePalette {
  palace: string;
  satinDeep: string;
  gold: string;
  plum: string;
  oud: string;
  lamp: string;
}

export const GATE_ARCH: ArchSpec = { r: 2.1, cy: 5.0, horseshoe: (20 * Math.PI) / 180 };
const BLOCK = { w: 14, h: 11.6, d: 3 };
const TOWER = { x: 8.7, w: 3.4, h: 15.2, d: 4 };

/** Stepped Andalusian merlons along a parapet from x0 to x1 at height y. */
function merlons(x0: number, x1: number, y: number, z: number, step = 1.05): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  const s = new Shape();
  const w = 0.62;
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, 0.42);
  s.lineTo(w / 4, 0.42);
  s.lineTo(w / 4, 0.68);
  s.lineTo(0.08, 0.68);
  s.lineTo(0, 0.86);
  s.lineTo(-0.08, 0.68);
  s.lineTo(-w / 4, 0.68);
  s.lineTo(-w / 4, 0.42);
  s.lineTo(-w / 2, 0.42);
  s.closePath();
  const n = Math.max(1, Math.floor((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const g = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
    out.push(g.translate(x0 + ((x1 - x0) * i) / n, y, z));
  }
  return out;
}

function archShape(a: ArchSpec): Shape {
  const s = new Shape();
  const arc = archArc(a, 32);
  s.moveTo(arc[0]![0], 0);
  for (const [x, y] of arc) s.lineTo(x, y);
  s.lineTo(arc[arc.length - 1]![0], 0);
  s.closePath();
  return s;
}

const GLOW_FRAG = /* glsl */ `
uniform vec3 uWood; uniform vec3 uLamp; uniform vec3 uGold; uniform float uK; uniform float uDoor;
varying vec2 vP;
void main(){
  vec3 col;
  if (uDoor > 0.5) {
    // Two leaves of oud wood pierced with an eight-point star lattice, lamplight behind.
    vec2 q = vP * 2.2;
    vec2 c = fract(q) - 0.5;
    float d = max(abs(c.x), abs(c.y));
    float d2 = (abs(c.x) + abs(c.y)) * 0.7071;
    float star = max(d, d2);
    float hole = smoothstep(0.3, 0.26, star) * smoothstep(0.08, 0.12, star);
    float seam = smoothstep(0.06, 0.0, abs(vP.x));
    float stud = smoothstep(0.06, 0.03, length(c));
    float glow = (hole * 0.9 + seam * 1.2) * uK;
    col = uWood * (0.55 + 0.25 * stud) + uLamp * glow + uGold * stud * 0.35;
  } else {
    col = uLamp * (0.55 + 0.45 * uK) * (0.75 + 0.25 * smoothstep(0.0, 1.5, vP.y));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function glowMaterial(pal: PalacePalette, door: boolean) {
  return new ShaderMaterial({
    uniforms: { uWood: { value: new Color(shade(pal.oud, 0.8)) }, uLamp: { value: new Color(pal.lamp) }, uGold: { value: new Color(pal.gold) }, uK: { value: 1 }, uDoor: { value: door ? 1 : 0 } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: GLOW_FRAG,
    fog: false,
  });
}

/**
 * Plaster washed by the lamplight pouring from the gate (a warm pool around the doorway) and
 * settling into plum at its foot: cheap, and it reads on the low tier without bloom.
 */
function lampLitPlaster(color: string, lamp: string, plum: string): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness: 0.9 });
  const warm = new Color(lamp);
  const foot = new Color(plum);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWarm = { value: warm };
    shader.uniforms.uFoot = { value: foot };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uWarm; uniform vec3 uFoot; varying vec3 vLp;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uFoot * 2.2, (1.0 - smoothstep(0.0, 3.5, vLp.y)) * 0.35);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec2 dg = (vLp.xy - vec2(0.0, 3.6)) / vec2(4.6, 4.2);
         totalEmissiveRadiance += uWarm * exp(-dot(dg, dg)) * 0.28 * step(-0.6, vLp.z);`,
      );
  };
  m.customProgramCacheKey = () => 'bo-plaster';
  return m;
}

/**
 * The palace at the end of the avenue: a gate block pierced by a horseshoe arch (voussoirs, a
 * gilt alfiz, lamplit lattice doors), towers with lit windows, stepped merlons, a pointed dome,
 * and a plum cartouche above the gate where the couple's names appear in gold.
 */
export function usePalace(pal: PalacePalette, low: boolean) {
  const geo = useMemo(() => {
    const parts: BufferGeometry[] = [];
    parts.push(archWallGeometry(BLOCK.w, BLOCK.h, BLOCK.d, GATE_ARCH, low ? 20 : 36).translate(0, 0, -BLOCK.d));
    for (const s of [-1, 1]) {
      parts.push(new BoxGeometry(TOWER.w, TOWER.h, TOWER.d).translate(s * TOWER.x, TOWER.h / 2, -TOWER.d / 2 + 0.25));
      parts.push(new BoxGeometry(TOWER.w + 0.3, 0.3, TOWER.d + 0.3).translate(s * TOWER.x, TOWER.h - 0.15, -TOWER.d / 2 + 0.25));
      parts.push(...merlons(s * TOWER.x - TOWER.w / 2 + 0.35, s * TOWER.x + TOWER.w / 2 - 0.35, TOWER.h, 0.1, 0.95));
      parts.push(new BoxGeometry(22, 6.4, 1).translate(s * (TOWER.x + TOWER.w / 2 + 11), 3.2, -1.5));
      parts.push(...merlons(s * (TOWER.x + TOWER.w / 2 + 0.5), s * (TOWER.x + TOWER.w / 2 + 21.5), 6.4, -1.15, 1.2));
    }
    parts.push(...merlons(-BLOCK.w / 2 + 0.4, BLOCK.w / 2 - 0.4, BLOCK.h, -0.3));
    parts.push(new BoxGeometry(BLOCK.w + 0.3, 0.25, 0.4).translate(0, BLOCK.h - 0.12, -0.15));
    // Drum and a pointed dome behind the gate block.
    parts.push(new CylinderGeometry(3.0, 3.0, 1.6, low ? 20 : 36).translate(0, BLOCK.h + 0.8, -BLOCK.d - 3.2));
    const dome = [] as Vector2[];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const a = (t * Math.PI) / 2;
      dome.push(new Vector2(3.05 * Math.cos(a) * (1 - 0.12 * t * t), 3.6 * Math.sin(a) + 0.6 * t * t * t));
    }
    parts.push(new LatheGeometry(dome, low ? 20 : 36).translate(0, BLOCK.h + 1.6, -BLOCK.d - 3.2));
    const plaster = mergeAll(parts);

    const half = GATE_ARCH.r + 0.45 + 0.4;
    const top = GATE_ARCH.cy + GATE_ARCH.r + 0.45 + 0.42;
    const base = GATE_ARCH.cy - 1.0;
    const finial = [
      [0.001, 0],
      [0.12, 0.05],
      [0.06, 0.25],
      [0.2, 0.45],
      [0.05, 0.7],
      [0.12, 0.9],
      [0.001, 1.5],
    ].map(([r, y]) => new Vector2(r!, y!));
    const gold = mergeAll([
      new BoxGeometry(0.12, top - base, 0.08).translate(-half, (top + base) / 2, 0.05),
      new BoxGeometry(0.12, top - base, 0.08).translate(half, (top + base) / 2, 0.05),
      new BoxGeometry(half * 2 + 0.12, 0.12, 0.08).translate(0, top, 0.05),
      frameGeometry(11.0, 2.05, 0.09, 0.06).translate(0, NAMES_Y - 1.02, 0.05),
      new LatheGeometry(finial, 10).translate(0, BLOCK.h + 1.6 + 4.2, -BLOCK.d - 3.2),
    ]);
    const vous = voussoirGeometry(GATE_ARCH, 0.45, 19, [mix(pal.palace, '#ffffff', 0.25), mix(pal.satinDeep, pal.palace, 0.12)]);
    const door = new ShapeGeometry(archShape(GATE_ARCH), 24);
    // Windows: small horseshoe arches on the towers.
    const win: BufferGeometry[] = [];
    const wa: ArchSpec = { r: 0.42, cy: 0, horseshoe: 0.3 };
    for (const s of [-1, 1]) {
      for (const y of [8.6, 12.2]) win.push(new ShapeGeometry(archShape(wa), 10).translate(s * TOWER.x, y, 0.27));
      for (const x of [-5.2, 5.2]) if (s > 0) win.push(new ShapeGeometry(archShape(wa), 10).scale(0.9, 0.9, 1).translate(x, 4.2, 0.01));
    }
    const windows = mergeAll(win);
    const cartouche = new BoxGeometry(10.9, 1.95, 0.05).translate(0, NAMES_Y, 0.02);
    return { plaster, gold, vous, door, windows, cartouche };
  }, [pal.palace, pal.satinDeep, low]);
  const mats = useMemo(
    () => ({
      plaster: lampLitPlaster(pal.palace, pal.lamp, pal.plum),
      gold: new MeshStandardMaterial({ color: pal.gold, metalness: 0.85, roughness: 0.3, emissive: pal.gold, emissiveIntensity: 0.12 }),
      vous: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
      door: glowMaterial(pal, true),
      windows: glowMaterial(pal, false),
      cartouche: new MeshStandardMaterial({ color: shade(mix(pal.plum, pal.oud, 0.3), 0.95), roughness: 0.6 }),
    }),
    [pal],
  );
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );
  return { geo, mats };
}

export function Palace({
  p,
  names,
  lang,
  gold,
  namesMat,
  onReady,
}: {
  p: ReturnType<typeof usePalace>;
  names: string;
  lang: Lang;
  gold: string;
  namesMat: React.Ref<MeshStandardMaterial>;
  onReady: () => void;
}) {
  return (
    <group position={[0, 0, PALACE_Z]}>
      <mesh geometry={p.geo.plaster} material={p.mats.plaster} />
      <mesh geometry={p.geo.gold} material={p.mats.gold} />
      <mesh geometry={p.geo.vous} material={p.mats.vous} />
      <mesh geometry={p.geo.door} material={p.mats.door} position={[0, 0, -1.4]} />
      <mesh geometry={p.geo.windows} material={p.mats.windows} />
      <mesh geometry={p.geo.cartouche} material={p.mats.cartouche} />
      <FitGoldText
        text={names}
        lang={lang}
        height={1.62}
        maxWidth={9.8}
        color={mix(gold, '#f8e6b8', 0.35)}
        emissive={gold}
        emissiveIntensity={0.75}
        opacity={0}
        position={[0, NAMES_Y + 0.02, 0.1]}
        materialRef={namesMat}
        onReady={onReady}
      />
    </group>
  );
}
