'use client';

import { useEffect, useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';

/**
 * The dusk over the avenue: plum overhead (#3A2638) falling to rose at the horizon (#E6A9A6),
 * a warm afterglow low behind the palace, and the first stars. One draw call, always behind.
 */
export function useDuskSky(top: string, low: string, mist: string, glow: string) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTop: { value: new Color(top) }, uLow: { value: new Color(low) }, uMist: { value: new Color(mist) }, uGlow: { value: new Color(glow) }, uTime: { value: 0 } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uLow, uMist, uGlow; uniform float uTime; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          void main(){
            vec3 d = normalize(vDir);
            float h = d.y;
            float up = pow(clamp(h / 0.42, 0.0, 1.0), 0.62);
            vec3 col = mix(uLow, uTop, up);
            col = mix(col, uMist, smoothstep(0.06, -0.05, h));
            // Afterglow low behind the palace (−z).
            float g = max(dot(normalize(vec3(d.x, 0.0, d.z)), vec3(0.0, 0.0, -1.0)), 0.0);
            float band = exp(-max(h, 0.0) * 9.0) * smoothstep(-0.04, 0.02, h);
            col += uGlow * pow(g, 3.0) * band * 0.45;
            // Stars, high up, faint.
            vec3 q = floor(d * 220.0);
            float s = step(0.9965, hash(q));
            float tw = 0.65 + 0.35 * sin(uTime * 1.7 + hash(q + 1.0) * 40.0);
            col += vec3(1.0, 0.94, 0.9) * s * tw * smoothstep(0.22, 0.5, h) * 0.75;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [top, low, mist, glow],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function DuskSky({ material }: { material: ShaderMaterial }) {
  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[95, 32, 16]} />
    </mesh>
  );
}
