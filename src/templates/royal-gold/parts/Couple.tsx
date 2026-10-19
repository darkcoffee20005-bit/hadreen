'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  type BufferGeometry,
  CapsuleGeometry,
  DoubleSide,
  type Group,
  LatheGeometry,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { coupleZ, type P2 } from '../geometry';
import { patchMaterial } from '../materials';
import { introState, smoothstep } from '../timeline';

const lathe = (pts: P2[], seg: number, start = 0, len = Math.PI * 2) =>
  new LatheGeometry(
    pts.map(([r, y]) => new Vector2(r, y)),
    seg,
    start,
    len,
  );

/** Trails a skirt or veil backwards (+z, toward the camera, as the couple walks away). */
function trail(g: BufferGeometry, below: number, amount: number) {
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z > 0 && y < below) {
      const k = 1 - y / below;
      pos.setZ(i, z * (1 + amount * k * k));
    }
  }
  g.computeVertexNormals();
}

export function buildCouple() {
  // Groom: tailored jacket (flattened lathe), head, arms; legs separate so they can walk.
  const torso = lathe(
    [
      [0, 0.86],
      [0.17, 0.87],
      [0.185, 0.96],
      [0.178, 1.12],
      [0.2, 1.3],
      [0.235, 1.43],
      [0.2, 1.5],
      [0.075, 1.57],
      [0.058, 1.62],
      [0, 1.62],
    ],
    18,
  );
  torso.scale(1, 1, 0.62);
  const head = new SphereGeometry(0.105, 14, 10);
  head.scale(0.95, 1.08, 1);
  head.translate(0, 1.71, 0);
  const armL = new CapsuleGeometry(0.052, 0.52, 3, 8);
  armL.rotateZ(-0.08);
  armL.translate(-0.245, 1.15, 0);
  const armR = new CapsuleGeometry(0.052, 0.52, 3, 8);
  armR.rotateZ(0.42);
  armR.translate(0.31, 1.13, -0.02);
  const groom = mergeGeometries([torso, head, armL, armR])!;
  const leg = new CapsuleGeometry(0.072, 0.76, 3, 8);
  leg.translate(0, -(0.76 / 2 + 0.072), 0);

  // Bride: gown with a train, bodice, head with a bun, arms; a veil over her back.
  const gown = lathe(
    [
      [0, 0.0],
      [0.52, 0.0],
      [0.49, 0.1],
      [0.4, 0.38],
      [0.28, 0.7],
      [0.165, 0.98],
      [0.12, 1.07],
      [0.142, 1.2],
      [0.15, 1.3],
      [0.13, 1.38],
      [0.065, 1.43],
      [0.045, 1.48],
      [0, 1.48],
    ],
    24,
  );
  trail(gown, 1.0, 1.7);
  const bHead = new SphereGeometry(0.094, 14, 10);
  bHead.scale(0.94, 1.06, 1);
  bHead.translate(0, 1.58, 0);
  const bun = new SphereGeometry(0.058, 10, 8);
  bun.translate(0, 1.62, 0.075);
  const bArmL = new CapsuleGeometry(0.034, 0.48, 3, 6);
  bArmL.rotateZ(-0.5);
  bArmL.translate(-0.25, 1.14, -0.02);
  const bArmR = new CapsuleGeometry(0.034, 0.48, 3, 6);
  bArmR.rotateZ(0.12);
  bArmR.translate(0.18, 1.12, 0);
  const bride = mergeGeometries([gown, bHead, bun, bArmL, bArmR])!;
  const veil = lathe(
    [
      [0.52, 0.02],
      [0.46, 0.25],
      [0.32, 0.85],
      [0.17, 1.4],
      [0.1, 1.6],
      [0.05, 1.67],
    ],
    20,
    -Math.PI / 2,
    Math.PI,
  );
  veil.scale(1, 1, 1.08);
  trail(veil, 1.6, 1.4);
  [torso, head, armL, armR, gown, bHead, bun, bArmL, bArmR].forEach((g) => g.dispose());
  return { groom, leg, bride, veil };
}

/**
 * The couple, seen from behind (no faces): he in a dark tailored suit, she in an ivory gown with
 * a long train and veil, hand in hand. They walk toward the mosque during S3 and wait there
 * afterwards. Low tier draws them as flat silhouettes.
 */
export function Couple({ director, suit, gown, haze, silhouette }: { director: Director; suit: string; gown: string; haze: string; silhouette: boolean }) {
  const root = useRef<Group>(null);
  const groomRef = useRef<Group>(null);
  const brideRef = useRef<Group>(null);
  const legs = [useRef<Group>(null), useRef<Group>(null)];
  const geo = useMemo(() => buildCouple(), []);
  const mats = useMemo(() => {
    const h = <M extends Material>(m: M) => patchMaterial(m, { haze: { color: haze, near: 2, far: 60, max: 0.22 } });
    if (silhouette) {
      return {
        suit: h(new MeshBasicMaterial({ color: suit })),
        gown: h(new MeshBasicMaterial({ color: gown })),
        veil: h(new MeshBasicMaterial({ color: gown, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false })),
      };
    }
    return {
      suit: h(new MeshStandardMaterial({ color: suit, roughness: 0.6 })),
      gown: h(new MeshPhysicalMaterial({ color: gown, roughness: 0.7, sheen: 0.8, sheenColor: '#ffffff', sheenRoughness: 0.4 })),
      veil: h(new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.38, side: DoubleSide, depthWrite: false })),
    };
  }, [suit, gown, haze, silhouette]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  useFrame(() => {
    const t = director.time;
    const s = introState(t);
    const moving = smoothstep(4.25, 4.7, t) * (1 - smoothstep(7.2, 7.9, t));
    const phase = (s.walk * 6.2) / 0.62 * Math.PI;
    if (root.current) root.current.position.set(0, Math.abs(Math.sin(phase)) * 0.022 * moving, coupleZ(s.walk));
    legs.forEach((l, i) => {
      if (l.current) l.current.rotation.x = Math.sin(phase + i * Math.PI) * 0.34 * moving;
    });
    if (brideRef.current) brideRef.current.rotation.z = Math.sin(phase) * 0.018 * moving;
    if (groomRef.current) groomRef.current.rotation.z = -0.025 + Math.sin(phase + 0.5) * 0.012 * moving;
  });

  return (
    <group ref={root}>
      <group ref={groomRef} position-x={-0.29}>
        <mesh geometry={geo.groom} material={mats.suit} castShadow />
        {[-1, 1].map((side, i) => (
          <group key={side} ref={legs[i]} position={[side * 0.095, 0.92, 0]}>
            <mesh geometry={geo.leg} material={mats.suit} castShadow />
          </group>
        ))}
      </group>
      <group ref={brideRef} position-x={0.27}>
        <mesh geometry={geo.bride} material={mats.gown} castShadow />
        <mesh geometry={geo.veil} material={mats.veil} renderOrder={1} />
      </group>
    </group>
  );
}
