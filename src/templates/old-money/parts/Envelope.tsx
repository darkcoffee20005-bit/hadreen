'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BackSide,
  BoxGeometry,
  Color,
  FrontSide,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
  type InstancedMesh,
  type Mesh,
} from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { cssFontFamily } from '@/lib/invite/stage/textures';
import { bodyNormal, flapMaps } from '../art';
import { flapGeometry } from '../geometry';
import { CORNER_AT, CORNER_BLOOMS, CORNER_LEAVES, curlPoint, ENVELOPE, PEARL_RADIUS, pearlRest } from '../layout';
import { Flowers } from './Flowers';

export interface EnvelopeAnim {
  /** 0 closed … 1 folded back. */
  flap: number;
  /** Damped swing of the pearl string (signed). */
  swing: number;
  /** Position of the glint running along the pearls, 0..1; outside that range no glint. */
  glint: number;
  /** Seconds, for the flowers' breath (0 under capture). */
  time: number;
}

export const ENVELOPE_REST: EnvelopeAnim = { flap: 0, swing: 0, glint: -1, time: 0 };

export interface EnvelopeColors {
  paper: string;
  liner: string;
  pearl: string;
  relief: string;
  petal: string;
  leaf: string;
}

/**
 * The envelope from the back: cotton paper with its pocket folds, a V flap with the couple's
 * monogram blind-embossed where it points, a string of pearls along both of the flap's edges,
 * and a little white bouquet tucked at the lower-left corner.
 */
