'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, type Group, type ShaderMaterial } from 'three';

/**
 * Soft volumetric-looking light shafts: additive gradient cards, slowly breathing.
 * The cheap stand-in for real volumetrics, used on every tier.
 */
export function LightRays({
  color = '#FFE2A8',
  count = 5,
  length = 9,
  spread = 2.4,
  intensity,
}: {
  color?: string;
  count?: number;
  length?: number;
  spread?: number;
  /** 0..1, driven by the scene (e.g. rising during the opening). */
  intensity: React.RefObject<number>;
}) {
  const group = useRef<Group>(null);
  const materials = useRef<ShaderMaterial[]>([]);
  const rays = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i / Math.max(1, count - 1) - 0.5) * spread,
        rot: (i - (count - 1) / 2) * 0.12,
        width: 0.5 + ((i * 37) % 10) / 14,
        phase: i * 1.7,
      })),
    [count, spread],
  );
  const uniforms = useMemo(() => rays.map(() => ({ uColor: { value: new Color(color) }, uAlpha: { value: 0 }, uTime: { value: 0 } })), [rays, color]);

  useFrame(({ clock }) => {
    const k = intensity.current ?? 0;
    uniforms.forEach((u, i) => {
      u.uTime.value = clock.elapsedTime + rays[i]!.phase;
      u.uAlpha.value = k * (0.1 + 0.05 * Math.sin(clock.elapsedTime * 0.5 + rays[i]!.phase));
    });
    if (group.current) group.current.visible = k > 0.001;
  });

  return (
    <group ref={group}>
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x, 1.5, -1.8]} rotation={[0, 0, r.rot]}>
          <planeGeometry args={[r.width, length]} />
          <shaderMaterial
            ref={(m) => {
              if (m) materials.current[i] = m;
            }}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            uniforms={uniforms[i]}
            vertexShader={'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'}
            fragmentShader={`
              uniform vec3 uColor; uniform float uAlpha; uniform float uTime;
              varying vec2 vUv;
              void main() {
                float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
                float fall = smoothstep(0.0, 0.85, vUv.y);
                float flicker = 0.85 + 0.15 * sin(vUv.y * 9.0 - uTime * 0.7);
                gl_FragColor = vec4(uColor, uAlpha * edge * edge * fall * flicker);
              }`}
          />
        </mesh>
      ))}
    </group>
  );
}
