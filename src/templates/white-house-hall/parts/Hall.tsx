'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  RepeatWrapping,
  ShaderMaterial,
  Shape,
  ExtrudeGeometry,
} from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { useInviteStore } from '@/lib/invite/machine';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { CHANDELIERS, HALL } from '../camera';
import { bulbLayout, chandelierFrameGeometry, crystalGeometry, crystalLayout, drapeGeometry } from '../geometry';
import { ceilingTexture, glowTexture, marbleTexture, wallTexture } from '../textures';
import { introState } from '../timeline';

const BAY = 4; // pilaster spacing along the walls
const BAYS = Math.floor((HALL.front - HALL.back) / BAY);

const dummy = new Object3D();

/** Twinkling points: additive, round, each with its own phase; brightens as the walk reaches it. */
function sparkleMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uReach: { value: 0 }, uColor: { value: new Color(color) }, uScale: { value: 1 } },
    vertexShader: `
      attribute float aPhase; attribute float aSize;
      uniform float uTime; uniform float uK; uniform float uReach; uniform float uScale;
      varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (1.3 + fract(aPhase * 7.1) * 2.2) + aPhase * 6.283), 6.0);
        float reach = smoothstep(uReach + 3.0, uReach - 3.0, position.z); // nearer ones light first
        vA = uK * mix(0.25, 1.0, reach) * tw;
        gl_PointSize = aSize * uScale * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        float core = smoothstep(0.5, 0.0, r);
        float star = max(0.0, 1.0 - abs(d.x) * 14.0) * smoothstep(0.5, 0.0, abs(d.y)) + max(0.0, 1.0 - abs(d.y) * 14.0) * smoothstep(0.5, 0.0, abs(d.x));
        gl_FragColor = vec4(uColor * (core * core + star * 0.6) * vA, 1.0);
      }`,
  });
}

/**
 * The white hall: black-and-white marble on the diagonal, panelled off-white walls with pilasters,
 * white drapes, a coffered ceiling, two rows of crystal chandeliers and, at the far end, an arched
 * alcove in soft light. Reflections of the chandeliers in the marble are soft glows (no extra pass).
 */