export function Envelope({ colors, monogram, fontVar, state, onReady }: { colors: EnvelopeColors; monogram: string; fontVar: string; state: React.RefObject<EnvelopeAnim>; onReady?: () => void }) {
  const { width: W, height: H, depth: D } = ENVELOPE;
  const flapFront = useRef<Mesh>(null);
  const pearls = useRef<InstancedMesh>(null);
  const flowers = useRef<import('three').Group>(null);
  const shown = useRef({ flap: -1, swing: 0, glint: -2 });

  const body = useMemo(() => {
    const g = new BoxGeometry(W, H, D, 1, 1, 1);
    const normal = typeof document === 'undefined' ? null : bodyNormal(512);
    const m = new MeshPhysicalMaterial({
      color: colors.paper,
      roughness: 0.88,
      sheen: 0.45,
      sheenColor: '#ffffff',
      sheenRoughness: 0.6,
      normalMap: normal,
      normalScale: new Vector2(0.55, 0.55),
    });
    return { g, m, normal };
  }, [W, H, D, colors.paper]);

  const flap = useMemo(() => {
    const g = flapGeometry(W);
    const rest = Float32Array.from(g.attributes.position!.array as Float32Array);
    const front = new MeshPhysicalMaterial({ color: colors.paper, roughness: 0.86, sheen: 0.45, sheenColor: '#ffffff', sheenRoughness: 0.6, side: FrontSide });
    const back = new MeshStandardMaterial({ color: colors.liner, roughness: 0.9, side: BackSide });
    return { g, rest, front, back };
  }, [W, colors.paper, colors.liner]);

  // The embossed monogram needs the font: drawn once it has loaded, then swapped in.
  const [maps, setMaps] = useState<Awaited<ReturnType<typeof flapMaps>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    flapMaps(monogram, cssFontFamily(fontVar, 'serif'), colors.paper, colors.relief).then((m) => {
      if (cancelled) {
        m.map.dispose();
        m.normal.dispose();
        return;
      }
      setMaps(m);
      onReady?.();
    });
    return () => {
      cancelled = true;
    };
  }, [monogram, fontVar, colors.paper, colors.relief, onReady]);
  useLayoutEffect(() => {
    if (!maps) return;
    flap.front.color.set('#ffffff');
    flap.front.map = maps.map;
    flap.front.normalMap = maps.normal;
    flap.front.normalScale.set(0.7, 0.7);
    flap.front.needsUpdate = true;
  }, [maps, flap.front]);
  useEffect(
    () => () => {
      maps?.map.dispose();
      maps?.normal.dispose();
    },
    [maps],
  );

  const pearlKit = useMemo(() => {
    const g = new SphereGeometry(1, 18, 14);
    const m = new MeshPhysicalMaterial({
      color: colors.pearl,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.6,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [180, 420],
      sheen: 0.35,
      sheenColor: '#ffffff',
    });
    return { g, m, rest: pearlRest() };
  }, [colors.pearl]);

  useEffect(
    () => () => {
      body.g.dispose();
      body.m.dispose();
      body.normal?.dispose();
      flap.g.dispose();
      flap.front.dispose();
      flap.back.dispose();
      pearlKit.g.dispose();
      pearlKit.m.dispose();
    },
    [body, flap, pearlKit],
  );

  const tmp = useMemo(() => ({ m: new Matrix4(), c: new Color(), base: new Color(colors.pearl), hi: new Color(mixHex(colors.pearl, '#ffffff', 0.7)) }), [colors.pearl]);

  useFrame(() => {
    const s = state.current;
    if (!s) return;
    const last = shown.current;
    const moved = Math.abs(s.flap - last.flap) > 1e-5 || Math.abs(s.swing - last.swing) > 1e-5;
    if (moved) {
      // Curl the flap's paper.
      const pos = flap.g.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const { p } = curlPoint(flap.rest[i * 3]!, -flap.rest[i * 3 + 1]!, s.flap);
        pos.setXYZ(i, p[0], p[1], p[2]);
      }
      pos.needsUpdate = true;
      flap.g.computeVertexNormals();
      flap.g.computeBoundingSphere();
    }
    const mesh = pearls.current;
    if (mesh && (moved || Math.abs(s.glint - last.glint) > 1e-4)) {
      pearlKit.rest.forEach((r, i) => {
        const { p, n } = curlPoint(r.x, r.d, s.flap);
        // Strung along the very edge (half above the paper, half below), so they read from both
        // sides once the flap turns over; the middle of each run swings out the most.
        const lift = PEARL_RADIUS * 0.45 + s.swing * 0.05 * Math.sin(Math.PI * r.s);
        const droop = s.swing * 0.03 * Math.sin(Math.PI * r.s);
        tmp.m.makeScale(PEARL_RADIUS, PEARL_RADIUS, PEARL_RADIUS);
        tmp.m.setPosition(p[0] + n[0] * lift + r.side * droop * 0.3, p[1] + n[1] * lift - droop, p[2] + n[2] * lift);
        mesh.setMatrixAt(i, tmp.m);
        // The glint runs from the corners down to the tip on both sides at once.
        const g = s.glint >= 0 && s.glint <= 1 ? Math.exp(-(((r.s - s.glint) / 0.06) ** 2)) : 0;
        mesh.setColorAt(i, tmp.c.copy(tmp.base).lerp(tmp.hi, g));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    last.flap = s.flap;
    last.swing = s.swing;
    last.glint = s.glint;
    if (flowers.current) {
      const t = s.time;
      flowers.current.rotation.set(Math.sin(t * 0.9) * 0.025, Math.sin(t * 0.7 + 1) * 0.03, Math.sin(t * 0.5) * 0.02);
    }
  });

  // Seed the instance colours so the attribute exists from the first frame.
  useLayoutEffect(() => {
    const mesh = pearls.current;
    if (!mesh) return;
    for (let i = 0; i < pearlKit.rest.length; i++) mesh.setColorAt(i, tmp.base);
    shown.current.flap = -1;
  }, [pearlKit, tmp]);

  return (
    <group>
      <mesh geometry={body.g} material={body.m} castShadow receiveShadow />
      <group position={[0, H / 2, D / 2 + 0.002]}>
        <mesh ref={flapFront} geometry={flap.g as BufferGeometry} material={flap.front} castShadow receiveShadow />
        <mesh geometry={flap.g as BufferGeometry} material={flap.back} />
        <instancedMesh ref={pearls} args={[pearlKit.g, pearlKit.m, pearlKit.rest.length]} castShadow frustumCulled={false} />
      </group>
      <group ref={flowers} position={CORNER_AT} scale={1.45}>
        <Flowers blooms={CORNER_BLOOMS} leaves={CORNER_LEAVES} petal={colors.petal} leaf={colors.leaf} />
      </group>
    </group>
  );
}
