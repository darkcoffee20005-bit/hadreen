'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BackSide,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  type Group,
  type Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  TorusGeometry,
  type Texture,
} from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { useInviteStore } from '@/lib/invite/machine';
import { mixHex } from '@/lib/invite/stage/color';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { cssFontFamily, heightToNormal, monogramHeight, tintFromHeight } from '@/lib/invite/stage/textures';
import { flapOutline, insetPolygon, type P2 } from '../geometry';
import { patchMaterial, type SweepUniforms } from '../materials';
import { cardTexture, MASK, starTile, tex } from '../textures';
import { introState, smoothstep } from '../timeline';
import { useDustBurst, useHalo, useRadialBurst } from './effects';

export const POCHETTE_SIDE = 2.4;
const FLAP_DEPTH = POCHETTE_SIDE * 0.56;
const LAYER = 0.007;
const BASE_Z = 0.034;
/** top, right, left, bottom: hinge position and the turn that points the flap at the centre. */
const FLAPS: { pos: [number, number]; rot: number }[] = [
  { pos: [0, POCHETTE_SIDE / 2], rot: 0 },
  { pos: [POCHETTE_SIDE / 2, 0], rot: -Math.PI / 2 },
  { pos: [-POCHETTE_SIDE / 2, 0], rot: Math.PI / 2 },
  { pos: [0, -POCHETTE_SIDE / 2], rot: Math.PI },
];
const SHARDS = 7;

export interface PochettePalette {
  ivory: string;
  ivoryWarm: string;
  gold: string;
  goldDeep: string;
  goldPale: string;
  emerald: string;
}

function shapeGeometry(pts: P2[]): ShapeGeometry {
  const s = new Shape(pts.map(([x, y]) => ({ x, y }) as never));
  const g = new ShapeGeometry(s);
  // UVs across the flap's bounding box (u along the hinge, v = 1 at the hinge).
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / POCHETTE_SIDE + 0.5, 1 + pos.getY(i) / FLAP_DEPTH);
  return g;
}

/**
 * S1: the ivory pochette on emerald velvet. Four ogee-tipped flaps with embossed florals and gold
 * leaf edges meet under an ivory seal edged in gold leaf. Opening: the seal bursts into shards and
 * gold dust, the flaps unfold one after another, and the gilded card inside floods with light.
 */
