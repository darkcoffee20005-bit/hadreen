'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type BufferGeometry, type Group, LatheGeometry, MeshStandardMaterial, Object3D, type SpotLight, type Texture, TorusGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useInviteStore } from '@/lib/invite/machine';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { lanternProfiles, pendulumAngle, type Swing } from '../geometry';
import { INTRO, LANTERN_KICK } from '../timeline';
import { useHalo } from './effects';

const lathe = (pts: [number, number][], segments: number) =>
  new LatheGeometry(
    pts.map(([r, y]) => new Vector2(r, y)),
    segments,
  );

/** Brass (cap, base, finials and chain) as one geometry; the pierced body as another. */
export function buildLantern(scale: number, drop: number): { brass: BufferGeometry; body: BufferGeometry; centreY: number } {
  const { base, body, cap } = lanternProfiles(scale);
  const parts: BufferGeometry[] = [lathe(base, 16), lathe(cap, 16)];
  const top = cap[cap.length - 1]![1];
  const ring = new TorusGeometry(0.05 * scale, 0.012 * scale, 5, 12);
  ring.translate(0, top + 0.04 * scale, 0);
  parts.push(ring);
  const link = 0.075 * scale;
  const n = Math.max(1, Math.floor((drop - top - 0.08 * scale) / link));
  for (let i = 0; i < n; i++) {
    const t = new TorusGeometry(0.042 * scale, 0.009 * scale, 4, 10);
    if (i % 2) t.rotateY(Math.PI / 2);
    t.translate(0, top + 0.1 * scale + i * link, 0);
    parts.push(t);
  }
  const brass = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return { brass, body: lathe(body, 28), centreY: (body[0]![1] + body[body.length - 1]![1]) / 2 };
}

export interface LanternProps {
  /** Where the chain hangs from. */
  pivot: [number, number, number];
  /** Chain + lantern length from the pivot down to the body's foot. */
  drop: number;
  scale: number;
  swing: Swing;
  brass: string;
  light: string;
  director: Director;
  pierced: Texture | null;
  /** Clock time of the last RSVP "attending" (a gust sets the lanterns swinging again). */
  kickAt: React.RefObject<number>;
  gobo?: { map: Texture | null; intensity: number; target: [number, number, number]; shadowSize: number } | null;
  glow: number;
}

/**
 * A brass lantern on a chain, swinging as a damped pendulum. Light pours through its pierced
 * stars (emissive), a soft halo hangs around it, and on medium/high a gobo spotlight inside it
 * throws moving star-shaped light onto the wall.
 */
export function Lantern({ pivot, drop, scale, swing, brass, light, director, pierced, kickAt, gobo, glow }: LanternProps) {
  const store = useInviteStore();
  const group = useRef<Group>(null);
  const entered = useRef(-1);
  const spot = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const geo = useMemo(() => buildLantern(scale, drop), [scale, drop]);
  const mats = useMemo(() => {
    const map = pierced ? pierced.clone() : null;
    if (map) map.needsUpdate = true;
    return {
      brass: new MeshStandardMaterial({ color: brass, metalness: 1, roughness: 0.3, emissive: light, emissiveIntensity: 0.06 }),
      body: new MeshStandardMaterial({ color: brass, metalness: 0.9, roughness: 0.34, emissive: light, emissiveMap: map, emissiveIntensity: 2.4 * glow }),
    };
  }, [brass, light, pierced, glow]);
  const halo = useHalo(light, 0.72 * scale);

  useEffect(
    () => () => {
      geo.brass.dispose();
      geo.body.dispose();
      mats.brass.dispose();
      mats.body.emissiveMap?.dispose();
      mats.body.dispose();
    },
    [geo, mats],
  );

  useFrame((state) => {
    const { phase, capture } = store.getState();
    const t = state.clock.elapsedTime;
    let ts: number;
    if (phase === 'handoff' || phase === 'content') {
      if (entered.current < 0) entered.current = t;
      ts = INTRO - LANTERN_KICK + (capture ? 1.4 : t - entered.current);
    } else {
      entered.current = -1;
      ts = director.time - LANTERN_KICK;
    }
    let a = pendulumAngle(ts, swing);
    const k = kickAt.current ?? -1;
    if (k >= 0 && !capture) a += pendulumAngle(t - k, { amp: 0.09, period: swing.period, decay: 2.6, sway: 0, phase: 0 });
    const g = group.current;
    if (g) {
      g.rotation.z = a;
      g.rotation.x = pendulumAngle(ts - 0.4, { ...swing, amp: swing.amp * 0.35, sway: swing.sway * 0.5, phase: swing.phase + 1.7 });
    }
    halo.material.uniforms.uK!.value = 0.6 + (capture ? 0 : Math.sin(t * 7.1 + pivot[0]) * 0.04 + Math.sin(t * 3.3) * 0.03);
    if (spot.current && gobo) spot.current.intensity = gobo.intensity;
  });

  return (
    <group ref={group} position={pivot}>
      <group position-y={-drop}>
        <mesh geometry={geo.brass} material={mats.brass} />
        <mesh geometry={geo.body} material={mats.body} />
        <mesh geometry={halo.geometry} material={halo.material} position-y={geo.centreY} frustumCulled={false} renderOrder={2} />
        {gobo && (
          <>
            <primitive object={target} position={gobo.target} />
            <spotLight
              ref={spot}
              position-y={geo.centreY}
              target={target}
              color={light}
              intensity={gobo.intensity}
              angle={0.95}
              penumbra={0.35}
              decay={2}
              distance={0}
              map={gobo.map}
              castShadow
              shadow-mapSize-width={gobo.shadowSize}
              shadow-mapSize-height={gobo.shadowSize}
              shadow-bias={-0.0005}
              shadow-camera-near={0.2}
              shadow-camera-far={12}
            />
          </>
        )}
      </group>
    </group>
  );
}