export function Hall({ director, crystalScale, lights, marble }: { director: Director; crystalScale: number; /** Point lights down the hall (1–3). */ lights: number; marble: { light: string; dark: string } }) {
  const store = useInviteStore();
  const L = HALL.front - HALL.back;
  const H = HALL.ceiling - HALL.floor;
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const floor = marbleTexture(512, marble.light, marble.dark);
    floor.repeat.set((HALL.halfWidth * 2) / 1.7, L / 1.7);
    const wall = wallTexture();
    wall.repeat.set(L / BAY, 1);
    const ceil = ceilingTexture();
    ceil.repeat.set((HALL.halfWidth * 2) / 1.5, L / 1.5);
    ceil.wrapS = ceil.wrapT = RepeatWrapping;
    return { floor, wall, ceil, glow: glowTexture() };
  }, [L, marble.light, marble.dark]);

  const crystals = useMemo(() => crystalLayout(crystalScale), [crystalScale]);
  const geo = useMemo(() => {
    const alcove = new Shape();
    alcove.moveTo(-3.2, 0);
    alcove.lineTo(3.2, 0);
    alcove.lineTo(3.2, H - 0.5);
    alcove.lineTo(-3.2, H - 0.5);
    alcove.closePath();
    const hole = new Shape();
    hole.moveTo(-1.9, 0.01);
    hole.lineTo(1.9, 0.01);
    hole.lineTo(1.9, 3.6);
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI;
      hole.lineTo(Math.cos(a) * 1.9, 3.6 + Math.sin(a) * 1.9);
    }
    hole.lineTo(-1.9, 0.01);
    alcove.holes.push(hole);
    const alcoveFrame = new ExtrudeGeometry(alcove, { depth: 0.35, bevelEnabled: false, curveSegments: 20 });
    return {
      floor: new PlaneGeometry(HALL.halfWidth * 2, L),
      wall: new PlaneGeometry(L, H),
      back: new PlaneGeometry(HALL.halfWidth * 2, H),
      ceil: new PlaneGeometry(HALL.halfWidth * 2, L),
      pilaster: new BoxGeometry(0.5, H - 0.3, 0.2),
      drape: drapeGeometry(1.05, H - 1.2, 6),
      frame: chandelierFrameGeometry(1.6),
      crystal: crystalGeometry(),
      glowPlane: new PlaneGeometry(1, 1),
      alcoveFrame,
      alcoveGlow: new PlaneGeometry(3.8, 5.5),
    };
  }, [L, H]);
  const mats = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tex?.floor ?? null, roughness: 0.14, metalness: 0.05, envMapIntensity: 1.2 }),
      wall: new MeshStandardMaterial({ map: tex?.wall ?? null, roughness: 0.85, emissive: '#ffffff', emissiveMap: tex?.wall ?? null, emissiveIntensity: 0.22 }),
      ceil: new MeshStandardMaterial({ map: tex?.ceil ?? null, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex?.ceil ?? null, emissiveIntensity: 0.3 }),
      plain: new MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.8, emissive: '#F4F1EA', emissiveIntensity: 0.18 }),
      drape: new MeshStandardMaterial({ color: '#FBFAF6', roughness: 0.75, side: DoubleSide, emissive: '#2a2622', emissiveIntensity: 0.25 }),
      frame: new MeshStandardMaterial({ color: '#d8d4cc', roughness: 0.22, metalness: 0.95 }),
      crystal: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0.35, emissive: '#fff1da', emissiveIntensity: 0.35, envMapIntensity: 2.2 }),
      floorGlow: new MeshBasicMaterial({ color: '#ffe9c8', map: tex?.glow ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.32 }),
      alcoveGlow: new MeshBasicMaterial({ color: '#fff3e0', map: tex?.glow ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }),
    }),
    [tex],
  );

  // Sparkles on a third of the crystals, plus a soft bulb glow at every candle cup.
  const sparkle = useMemo(() => {
    const rand = mulberry32(3);
    const pos: number[] = [];
    const phase: number[] = [];
    const size: number[] = [];
    for (const [cx, cy, cz, sc] of CHANDELIERS) {
      crystals.forEach(([x, y, z], i) => {
        if (i % 3) return;
        pos.push(cx + x * sc, cy + y * sc, cz + z * sc);
        phase.push(rand());
        size.push(0.05 + rand() * 0.06);
      });
      for (const [x, y, z] of bulbLayout()) {
        pos.push(cx + x * sc, cy + y * sc, cz + z * sc);
        phase.push(rand() * 0.2);
        size.push(0.5 * sc);
      }
      pos.push(cx, cy - 0.1 * sc, cz);
      phase.push(0.5);
      size.push(2.6 * sc);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('aPhase', new BufferAttribute(new Float32Array(phase), 1));
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(size), 1));
    const p = new Points(g, sparkleMaterial('#fff4e2'));
    p.frustumCulled = false;
    return p;
  }, [crystals]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      if (tex) Object.values(tex).forEach((t) => t.dispose());
      sparkle.geometry.dispose();
      (sparkle.material as ShaderMaterial).dispose();
    },
    [geo, mats, tex, sparkle],
  );

  const pilasters = useRef<InstancedMesh>(null);
  const drapes = useRef<InstancedMesh>(null);
  const frames = useRef<InstancedMesh>(null);
  const crystalMesh = useRef<InstancedMesh>(null);
  const floorGlows = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    let i = 0;
    for (const s of [-1, 1])
      for (let b = 0; b <= BAYS; b++) {
        dummy.position.set(s * (HALL.halfWidth - 0.1), HALL.floor + (H - 0.3) / 2, HALL.front - b * BAY);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pilasters.current?.setMatrixAt(i++, dummy.matrix);
      }
    if (pilasters.current) pilasters.current.instanceMatrix.needsUpdate = true;
    i = 0;
    for (const s of [-1, 1])
      for (let b = 0; b < BAYS; b++)
        for (const side of [-1, 1]) {
          const z = HALL.front - b * BAY - BAY / 2 + side * 1.3;
          dummy.position.set(s * (HALL.halfWidth - 0.25), HALL.ceiling - 0.6, z);
          dummy.rotation.set(0, (-s * Math.PI) / 2, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          drapes.current?.setMatrixAt(i++, dummy.matrix);
        }
    if (drapes.current) drapes.current.instanceMatrix.needsUpdate = true;
    CHANDELIERS.forEach(([x, y, z, sc], k) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, k * 0.4, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      frames.current?.setMatrixAt(k, dummy.matrix);
      dummy.position.set(x, HALL.floor + 0.01, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(3.4 * sc, 3.4 * sc, 1);
      dummy.updateMatrix();
      floorGlows.current?.setMatrixAt(k, dummy.matrix);
    });
    if (frames.current) frames.current.instanceMatrix.needsUpdate = true;
    if (floorGlows.current) floorGlows.current.instanceMatrix.needsUpdate = true;
    i = 0;
    for (const [cx, cy, cz, sc] of CHANDELIERS)
      for (const [x, y, z] of crystals) {
        dummy.position.set(cx + x * sc, cy + y * sc, cz + z * sc);
        dummy.rotation.set(0, (i * 0.7) % Math.PI, 0);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        crystalMesh.current?.setMatrixAt(i++, dummy.matrix);
      }
    if (crystalMesh.current) {
      crystalMesh.current.instanceMatrix.needsUpdate = true;
      crystalMesh.current.computeBoundingSphere();
    }
    [pilasters, drapes, frames, floorGlows].forEach((r) => r.current?.computeBoundingSphere());
  }, [geo, mats, crystals, H]);

  useFrame((state) => {
    const { capture, phase } = store.getState();
    const s = introState(director.time);
    const after = phase === 'handoff' || phase === 'content';
    const k = after ? 1 : s.sparkle;
    const m = sparkle.material as ShaderMaterial;
    m.uniforms.uTime!.value = capture ? 3.3 : state.clock.elapsedTime;
    m.uniforms.uK!.value = 0.35 + 0.85 * k;
    m.uniforms.uReach!.value = after ? HALL.back : HALL.front + 2 - k * (HALL.front - HALL.back + 4);
    m.uniforms.uScale!.value = state.size.height / 900;
    mats.crystal.emissiveIntensity = 0.3 + 0.6 * k;
  });

  const midZ = (HALL.front + HALL.back) / 2;
  return (
    <group>
      <mesh geometry={geo.floor} material={mats.floor} rotation-x={-Math.PI / 2} position={[0, HALL.floor + 0.002, midZ]} />
      <mesh geometry={geo.ceil} material={mats.ceil} rotation-x={Math.PI / 2} position={[0, HALL.ceiling, midZ]} />
      <mesh geometry={geo.wall} material={mats.wall} rotation-y={Math.PI / 2} position={[-HALL.halfWidth, HALL.floor + (HALL.ceiling - HALL.floor) / 2, midZ]} />
      <mesh geometry={geo.wall} material={mats.wall} rotation-y={-Math.PI / 2} position={[HALL.halfWidth, HALL.floor + (HALL.ceiling - HALL.floor) / 2, midZ]} />
      <mesh geometry={geo.back} material={mats.plain} position={[0, HALL.floor + (HALL.ceiling - HALL.floor) / 2, HALL.back]} />
      <mesh geometry={geo.alcoveFrame} material={mats.plain} position={[0, HALL.floor, HALL.back + 0.02]} />
      <mesh geometry={geo.alcoveGlow} material={mats.alcoveGlow} position={[0, HALL.floor + 3.2, HALL.back + 0.05]} />
      <instancedMesh ref={pilasters} args={[geo.pilaster, mats.plain, (BAYS + 1) * 2]} />
      <instancedMesh ref={drapes} args={[geo.drape, mats.drape, BAYS * 4]} />
      <instancedMesh ref={frames} args={[geo.frame, mats.frame, CHANDELIERS.length]} />
      <instancedMesh ref={crystalMesh} args={[geo.crystal, mats.crystal, CHANDELIERS.length * crystals.length]} />
      <instancedMesh ref={floorGlows} args={[geo.glowPlane, mats.floorGlow, CHANDELIERS.length]} renderOrder={3} />
      <primitive object={sparkle} />
      {[-9, -19, -14].slice(0, lights).map((z) => (
        <pointLight key={z} position={[0, 5.2, z]} color="#ffe6c4" intensity={lights === 1 ? 34 : 22} distance={lights === 1 ? 26 : 16} decay={1.3} />
      ))}
    </group>
  );
}
