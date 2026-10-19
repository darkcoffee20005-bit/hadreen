'use client';

import { useMemo } from 'react';
import { BackSide, Color } from 'three';

/** A gradient sky dome with a soft glow toward a light direction. Costs one draw call. */
export function Sky({
  top,
  horizon,
  bottom,
  glow = '#ffffff',
  glowDir = [0.3, 0.4, -1],
  glowStrength = 0.25,
  radius = 60,
}: {
  top: string;
  horizon: string;
  bottom: string;
  glow?: string;
  glowDir?: [number, number, number];
  glowStrength?: number;
  radius?: number;
}) {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color(top) },
      uHorizon: { value: new Color(horizon) },
      uBottom: { value: new Color(bottom) },
      uGlow: { value: new Color(glow) },
      uGlowDir: { value: glowDir },
      uGlowStrength: { value: glowStrength },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [top, horizon, bottom, glow, glowStrength, glowDir.join(',')],
  );
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`}
        fragmentShader={`
          uniform vec3 uTop, uHorizon, uBottom, uGlow;
          uniform vec3 uGlowDir;
          uniform float uGlowStrength;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(uHorizon, uTop, smoothstep(0.0, 0.65, h)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.4, -h));
            float g = max(dot(normalize(vDir), normalize(uGlowDir)), 0.0);
            col += uGlow * pow(g, 6.0) * uGlowStrength;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}