export function Pochette({
  palette: p,
  monogram,
  fontVar,
  director,
  sweep,
  dustCount,
  flapNormal,
}: {
  palette: PochettePalette;
  monogram: string;
  fontVar: string;
  director: Director;
  sweep: SweepUniforms;
  dustCount: number;
  flapNormal: Texture | null;
}) {
  const store = useInviteStore();
  const root = useRef<Group>(null);
  const flapPivots = useRef<(Group | null)[]>([]);
  const shardRefs = useRef<(Group | null)[]>([]);
  const card = useRef<Mesh>(null);
  const intact = useRef<Group>(null);

  const geo = useMemo(() => {
    const outer = flapOutline(POCHETTE_SIDE, FLAP_DEPTH, 0.045);
    return {
      rim: shapeGeometry(outer),
      leaf: shapeGeometry(insetPolygon(outer, 0.028)),
      body: new BoxGeometry(POCHETTE_SIDE, POCHETTE_SIDE, 0.05),
      card: new PlaneGeometry(POCHETTE_SIDE * 0.9, POCHETTE_SIDE * 0.9),
      backdrop: new PlaneGeometry(26, 26),
    };
  }, []);

  const mats = useMemo(() => {
    const isDom = typeof document !== 'undefined';
    const velvetTile = isDom ? starTile(256, { ground: '#0A3528', star: '#0C3D2F', line: '#4E4A2B', inner: '#0A3528' }) : null;
    const velvetMask = isDom ? starTile(256, { ground: 'rgb(0,240,0)', star: 'rgb(0,235,0)', line: MASK.gold, inner: 'rgb(0,240,0)' }) : null;
    const velvetMap = velvetTile ? tex(velvetTile, true, true) : null;
    const velvetMr = velvetMask ? tex(velvetMask, false, true) : null;
    [velvetMap, velvetMr].forEach((t) => t?.repeat.set(34, 34));
    const linerTile = isDom ? starTile(256, { ground: p.goldPale, star: p.ivory, line: p.gold, inner: p.emerald }) : null;
    const linerMap = linerTile ? tex(linerTile, true, true) : null;
    linerMap?.repeat.set(3, 1.7);
    return {
      backdrop: new MeshPhysicalMaterial({
        color: '#ffffff',
        map: velvetMap,
        roughnessMap: velvetMr,
        metalnessMap: velvetMr,
        roughness: 1,
        metalness: 1,
        sheen: 1,
        sheenRoughness: 0.5,
        sheenColor: mixHex(p.emerald, '#7FB89E', 0.5),
      }),
      body: new MeshPhysicalMaterial({ color: p.ivory, roughness: 0.82, sheen: 0.4, sheenColor: '#ffffff' }),
      leaf: new MeshPhysicalMaterial({
        color: mixHex(p.ivory, '#ffffff', 0.25),
        roughness: 0.78,
        sheen: 0.5,
        sheenColor: '#ffffff',
        normalMap: flapNormal,
        side: FrontSide,
      }),
      liner: new MeshStandardMaterial({ color: '#ffffff', map: linerMap, roughness: 0.4, metalness: 0.55, side: BackSide }),
      rim: patchMaterial(new MeshStandardMaterial({ color: p.gold, roughness: 0.26, metalness: 1, emissive: p.goldDeep, emissiveIntensity: 0.12, side: DoubleSide }), { sweep }),
      card: (() => {
        const map = isDom ? cardTexture(p) : null;
        return new MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.5, metalness: 0.25, emissive: mixHex(p.gold, '#fff3d6', 0.6), emissiveMap: map, emissiveIntensity: 0 });
      })(),
    };
  }, [p, sweep, flapNormal]);

  // Seal: shards of ivory wax with the monogram pressed and gilded, each with its arc of gold leaf.
  const seal = useMemo(() => {
    const r = 0.36;
    const h = 0.075;
    const rand = mulberry32(11);
    const cuts = Array.from({ length: SHARDS }, (_, i) => ((i + (rand() - 0.5) * 0.5) / SHARDS) * Math.PI * 2);
    const shards = cuts.map((t0, i) => {
      const t1 = i === SHARDS - 1 ? cuts[0]! + Math.PI * 2 : cuts[i + 1]!;
      const len = t1 - t0;
      const wax = new CylinderGeometry(r, r * 1.04, h, Math.max(4, Math.round(len * 10)), 1, false, t0, len);
      wax.rotateX(Math.PI / 2);
      const pos = wax.attributes.position!;
      const uv = wax.attributes.uv!;
      for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / (r * 2.2) + 0.5, pos.getY(k) / (r * 2.2) + 0.5);
      const rim = new TorusGeometry(r * 1.02, 0.03, 6, Math.max(4, Math.round(len * 12)), len);
      rim.rotateZ(t0 - Math.PI / 2);
      const mid = t0 + len / 2;
      return { wax, rim, dir: [Math.sin(mid), -Math.cos(mid)] as [number, number], spin: [rand() * 6 - 3, rand() * 6 - 3, rand() * 8 - 4] as const, speed: 0.8 + rand() * 0.6 };
    });
    let mapTex: Texture | null = null;
    let normal: Texture | null = null;
    if (typeof document !== 'undefined') {
      const height = monogramHeight(monogram, cssFontFamily(fontVar, 'serif'));
      normal = heightToNormal(height, 3);
      mapTex = tintFromHeight(height, mixHex(p.ivory, p.ivoryWarm, 0.35), p.gold);
    }
    const wax = new MeshPhysicalMaterial({
      color: '#ffffff',
      map: mapTex,
      normalMap: normal,
      roughness: 0.38,
      clearcoat: 0.8,
      clearcoatRoughness: 0.25,
      sheen: 0.3,
      sheenColor: '#ffffff',
      transparent: true,
      side: DoubleSide,
    });
    // The intact seal (shown until it bursts), so no seams show at the gate.
    const whole = new CylinderGeometry(r, r * 1.04, h, 48);
    whole.rotateX(Math.PI / 2);
    {
      const pos = whole.attributes.position!;
      const uv = whole.attributes.uv!;
      for (let k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / (r * 2.2) + 0.5, pos.getY(k) / (r * 2.2) + 0.5);
    }
    const wholeRim = new TorusGeometry(r * 1.02, 0.03, 8, 64);
    const leaf = patchMaterial(new MeshStandardMaterial({ color: p.gold, roughness: 0.22, metalness: 1, emissive: p.goldDeep, emissiveIntensity: 0.15, transparent: true }), { sweep });
    return { shards, wax, leaf, mapTex, normal, whole, wholeRim };
  }, [monogram, fontVar, p, sweep]);

  const burst = useRadialBurst(mixHex(p.gold, '#fff6e0', 0.55));
  const dust = useDustBurst(mixHex(p.gold, '#fff1cc', 0.3), dustCount);
  const cardGlow = useHalo(mixHex(p.gold, '#fff4dc', 0.5), 2.6);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => {
        m.dispose();
        (m as MeshStandardMaterial).map?.dispose();
        (m as MeshStandardMaterial).roughnessMap?.dispose();
      });
      seal.shards.forEach((s) => {
        s.wax.dispose();
        s.rim.dispose();
      });
      seal.wax.dispose();
      seal.leaf.dispose();
      seal.whole.dispose();
      seal.wholeRim.dispose();
      seal.mapTex?.dispose();
      seal.normal?.dispose();
    },
    [geo, mats, seal],
  );

  useFrame((state) => {
    const { phase, capture } = store.getState();
    const s = introState(director.time);
    const g = root.current;
    if (!g) return;
    g.visible = s.gate;
    if (!s.gate) return;
    const t = state.clock.elapsedTime;
    g.rotation.z = phase === 'gate' && !capture ? Math.sin(t * 0.55) * 0.01 : 0;
    g.rotation.x = phase === 'gate' && !capture ? Math.sin(t * 0.4) * 0.012 : 0;

    s.flaps.forEach((f, i) => {
      const pivot = flapPivots.current[i];
      if (pivot) pivot.rotation.x = -Math.PI * 0.985 * f;
    });
    shardRefs.current.forEach((ref, i) => {
      const sh = seal.shards[i];
      if (!ref || !sh) return;
      const k = Math.min(1, s.seal * sh.speed);
      ref.position.set(sh.dir[0] * (0.02 + 1.7 * k), sh.dir[1] * (0.02 + 1.7 * k) - 0.9 * k * k, 0.9 * k);
      ref.rotation.set(sh.spin[0] * k, sh.spin[1] * k, sh.spin[2] * k);
      ref.visible = s.seal > 0.0005 && s.seal < 0.995;
    });
    if (intact.current) intact.current.visible = s.seal <= 0.0005;
    const fade = 1 - smoothstep(0.35, 0.95, s.seal);
    seal.wax.opacity = fade;
    seal.leaf.opacity = fade;
    dust.material.uniforms.uP!.value = s.seal;
    mats.card.emissiveIntensity = 0.15 + s.glow * 1.6;
    cardGlow.material.uniforms.uK!.value = Math.min(1.4, s.glow * 0.7);
    burst.material.uniforms.uK!.value = s.rays;
  });

  return (
    <group ref={root}>
      <mesh geometry={geo.backdrop} material={mats.backdrop} position-z={-0.12} receiveShadow />
      <mesh geometry={geo.body} material={mats.body} castShadow receiveShadow />
      <mesh ref={card} geometry={geo.card} material={mats.card} position-z={0.027} />
      {FLAPS.map((f, i) => (
        <group key={i} position={[f.pos[0], f.pos[1], BASE_Z + (3 - i) * LAYER]} rotation-z={f.rot}>
          <group ref={(el) => void (flapPivots.current[i] = el)}>
            <mesh geometry={geo.rim} material={mats.rim} castShadow receiveShadow />
            <mesh geometry={geo.leaf} material={mats.leaf} position-z={0.0015} receiveShadow />
            <mesh geometry={geo.leaf} material={mats.liner} position-z={-0.0015} />
          </group>
        </group>
      ))}
      <group position-z={BASE_Z + 4 * LAYER + 0.04}>
        <group ref={intact}>
          <mesh geometry={seal.whole} material={seal.wax} castShadow />
          <mesh geometry={seal.wholeRim} material={seal.leaf} />
        </group>
        {seal.shards.map((sh, i) => (
          <group key={i} ref={(el) => void (shardRefs.current[i] = el)}>
            <mesh geometry={sh.wax} material={seal.wax} castShadow />
            <mesh geometry={sh.rim} material={seal.leaf} />
          </group>
        ))}
        <points geometry={dust.geometry} material={dust.material} frustumCulled={false} />
      </group>
      <mesh geometry={cardGlow.geometry} material={cardGlow.material} position-z={0.3} frustumCulled={false} />
      <mesh geometry={burst.geometry} material={burst.material} position-z={0.12} frustumCulled={false} />
    </group>
  );
}
