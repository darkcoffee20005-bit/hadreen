'use client';

import { useEffect, useMemo } from 'react';
import { Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, ShaderMaterial, Shape, ShapeGeometry } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';

/** A five-petal blossom outline (radius ~1), cupped a little in z by the vertex shader. */
export function blossomShape(petals = 5, samples = 60): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    // Rounded petals with a small notch at each tip.
    const lobe = Math.abs(Math.cos((a * petals) / 2));
    const r = 0.35 + 0.65 * Math.pow(lobe, 0.6) - 0.08 * Math.pow(lobe, 40);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/**
 * White blossoms drifting down in front of the arch: instanced, animated entirely on the GPU
 * (fall, sway, tumble) from a seeded table; time is a uniform the scene drives.
 */
export function useBlossoms(count: number, color: string, centre: string, box: { min: [number, number, number]; size: [number, number, number] }, size = 0.075) {
  const mesh = useMemo(() => {
    const geo = new ShapeGeometry(new Shape(blossomShape().map(([x, y]) => ({ x: x * size, y: y * size }) as never)), 1);
    const rand = mulberry32(31);
    const seed = new Float32Array(count * 4);
    const spin = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seed.set([rand(), rand(), rand(), rand()], i * 4);
      spin.set([rand(), rand(), rand(), rand()], i * 4);
    }
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aSpin', new InstancedBufferAttribute(spin, 4));
    const mat = new ShaderMaterial({
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMin: { value: box.min },
        uSize: { value: box.size },
        uColor: { value: new Color(color) },
        uCentre: { value: new Color(centre) },
        uR: { value: size },
        uK: { value: 1 },
      },
      vertexShader: `
        attribute vec4 aSeed; attribute vec4 aSpin;
        uniform float uTime; uniform vec3 uMin; uniform vec3 uSize; uniform float uR;
        varying float vShade; varying float vFade; varying float vR;
        mat3 rot(vec3 a, float t){ a = normalize(a); float s = sin(t), c = cos(t), o = 1.0 - c;
          return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                      o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                      o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
        void main(){
          vR = length(position.xy) / uR;
          vec3 lp = position;
          lp.z = -vR * vR * uR * 0.35;
          mat3 R = rot(aSpin.xyz * 2.0 - 1.0 + vec3(0.0, 0.0, 0.01), uTime * (0.6 + aSpin.w * 1.4) + aSeed.w * 12.0);
          lp = R * lp;
          vec3 n = R * vec3(0.0, 0.0, 1.0);
          float fall = uTime * (0.26 + aSpin.w * 0.24);
          vec3 p = uMin + aSeed.xyz * uSize;
          float y = mod(p.y - uMin.y - fall, uSize.y);
          p.y = uMin.y + y;
          p.x += sin(uTime * 0.45 + aSeed.w * 6.28) * 0.45 + uTime * 0.05;
          p.x = uMin.x + mod(p.x - uMin.x, uSize.x);
          p.z += cos(uTime * 0.37 + aSeed.w * 4.0) * 0.3;
          vFade = smoothstep(0.0, 0.8, y) * (1.0 - smoothstep(uSize.y - 0.8, uSize.y, y));
          vFade *= smoothstep(1.2, 3.5, distance(cameraPosition, p));
          vShade = 0.72 + 0.28 * abs(dot(n, normalize(vec3(0.3, 0.8, 0.5))));
          gl_Position = projectionMatrix * viewMatrix * vec4(p + lp, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uCentre; uniform float uK;
        varying float vShade; varying float vFade; varying float vR;
        void main(){
          vec3 c = mix(uCentre, uColor, smoothstep(0.12, 0.3, vR)) * vShade;
          c += vec3(0.06, 0.05, 0.03) * (1.0 - vR);
          gl_FragColor = vec4(c, vFade * uK * (0.92 - 0.25 * smoothstep(0.7, 1.0, vR)));
        }`,
    });
    const m = new InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, color, centre, size, box.min.join(), box.size.join()]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return mesh;
}
