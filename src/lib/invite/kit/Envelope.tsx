'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DoubleSide, ExtrudeGeometry, Shape, type Group, type Mesh } from 'three';
import { floralBorderHeight, heightToNormal } from '../stage/textures';

export interface EnvelopeState {
  /** 0 closed … 1 flap fully open (swings toward the camera and up). */
  flap: number;
}

/**
 * The back of an envelope, facing the camera, with its flap down over the front. The paper
 * carries an embossed floral border (procedural normal map); the liner shows when the flap opens.
 */
export function Envelope({
  width = 3.2,
  height = 2.1,
  paper,
  liner,
  edge,
  state,
  children,
}: {
  width?: number;
  height?: number;
  paper: string;
  liner: string;
  /** Thin metallic edge around the flap (gold foil), so the flap reads in any light. */
  edge?: string;
  state: React.RefObject<EnvelopeState>;
  /** Placed at the flap's tip (e.g. the wax seal); moves with the flap. */
  children?: React.ReactNode;
}) {
  const flap = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const depth = 0.05;
  const tipY = -height * 0.62;

  const flapGeometry = useMemo(() => {
    const s = new Shape();
    const r = 0.06;
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(r * 1.5, tipY + r);
    s.quadraticCurveTo(0, tipY - r * 0.4, -r * 1.5, tipY + r);
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
    return g;
  }, [width, tipY]);

  const emboss = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const w = 1024;
    const h = Math.round((w * height) / width);
    const map = floralBorderHeight(w, h);
    // The folds of the envelope's back: two side flaps and the bottom pocket meeting under the flap.
    const ctx = map.getContext('2d')!;
    ctx.filter = 'blur(2px)';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.5, h * 0.42);
    ctx.lineTo(w, h);
    ctx.stroke();
    return heightToNormal(map, 2.2);
  }, [width, height]);

  // drei's RoundedBox carries world-space UVs; map the front face 0..1 so the emboss fits it.
  useLayoutEffect(() => {
    const g = body.current?.geometry;
    const pos = g?.attributes.position;
    const uv = g?.attributes.uv;
    if (!g || !pos || !uv) return;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / width + 0.5, pos.getY(i) / height + 0.5);
    uv.needsUpdate = true;
  }, [width, height]);

  useEffect(
    () => () => {
      flapGeometry.dispose();
      emboss?.dispose();
    },
    [flapGeometry, emboss],
  );

  useFrame(() => {
    if (flap.current && state.current) flap.current.rotation.x = -Math.PI * 0.94 * state.current.flap;
  });

  return (
    <group>
      <RoundedBox ref={body} args={[width, height, depth]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <meshPhysicalMaterial color={paper} roughness={0.86} sheen={0.35} sheenColor="#ffffff" normalMap={emboss} normalScale={[0.6, 0.6]} />
      </RoundedBox>
      <group ref={flap} position={[0, height / 2 - 0.01, depth / 2 + 0.006]}>
        <mesh geometry={flapGeometry} castShadow scale={edge ? [0.985, 0.985, 1] : 1} position-z={edge ? 0.001 : 0}>
          <meshPhysicalMaterial color={paper} roughness={0.8} sheen={0.3} sheenColor="#ffffff" side={DoubleSide} />
        </mesh>
        {edge && (
          <mesh geometry={flapGeometry}>
            <meshStandardMaterial color={edge} roughness={0.35} metalness={0.85} emissive={edge} emissiveIntensity={0.18} side={DoubleSide} />
          </mesh>
        )}
        {/* Liner: visible once the flap has turned past upright. */}
        <mesh geometry={flapGeometry} position={[0, 0, -0.002]} scale={[0.94, 0.94, 1]}>
          <meshStandardMaterial color={liner} roughness={0.6} metalness={0.2} side={DoubleSide} />
        </mesh>
        <group position={[0, tipY + 0.12, 0.03]}>{children}</group>
      </group>
    </group>
  );
}
