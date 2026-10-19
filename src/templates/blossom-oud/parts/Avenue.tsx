'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  type BufferAttribute,
  type Points,
} from 'three';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { AVENUE, PALACE_Z, WALL_FRONT, WALL_DEPTH } from '../camera';
import { frondGeometry, lanternGeometries, trunkGeometry } from '../geometry';
import { frondLayout, lanternLayout, mistLayout, palmLayout, type Lantern } from '../layout';
import { barkTexture, frondTexture, glowTexture, groundTexture, hedgeTexture } from '../textures';
import { spriteGeometry, spriteMaterial } from './sprites';

export interface AvenuePalette {
  palm: string;
  palace: string;
  satin: string;
  satinDeep: string;
  mist: string;
  plum: string;
  oud: string;
  gold: string;
  lamp: string;
}

/** A clipped myrtle hedge: a rounded-top section extruded down the avenue (toward −z). */
function hedgeGeometry(length: number) {
  const s = new Shape();
  const w = 0.31;
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, 0.3);
  s.quadraticCurveTo(w, 0.52, 0, 0.54);
  s.quadraticCurveTo(-w, 0.52, -w, 0.3);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: length, bevelEnabled: false, curveSegments: 6 }).rotateY(Math.PI);
}

const MIST_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uTime; uniform float uSeed; uniform float uK;
varying vec2 vUv; varying float vDepth;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++){ s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec2 p = vec2(vUv.x * 5.0 + uSeed * 3.1 + uTime * 0.035, vUv.y * 1.6 - uTime * 0.01);
  float f = fbm(p + vec2(fbm(p * 0.7 + uSeed), 0.0) * 0.8);
  float vert = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.08, vUv.y);
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
  float near = smoothstep(1.5, 9.0, vDepth);
  float a = smoothstep(0.25, 0.85, f) * vert * edge * near * uK;
  gl_FragColor = vec4(uColor, a * 0.62);
  #include <colorspace_fragment>
}`;

/**
 * The Andalusian-Iraqi avenue: a water channel between stone curbs, myrtle hedges, two rows of
 * date palms (instanced trunks and alpha-cut fronds that stir in the wind), lanterns on posts
 * that light in turn, and drifting planes of pink mist.
 */
export function useAvenue(pal: AvenuePalette, counts: { palms: number; fronds: number; lanterns: number; mist: number }, low: boolean) {
  const palms = useMemo(() => palmLayout(counts.palms), [counts.palms]);
  const fronds = useMemo(() => frondLayout(palms, counts.fronds), [palms, counts.fronds]);
  const lanterns = useMemo<Lantern[]>(() => {
    const extra: Lantern[] = [-1, 1].map((s, i) => ({ p: [s * 4.55, 0, WALL_FRONT + 0.55], order: -1, seed: 90 + i }));
    return [...extra, ...lanternLayout(counts.lanterns)];
  }, [counts.lanterns]);
  const mist = useMemo(() => mistLayout(counts.mist), [counts.mist]);

  const geo = useMemo(() => ({ trunk: trunkGeometry(low ? 6 : 8, 14), frond: frondGeometry(low ? 7 : 10), ...lanternGeometries(low), plane: new PlaneGeometry(1, 1), hedge: hedgeGeometry(AVENUE.start - AVENUE.end + 2) }), [low]);
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const ground = groundTexture({
      paving: mix(pal.palace, pal.satin, 0.3),
      joint: shade(mix(pal.palace, pal.satinDeep, 0.4), 0.8),
      bed: shade(pal.palm, 0.55),
      walk: mix(pal.palace, pal.satinDeep, 0.28),
      garden: shade(mix(pal.palm, pal.plum, 0.35), 0.6),
    });
    ground.repeat.set(1, 18);
    const hedge = hedgeTexture(mix(pal.palm, '#6f8f5e', 0.35));
    hedge.repeat.set(1.6, 1.6);
    const bark = barkTexture(mix('#7a6050', pal.satinDeep, 0.15), '#3e2c26');
    bark.repeat.set(2, 2);
    return { ground, hedge, bark, frond: frondTexture(pal.palm, mix(pal.palm, '#c9d6a0', 0.35)), glow: glowTexture() };
  }, [pal]);
  const wind = useMemo(() => ({ uTime: { value: 0 }, uWind: { value: 1 } }), []);
  const mats = useMemo(() => {
    const frond = new MeshStandardMaterial({ map: tex?.frond ?? null, alphaTest: 0.45, side: DoubleSide, roughness: 0.75 });
    frond.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, wind);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
           float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.31;
           #else
           float ph = 0.0;
           #endif
           float u2 = uv.x * uv.x;
           transformed.y += uWind * u2 * (0.07 * sin(uTime * 1.4 + ph) + 0.03 * sin(uTime * 3.1 + ph * 2.3));
           transformed.z += uWind * u2 * 0.05 * sin(uTime * 1.1 + ph * 1.7);`,
        );
    };
    frond.customProgramCacheKey = () => 'bo-frond';
    return {
      ground: new MeshStandardMaterial({ map: tex?.ground ?? null, roughness: 0.95 }),
      water: new MeshStandardMaterial({ color: mix(pal.satinDeep, pal.plum, 0.35), metalness: 0.8, roughness: 0.12, envMapIntensity: 1.6, emissive: shade(pal.satinDeep, 0.5), emissiveIntensity: 0.35 }),
      stone: new MeshStandardMaterial({ color: mix(pal.palace, '#ffffff', 0.15), roughness: 0.8 }),
      hedge: new MeshStandardMaterial({ map: tex?.hedge ?? null, color: '#ffffff', roughness: 1, emissive: shade(pal.palm, 0.5), emissiveIntensity: 0.25 }),
      trunk: new MeshStandardMaterial({ map: tex?.bark ?? null, roughness: 0.95 }),
      frond,
      metal: new MeshStandardMaterial({ color: mix(pal.oud, pal.gold, 0.45), metalness: 0.75, roughness: 0.38 }),
      glass: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      halo: tex ? spriteMaterial(tex.glow, pal.lamp, 1) : null,
      mist: mist.map(
        (m) =>
          new ShaderMaterial({
            uniforms: { uColor: { value: new Color(pal.mist) }, uTime: { value: 0 }, uSeed: { value: m.seed }, uK: { value: 1 } },
            vertexShader: `varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
            fragmentShader: MIST_FRAG,
            transparent: true,
            depthWrite: false,
            fog: false,
          }),
      ),
    };
  }, [pal, tex, wind, mist]);
  const haloGeo = useMemo(() => spriteGeometry(lanterns.map((l) => ({ p: [l.p[0], 1.88, l.p[2]], size: 1.25, phase: l.seed * 1.3, k: 0 }))), [lanterns]);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      if (tex) Object.values(tex).forEach((t) => t.dispose());
      Object.values(mats).forEach((m) => (Array.isArray(m) ? m.forEach((x) => x.dispose()) : m?.dispose()));
      haloGeo.dispose();
    },
    [geo, tex, mats, haloGeo],
  );
  return { palms, fronds, lanterns, mist, geo, mats, wind, haloGeo };
}

export type AvenueKit = ReturnType<typeof useAvenue>;

export function Avenue({ a, lanternLight }: { a: AvenueKit; lanternLight: React.RefObject<(i: number) => number> }) {
  const trunks = useRef<InstancedMesh>(null);
  const fronds = useRef<InstancedMesh>(null);
  const metal = useRef<InstancedMesh>(null);
  const glass = useRef<InstancedMesh>(null);
  const halo = useRef<Points>(null);
  const len = AVENUE.start - (PALACE_Z + 4);
  const z0 = WALL_FRONT - WALL_DEPTH;

  useLayoutEffect(() => {
    const o = new Object3D();
    if (trunks.current) {
      a.palms.forEach((p, i) => {
        o.position.set(p.x, 0, p.z);
        o.rotation.set(0, p.turn, 0);
        o.scale.set(1, p.height, 1);
        o.updateMatrix();
        trunks.current!.setMatrixAt(i, o.matrix);
      });
      trunks.current.instanceMatrix.needsUpdate = true;
      trunks.current.computeBoundingSphere();
    }
    if (fronds.current) {
      a.fronds.forEach((f, i) => {
        const p = a.palms[f.palm]!;
        o.position.set(...p.top);
        o.rotation.set(0, f.yaw, -f.pitch, 'YXZ');
        o.scale.setScalar(f.length);
        o.updateMatrix();
        fronds.current!.setMatrixAt(i, o.matrix);
      });
      fronds.current.instanceMatrix.needsUpdate = true;
      fronds.current.computeBoundingSphere();
    }
    o.rotation.set(0, 0, 0);
    o.scale.setScalar(1);
    a.lanterns.forEach((l, i) => {
      o.position.set(...l.p);
      o.updateMatrix();
      metal.current?.setMatrixAt(i, o.matrix);
      glass.current?.setMatrixAt(i, o.matrix);
      glass.current?.setColorAt(i, new Color('#000000'));
    });
    if (metal.current) metal.current.instanceMatrix.needsUpdate = true;
    if (glass.current) glass.current.instanceMatrix.needsUpdate = true;
  }, [a]);

  // Lantern brightness each frame (lit in turn, flickering), from the scene's function.
  const col = useMemo(() => new Color(), []);
  const lampBase = useMemo(() => new Color('#ffcf94'), []);
  useFrame(() => {
    const f = lanternLight.current;
    const g = glass.current;
    const h = halo.current;
    if (!f || !g) return;
    const ak = h ? (h.geometry.attributes.aK as BufferAttribute) : null;
    a.lanterns.forEach((_, i) => {
      const k = f(i);
      col.copy(lampBase).multiplyScalar(0.12 + 1.25 * k);
      g.setColorAt(i, col);
      if (ak) ak.setX(i, k);
    });
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
    if (ak) ak.needsUpdate = true;
  });

  return (
    <group>
      <mesh material={a.mats.ground} rotation-x={-Math.PI / 2} position={[0, 0, z0 - 45]}>
        <planeGeometry args={[60, 90]} />
      </mesh>
      {/* The water channel and its curbs. */}
      <mesh material={a.mats.water} rotation-x={-Math.PI / 2} position={[0, 0.03, z0 - len / 2]}>
        <planeGeometry args={[0.9, len]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`c${s}`} material={a.mats.stone} position={[s * 0.52, 0.05, z0 - len / 2]}>
          <boxGeometry args={[0.16, 0.1, len]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} geometry={a.geo.hedge} material={a.mats.hedge} position={[s * AVENUE.hedgeX, 0, AVENUE.start + 1]} />
      ))}
      <instancedMesh ref={trunks} args={[a.geo.trunk, a.mats.trunk, a.palms.length]} />
      <instancedMesh ref={fronds} args={[a.geo.frond, a.mats.frond, a.fronds.length]} />
      <instancedMesh ref={metal} args={[a.geo.metal, a.mats.metal, a.lanterns.length]} frustumCulled={false} />
      <instancedMesh ref={glass} args={[a.geo.glass, a.mats.glass, a.lanterns.length]} frustumCulled={false} />
      {a.mats.halo && <points ref={halo} geometry={a.haloGeo} material={a.mats.halo} frustumCulled={false} renderOrder={6} />}
      {a.mist.map((m, i) => (
        <mesh key={i} geometry={a.geo.plane} material={a.mats.mist[i]} position={[0, m.y + m.height / 2, m.z]} scale={[m.width, m.height, 1]} renderOrder={4} />
      ))}
    </group>
  );
}

