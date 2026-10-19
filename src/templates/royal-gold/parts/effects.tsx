'use client';

import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, NormalBlending, ShaderMaterial } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';

/**
 * Light effects as cheap shader meshes (one draw call each): the white-gold exposure flash, the
 * radial burst out of the pochette, sun shafts through the arch, dust motes and lantern halos.
 * Each exposes a ShaderMaterial whose uniforms the scene drives every frame.
 */

function useDispose(...items: { dispose(): void }[]) {
  useEffect(() => () => items.forEach((i) => i.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Full-screen white-gold exposure (drawn last, over everything). */
export function useFlash(color: string) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: NormalBlending,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          uniform vec3 uColor; uniform float uK; varying vec2 vP;
          void main(){
            float r = length(vP * vec2(0.8, 1.0));
            vec3 c = uColor * (1.6 + 0.9 * (1.0 - smoothstep(0.0, 1.2, r)));
            gl_FragColor = vec4(c, uK * (0.82 + 0.18 * (1.0 - smoothstep(0.2, 1.3, r))));
          }`,
      }),
    [color],
  );
  useDispose(geometry, material);
  return { geometry, material };
}

/** Rays fanning out of the pochette: thin additive wedges, longer and shorter in turn. */
export function useRadialBurst(color: string, count = 28) {
  const geometry = useMemo(() => {
    const rand = mulberry32(23);
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.12;
      const len = (i % 2 ? 2.6 : 4.4) * (0.7 + rand() * 0.6);
      const w0 = 0.05;
      const w1 = 0.22 + rand() * 0.35;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const nx = -dy;
      const ny = dx;
      const b = pos.length / 3;
      pos.push(nx * -w0, ny * -w0, 0, nx * w0, ny * w0, 0, dx * len + nx * -w1, dy * len + ny * -w1, 0, dx * len + nx * w1, dy * len + ny * w1, 0);
      uv.push(0, 0, 1, 0, 0, 1, 1, 1);
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    g.setIndex(idx);
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 0 } },
        vertexShader: 'varying vec2 vUv; uniform float uK; void main(){ vUv = uv; vec3 p = position * (0.35 + 0.9 * uK); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: `
          uniform vec3 uColor; uniform float uK; varying vec2 vUv;
          void main(){
            float across = sin(3.14159 * vUv.x);
            float along = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.08, vUv.y);
            gl_FragColor = vec4(uColor * 2.2, uK * across * along);
          }`,
      }),
    [color],
  );
  useDispose(geometry, material);
  return { geometry, material };
}

export interface Shaft {
  from: [number, number, number];
  to: [number, number, number];
  width: number;
}

/**
 * Sun shafts: quads stretched between two points and turned around their own axis to face the
 * camera (cylindrical billboards), soft-edged and fading at both ends.
 */
export function useShafts(color: string, shafts: Shaft[]) {
  const geometry = useMemo(() => {
    const A: number[] = [];
    const B: number[] = [];
    const W: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    shafts.forEach((s, i) => {
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        A.push(...s.from);
        B.push(...s.to);
        W.push(s.width, i);
        uv.push(u, v);
      }
      const b = i * 4;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(A), 3));
    g.setAttribute('aB', new BufferAttribute(new Float32Array(B), 3));
    g.setAttribute('aW', new BufferAttribute(new Float32Array(W), 2));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    g.setIndex(idx);
    return g;
  }, [shafts]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `
          attribute vec3 aB; attribute vec2 aW;
          varying vec2 vUv; varying float vSeed;
          void main(){
            vUv = uv; vSeed = aW.y;
            vec3 P = mix(position, aB, uv.y);
            vec3 axis = normalize(aB - position);
            vec3 side = normalize(cross(axis, normalize(cameraPosition - P)));
            P += side * (uv.x - 0.5) * aW.x * mix(0.55, 1.5, uv.y);
            gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uK; uniform float uTime;
          varying vec2 vUv; varying float vSeed;
          void main(){
            float across = pow(sin(3.14159 * vUv.x), 2.0);
            float along = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.62, 1.0, vUv.y));
            float breathe = 0.8 + 0.2 * sin(uTime * 0.45 + vSeed * 1.9);
            gl_FragColor = vec4(uColor, uK * across * along * breathe * 0.1);
          }`,
      }),
    [color],
  );
  useDispose(geometry, material);
  return { geometry, material };
}

/** Dust motes drifting in a box (seeded; time comes from the scene so captures are exact). */
export function useMotes(color: string, count: number, box: { min: [number, number, number]; size: [number, number, number] }, size = 26) {
  const geometry = useMemo(() => {
    const rand = mulberry32(61);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand();
      pos[i * 3 + 1] = rand();
      pos[i * 3 + 2] = rand();
      seed[i] = rand();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(color) },
          uK: { value: 1 },
          uTime: { value: 0 },
          uMin: { value: box.min },
          uSize: { value: box.size },
          uPx: { value: size },
        },
        vertexShader: `
          attribute float aSeed;
          uniform float uTime; uniform vec3 uMin; uniform vec3 uSize; uniform float uPx;
          varying float vA;
          void main(){
            vec3 p = position;
            p.y = fract(p.y + uTime * (0.006 + aSeed * 0.01));
            p.x = fract(p.x + sin(uTime * 0.21 + aSeed * 31.0) * 0.015);
            p.z += sin(uTime * 0.17 + aSeed * 17.0) * 0.02;
            vec3 w = uMin + p * uSize;
            vec4 mv = viewMatrix * vec4(w, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uPx * (0.4 + aSeed) / -mv.z;
            vA = (0.45 + 0.55 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0)) * smoothstep(0.0, 0.1, p.y) * (1.0 - smoothstep(0.85, 1.0, p.y));
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uK; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(uColor * 1.4, smoothstep(0.5, 0.0, d) * vA * uK);
          }`,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, size, box.min.join(), box.size.join()],
  );
  useDispose(geometry, material);
  return { geometry, material };
}

/** A soft glow billboard (lantern halo, card glow). Size in world units via uSize. */
export function useHalo(color: string, size: number) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 1, 3, 2]);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 1 }, uSize: { value: size } },
        vertexShader: `
          uniform float uSize; varying vec2 vP;
          void main(){
            vP = position.xy;
            vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            mv.xy += position.xy * uSize;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uK; varying vec2 vP;
          void main(){
            float r = length(vP);
            float a = exp(-r * r * 5.0) * 0.9 + exp(-r * r * 40.0) * 0.6;
            gl_FragColor = vec4(uColor, a * uK * (1.0 - smoothstep(0.85, 1.0, r)));
          }`,
      }),
    [color, size],
  );
  useDispose(geometry, material);
  return { geometry, material };
}

/** Gold dust thrown out by the bursting seal (progress 0..1 in uP). */
export function useDustBurst(color: string, count: number) {
  const geometry = useMemo(() => {
    const rand = mulberry32(88);
    const dir = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const z = 0.15 + rand() * 0.85;
      const r = Math.sqrt(1 - z * z);
      dir[i * 3] = Math.cos(a) * r;
      dir[i * 3 + 1] = Math.sin(a) * r;
      dir[i * 3 + 2] = z * 0.7;
      seed[i] = rand();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(dir, 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(color) }, uP: { value: 0 } },
        vertexShader: `
          attribute float aSeed; uniform float uP; varying float vA;
          void main(){
            float e = 1.0 - pow(1.0 - uP, 2.5);
            vec3 p = position * (0.25 + aSeed * 1.9) * e;
            p.y -= uP * uP * 0.7 * (0.5 + aSeed);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (3.0 + aSeed * 6.0) * (5.0 / -mv.z) * (1.0 - uP * 0.5);
            vA = step(0.001, uP) * (1.0 - smoothstep(0.55, 1.0, uP)) * (0.6 + 0.4 * aSeed);
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(uColor * 1.8, smoothstep(0.5, 0.0, d) * vA);
          }`,
      }),
    [color],
  );
  useDispose(geometry, material);
  return { geometry, material };
}
