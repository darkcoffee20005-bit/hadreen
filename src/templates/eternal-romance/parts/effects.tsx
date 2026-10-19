'use client';

import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { folds, petalShape } from '../geometry';

/**
 * Cheap shader effects for the theatre, one draw call each: falling rose petals, bokeh dust,
 * the spotlight's soft beam, the burgundy back wall and the side drapes (legs).
 */
const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

function useDispose(items: { dispose(): void }[]) {
  useEffect(() => () => items.forEach((i) => i.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps
}

export interface Box {
  min: [number, number, number];
  size: [number, number, number];
}

/**
 * Rose petals falling and tumbling, animated entirely on the GPU from a seeded table. Most fall
 * through the whole theatre (box A); a share (box B) drifts down around the table for the close
 * shots. uT = seconds since the petals began (they fade in where they are, then fall).
 */
export function usePetals(count: number, rose: string, deep: string, a: Box, b: Box) {
  const mesh = useMemo(() => {
    const d = petalShape(4, 5);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(d.position, 3));
    geo.setAttribute('uv', new BufferAttribute(d.uv, 2));
    geo.setIndex(new BufferAttribute(d.index, 1));
    const rand = mulberry32(53);
    const seed = new Float32Array(count * 4);
    const spin = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seed.set([rand(), rand(), rand(), rand()], i * 4);
      spin.set([rand(), rand(), rand(), i % 5 === 0 ? 1 : 0], i * 4);
    }
    geo.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aSpin', new InstancedBufferAttribute(spin, 4));
    const mat = new ShaderMaterial({
      side: DoubleSide,
      transparent: true,
      depthWrite: true,
      uniforms: {
        uT: { value: -1 },
        uTime: { value: 0 },
        uMinA: { value: new Vector3(...a.min) },
        uSizeA: { value: new Vector3(...a.size) },
        uMinB: { value: new Vector3(...b.min) },
        uSizeB: { value: new Vector3(...b.size) },
        uRose: { value: new Color(rose) },
        uDeep: { value: new Color(deep) },
        uLight: { value: 1 },
        uGust: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed; attribute vec4 aSpin;
        uniform float uT; uniform float uTime; uniform float uGust;
        uniform vec3 uMinA; uniform vec3 uSizeA; uniform vec3 uMinB; uniform vec3 uSizeB;
        varying vec2 vUv; varying float vLit; varying float vA; varying float vBack;
        mat3 rot(vec3 a, float t){ a = normalize(a); float s = sin(t), c = cos(t), o = 1.0 - c;
          return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                      o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                      o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
        void main(){
          bool inB = aSpin.w > 0.5;
          vec3 mn = inB ? uMinB : uMinA;
          vec3 sz = inB ? uSizeB : uSizeA;
          float size = inB ? 0.05 : 0.085;
          float age = uT - aSeed.w * 1.4;
          float speed = (inB ? 0.16 : 0.42) + aSeed.w * (inB ? 0.1 : 0.3);
          vec3 p = mn + aSeed.xyz * sz;
          float y = mod(p.y - mn.y - max(age, 0.0) * speed - uGust * 0.6, sz.y);
          p.y = mn.y + y;
          float tt = uTime + aSeed.w * 40.0;
          p.x += sin(tt * 0.5 + aSeed.w * 6.28) * (inB ? 0.12 : 0.4) + uGust * (aSeed.z - 0.5) * 1.5;
          p.z += cos(tt * 0.37 + aSeed.x * 4.0) * (inB ? 0.1 : 0.3);
          mat3 R = rot(aSpin.xyz * 2.0 - 1.0 + vec3(0.0, 0.0, 0.01), tt * (0.7 + aSpin.y * 1.3));
          vec3 lp = R * (position * size);
          vec3 n = R * vec3(0.0, 0.0, 1.0);
          vec4 wp = modelMatrix * vec4(p + lp, 1.0);
          vec3 toCam = normalize(cameraPosition - wp.xyz);
          vec3 L = normalize(vec3(0.2, 1.0, 0.45));
          vLit = 0.35 + 0.65 * abs(dot(n, L));
          vBack = pow(1.0 - abs(dot(n, toCam)), 2.0);
          vA = smoothstep(0.0, 0.9, age) * smoothstep(0.0, 0.5, y) * (1.0 - smoothstep(sz.y - 0.5, sz.y, y));
          vA *= smoothstep(0.35, 1.2, distance(cameraPosition, wp.xyz));
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uRose; uniform vec3 uDeep; uniform float uLight;
        varying vec2 vUv; varying float vLit; varying float vA; varying float vBack;
        void main(){
          if (vA < 0.02) discard;
          vec3 c = mix(uDeep, uRose, smoothstep(0.0, 0.7, vUv.y));
          c *= vLit;
          c += uRose * vBack * 0.45;
          c += vec3(0.06, 0.02, 0.02) * (1.0 - abs(vUv.x - 0.5) * 2.0);
          gl_FragColor = vec4(c * uLight, vA);
          ${OUT}
        }`,
    });
    const m = new InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, rose, deep, a.min.join(), a.size.join(), b.min.join(), b.size.join()]);
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

/** Warm dust in the air: soft discs that grow and fade away from the focus distance (bokeh). */
export function useDust(color: string, count: number, box: Box) {
  const geometry = useMemo(() => {
    const rand = mulberry32(71);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([rand(), rand(), rand()], i * 3);
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
          uMin: { value: new Vector3(...box.min) },
          uSize: { value: new Vector3(...box.size) },
          uFocus: { value: 6 },
          uPx: { value: 40 },
        },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          uniform float uTime; uniform vec3 uMin; uniform vec3 uSize; uniform float uFocus; uniform float uPx;
          varying float vA; varying float vBlur;
          void main(){
            vec3 p = position;
            p.y = fract(p.y + uTime * (0.004 + aSeed * 0.008));
            p.x = fract(p.x + sin(uTime * 0.13 + aSeed * 31.0) * 0.02);
            p.z = fract(p.z + cos(uTime * 0.11 + aSeed * 17.0) * 0.02);
            vec4 mv = viewMatrix * vec4(uMin + p * uSize, 1.0);
            gl_Position = projectionMatrix * mv;
            float depth = -mv.z;
            float blur = clamp(abs(depth - uFocus) / max(1.0, uFocus) * 2.2, 0.0, 3.0);
            vBlur = blur;
            gl_PointSize = uPx * (0.35 + aSeed * 0.8) * (1.0 + blur * 1.6) / max(0.5, depth);
            vA = (0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0)) * smoothstep(0.0, 0.08, p.y) * (1.0 - smoothstep(0.9, 1.0, p.y)) / (1.0 + blur * blur * 0.9);
            vA *= smoothstep(0.4, 1.2, depth);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uK; varying float vA; varying float vBlur;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float disc = mix(smoothstep(0.5, 0.0, d), smoothstep(0.5, 0.38, d) * 0.8 + smoothstep(0.42, 0.0, d) * 0.35, clamp(vBlur * 0.5, 0.0, 1.0));
            gl_FragColor = vec4(uColor * 1.3, disc * vA * uK);
            ${OUT}
          }`,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, box.min.join(), box.size.join()],
  );
  useDispose([geometry, material]);
  return { geometry, material };
}

/**
 * The spotlight's beam: an open cone from the lamp to its pool, brightest along the axis you look
 * through and fading at the lamp and the floor. Placed and scaled every frame by the scene.
 */
export function useBeam(color: string) {
  const geometry = useMemo(() => {
    const g = new ConeGeometry(1, 1, 40, 8, true);
    g.translate(0, -0.5, 0);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 1 } },
        vertexShader: /* glsl */ `
          varying float vAlong; varying vec3 vN; varying vec3 vV;
          void main(){
            vAlong = position.z;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vV = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uK;
          varying float vAlong; varying vec3 vN; varying vec3 vV;
          void main(){
            float facing = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
            float along = smoothstep(0.0, 0.25, vAlong) * (1.0 - smoothstep(0.55, 1.0, vAlong));
            gl_FragColor = vec4(uColor, facing * along * uK * 0.16);
            ${OUT}
          }`,
      }),
    [color],
  );
  useDispose([geometry, material]);
  return { geometry, material };
}

/** The back wall: burgundy darkness with a soft glow behind the façade and faint drape folds. */
export function useBackWall(centre: string, edge: string) {
  const geometry = useMemo(() => new PlaneGeometry(80, 36), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        depthWrite: true,
        uniforms: { uCentre: { value: new Color(centre) }, uEdge: { value: new Color(edge) }, uK: { value: 1 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform vec3 uCentre; uniform vec3 uEdge; uniform float uK;
          varying vec2 vP;
          void main(){
            vec2 q = (vP - vec2(0.0, -12.0)) / vec2(10.0, 7.5);
            float g = exp(-dot(q, q) * 1.3);
            float drape = 0.9 + 0.1 * sin(vP.x * 2.6 + sin(vP.x * 0.7) * 2.0);
            vec3 c = mix(uEdge, uCentre, g * uK) * drape;
            gl_FragColor = vec4(c, 1.0);
            ${OUT}
          }`,
      }),
    [centre, edge],
  );
  useDispose([geometry, material]);
  return { geometry, material };
}

/** Side drapes (theatre legs) standing in the wings: pleated velvet planes, instanced. */
export function useLegs(color: string, placements: [number, number, number][]) {
  const mesh = useMemo(() => {
    const g = new PlaneGeometry(3, 11, 60, 1);
    const p = g.attributes.position as BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, folds(p.getX(i) * 1.3 + 3) * 0.2);
    g.translate(0, 5.5, 0);
    g.computeVertexNormals();
    const m = new MeshStandardMaterial({ color, roughness: 0.9, side: DoubleSide });
    const inst = new InstancedMesh(g, m, placements.length);
    const mat = new Matrix4();
    placements.forEach(([x, z, ry], i) => {
      mat.makeRotationY(ry);
      mat.setPosition(x, 0, z);
      inst.setMatrixAt(i, mat);
    });
    return inst;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, placements.map((p) => p.join()).join('|')]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    },
    [mesh],
  );
  return mesh;
}
