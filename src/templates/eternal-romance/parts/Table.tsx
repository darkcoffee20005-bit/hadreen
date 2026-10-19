'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Material,
} from 'three';
import type { Lang } from '@/lib/lang';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { canvas } from '@/lib/invite/stage/textures';
import { CANDLES, clothFold, clothProfile, flamePosition, petalShape, roseCluster, roseHead } from '../geometry';
import { FitGoldText } from './FitGoldText';

export interface TablePalette {
  linen: string;
  ivory: string;
  rose: string;
  roseDeep: string;
  roseHi: string;
  gold: string;
  goldDeep: string;
  goldInk: string;
  candle: string;
  leaf: string;
}

/** Uniforms the scene drives every frame: time, flame brightness, the wax's inner glow. */
export function useTableFx() {
  return useMemo(() => ({ uTime: { value: 0 }, uK: { value: 1 }, uGlow: { value: 1 } }), []);
}
export type TableFx = ReturnType<typeof useTableFx>;

const TAU = Math.PI * 2;
const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

function useDispose(items: ({ dispose(): void } | null | undefined)[]) {
  useEffect(() => () => items.forEach((i) => i?.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Gold needs something bright to reflect, but the theatre's environment is kept dim so the velvet
 * stays dark: give gold materials the environment map directly, with their own intensity.
 */
export function useEnvBoost(material: MeshStandardMaterial, intensity: number) {
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    if (scene.environment && material.envMap !== scene.environment) {
      material.envMap = scene.environment;
      material.envMapIntensity = intensity;
      material.needsUpdate = true;
    }
  });
}

/** The floor-length cloth: a lathe over the round table top, the skirt falling in soft folds. */
function clothGeometry(segments: number): BufferGeometry {
  const prof = clothProfile();
  const cols = segments + 1;
  const pos = new Float32Array(prof.length * cols * 3);
  const skirtTop = prof[6]![1];
  prof.forEach(([r, y], j) => {
    const t = y < skirtTop ? 1 - y / skirtTop : 0;
    for (let i = 0; i < cols; i++) {
      const a = (i / segments) * TAU;
      const rr = r + (j >= 6 ? clothFold(a, t) : 0);
      pos.set([Math.cos(a) * rr, y, Math.sin(a) * rr], (j * cols + i) * 3);
    }
  });
  const idx: number[] = [];
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * cols + i;
      const c = a + cols;
      idx.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function roseGeometry(p: TablePalette): BufferGeometry {
  const d = roseHead(16, 6, 5);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(d.position, 3));
  const col = new Float32Array(d.edge.length * 3);
  const c = new Color();
  for (let i = 0; i < d.edge.length; i++) {
    const body = mix(p.roseDeep, mix(p.rose, p.roseHi, 0.25), 0.2 + 0.8 * d.edge[i]!);
    c.set(shade(body, 0.5 + 0.5 * d.inner[i]!));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setIndex(new BufferAttribute(d.index, 1));
  g.computeVertexNormals();
  return g;
}

function leafGeometry(): BufferGeometry {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.36, 0.22, 0.32, 0.72, 0, 1);
  s.bezierCurveTo(-0.32, 0.72, -0.36, 0.22, 0, 0);
  const g = new ShapeGeometry(s, 6);
  const p = g.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, -0.18 * p.getY(i) * p.getY(i) + 0.08 * Math.abs(p.getX(i)));
  g.computeVertexNormals();
  return g;
}

function cardTexture(linen: string, ink: string): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 640;
  const H = 436;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, mix(linen, '#ffffff', 0.35));
  g.addColorStop(1, shade(linen, 0.93));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(32, 32, W - 64, H - 64);
  // Corner flourishes and the little diamond ornament above and below the names.
  ctx.fillStyle = ink;
  for (const [x, y, sx, sy] of [
    [32, 32, 1, 1],
    [W - 32, 32, -1, 1],
    [32, H - 32, 1, -1],
    [W - 32, H - 32, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 18, sx > 0 ? 0 : Math.PI / 2, sx > 0 ? Math.PI / 2 : Math.PI, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + sx * 9, y + sy * 9, 3, 0, TAU);
    ctx.fill();
  }
  for (const y of [74, H - 74]) {
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, y);
    ctx.lineTo(W / 2 - 22, y);
    ctx.moveTo(W / 2 + 22, y);
    ctx.lineTo(W / 2 + 120, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2, y - 10);
    ctx.lineTo(W / 2 + 10, y);
    ctx.lineTo(W / 2, y + 10);
    ctx.lineTo(W / 2 - 10, y);
    ctx.closePath();
    ctx.stroke();
    for (const dx of [-15, 15]) {
      ctx.beginPath();
      ctx.arc(W / 2 + dx, y, 2.4, 0, TAU);
      ctx.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A camera-facing quad per instance (flames stand upright on screen). */
const BILLBOARD = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  varying vec2 vUv; varying float vSeed;
  void main(){
    vUv = uv; vSeed = aSeed;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float sx = length(instanceMatrix[0].xyz);
    float sy = length(instanceMatrix[1].xyz);
    float breathe = 1.0 + 0.07 * sin(uTime * 11.0 + aSeed * 17.0) + 0.04 * sin(uTime * 23.0 + aSeed * 5.0);
    mv.xy += vec2(position.x * sx, (position.y + 0.5) * sy * breathe - 0.5 * sy);
    gl_Position = projectionMatrix * mv;
  }
`;

export function Table({
  palette: p,
  low,
  shadows,
  fx,
  names,
  lang,
  onTextReady,
  roseCount,
}: {
  palette: TablePalette;
  low: boolean;
  shadows: boolean;
  fx: TableFx;
  names: string;
  lang: Lang;
  onTextReady: () => void;
  roseCount: number;
}) {
  const goldMat = useMemo(() => new MeshStandardMaterial({ color: mix(p.gold, '#f2d796', 0.2), metalness: 1, roughness: 0.3 }), [p.gold]);
  useEnvBoost(goldMat, 2.6);
  const cloth = useMemo(() => {
    const geometry = clothGeometry(low ? 64 : 112);
    const material: Material = low
      ? new MeshStandardMaterial({ color: p.linen, roughness: 0.85 })
      : new MeshPhysicalMaterial({ color: p.linen, roughness: 0.8, sheen: 0.7, sheenColor: new Color('#ffffff'), sheenRoughness: 0.55 });
    return { geometry, material };
  }, [low, p.linen]);

  const bowl = useMemo(
    () =>
      new LatheGeometry(
        [
          [0, 0],
          [0.07, 0],
          [0.075, 0.012],
          [0.05, 0.026],
          [0.065, 0.036],
          [0.15, 0.058],
          [0.2, 0.084],
          [0.206, 0.092],
          [0.19, 0.09],
        ].map(([x, y]) => new Vector2(x, y)),
        40,
      ),
    [],
  );

  const roses = useMemo(() => {
    const geometry = roseGeometry(p);
    const material: Material = low
      ? new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide })
      : new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, side: DoubleSide, sheen: 1, sheenColor: new Color(mix(p.roseHi, '#ff8a8a', 0.3)), sheenRoughness: 0.45 });
    const list = roseCluster(roseCount);
    const mesh = new InstancedMesh(geometry, material, list.length);
    const q = new Quaternion();
    const spin = new Quaternion();
    const m = new Matrix4();
    list.forEach((r, i) => {
      const axis = new Vector3(Math.sin(r.yaw), 0, -Math.cos(r.yaw));
      q.setFromAxisAngle(axis, r.tilt);
      spin.setFromAxisAngle(new Vector3(0, 1, 0), i * 1.9);
      q.multiply(spin);
      const s = 0.07 * r.scale;
      m.compose(new Vector3(r.p[0], 0.072 + r.p[1], -0.06 + r.p[2]), q, new Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = shadows;
    return mesh;
  }, [p, low, roseCount, shadows]);

  const leaves = useMemo(() => {
    const geometry = leafGeometry();
    const material = new MeshStandardMaterial({ color: p.leaf, roughness: 0.55, side: DoubleSide });
    const n = 11;
    const mesh = new InstancedMesh(geometry, material, n);
    const m = new Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.2;
      const L = new Vector3(Math.cos(a), -0.3, Math.sin(a)).normalize();
      const N = new Vector3(0, 1, 0).addScaledVector(L, -L.y).normalize();
      const X = new Vector3().crossVectors(L, N).normalize();
      m.makeBasis(X, L, N);
      const s = 0.1 + 0.025 * Math.sin(i * 2.7);
      m.scale(new Vector3(s, s, s));
      m.setPosition(Math.cos(a) * 0.17, 0.08, -0.06 + Math.sin(a) * 0.17);
      mesh.setMatrixAt(i, m);
    }
    return mesh;
  }, [p.leaf]);

  const candles = useMemo(() => {
    const waxGeo = new CylinderGeometry(1, 1, 1, low ? 14 : 22, 1);
    waxGeo.translate(0, 0.5, 0);
    const wax = new MeshStandardMaterial({ color: mix(p.ivory, '#fff6e6', 0.4), roughness: 0.55 });
    wax.onBeforeCompile = (shader) => {
      shader.uniforms.uGlow = fx.uGlow;
      shader.uniforms.uCandle = { value: new Color(p.candle) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vH;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vH; uniform float uGlow; uniform vec3 uCandle;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uCandle * (smoothstep(0.45, 1.0, vH) * 0.5 + 0.06) * uGlow;');
    };
    wax.customProgramCacheKey = () => 'er-wax';
    const waxMesh = new InstancedMesh(waxGeo, wax, CANDLES.length);
    const sticks = CANDLES.filter((c) => c.stick > 0);
    const stickGeo = new LatheGeometry(
      [
        [0, 0],
        [0.28, 0],
        [0.3, 0.03],
        [0.22, 0.06],
        [0.1, 0.1],
        [0.06, 0.18],
        [0.11, 0.24],
        [0.06, 0.3],
        [0.045, 0.6],
        [0.1, 0.66],
        [0.05, 0.72],
        [0.05, 0.9],
        [0.14, 0.95],
        [0.15, 1.0],
        [0.06, 1.0],
      ].map(([x, y]) => new Vector2(x, y)),
      low ? 14 : 24,
    );
    const stickMesh = new InstancedMesh(stickGeo, goldMat, sticks.length);
    const flameGeo = new PlaneGeometry(1, 1);
    const seeds = new Float32Array(CANDLES.map((_, i) => (i * 0.618) % 1));
    flameGeo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    const flameMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: fx.uTime, uK: fx.uK, uCore: { value: new Color('#FFF4D6') }, uEdge: { value: new Color(p.candle) }, uTip: { value: new Color('#FF7A2E') }, uBlue: { value: new Color('#5A6CFF') } },
      vertexShader: BILLBOARD,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uK; uniform vec3 uCore; uniform vec3 uEdge; uniform vec3 uTip; uniform vec3 uBlue;
        varying vec2 vUv; varying float vSeed;
        void main(){
          float y = vUv.y;
          float sway = (0.06 * sin(uTime * 7.0 + vSeed * 9.0) + 0.035 * sin(uTime * 15.0 + vSeed * 3.0)) * y * y;
          float x = vUv.x - 0.5 - sway;
          float w = 0.4 * pow(max(y, 0.0), 0.45) * pow(max(1.0 - y, 0.0), 0.8) + 0.001;
          float d = abs(x) / w;
          float body = 1.0 - smoothstep(0.5, 1.0, d);
          float core = (1.0 - smoothstep(0.0, 0.7, d)) * (1.0 - smoothstep(0.25, 0.75, y)) * smoothstep(0.06, 0.2, y);
          vec3 col = mix(uEdge, uCore, core);
          col = mix(col, uTip, smoothstep(0.55, 1.0, y) * 0.6);
          col = mix(col, uBlue, (1.0 - smoothstep(0.04, 0.2, y)) * 0.55);
          float a = body * (0.7 + 0.3 * core) * uK;
          gl_FragColor = vec4(col * (1.2 + core * 1.6), a);
          ${OUT}
        }`,
    });
    const flames = new InstancedMesh(flameGeo, flameMat, CANDLES.length);
    flames.frustumCulled = false;
    const haloGeo = new PlaneGeometry(1, 1);
    haloGeo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    const haloMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: fx.uTime, uK: fx.uK, uColor: { value: new Color(mix(p.candle, '#ffd9a0', 0.3)) } },
      vertexShader: BILLBOARD,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uK; uniform vec3 uColor;
        varying vec2 vUv; varying float vSeed;
        void main(){
          vec2 q = (vUv - 0.5) * 2.0;
          float r2 = dot(q, q);
          float f = 0.9 + 0.1 * sin(uTime * 9.0 + vSeed * 20.0);
          float a = (exp(-r2 * 4.5) * 0.32 + exp(-r2 * 30.0) * 0.4) * uK * f;
          gl_FragColor = vec4(uColor, a);
          ${OUT}
        }`,
    });
    const halos = new InstancedMesh(haloGeo, haloMat, CANDLES.length);
    halos.frustumCulled = false;
    const m = new Matrix4();
    const q = new Quaternion();
    let k = 0;
    CANDLES.forEach((c, i) => {
      m.compose(new Vector3(c.x, c.stick, c.z), q, new Vector3(c.r, c.h, c.r));
      waxMesh.setMatrixAt(i, m);
      if (c.stick > 0) {
        m.compose(new Vector3(c.x, 0, c.z), q, new Vector3(c.stick, c.stick, c.stick));
        stickMesh.setMatrixAt(k++, m);
      }
      const fh = c.stick > 0 ? 0.046 : 0.054;
      const [fx_, fy, fz] = flamePosition(c, fh);
      m.compose(new Vector3(fx_, fy, fz), q, new Vector3(fh * 0.5, fh, 1));
      flames.setMatrixAt(i, m);
      m.compose(new Vector3(fx_, fy - fh * 0.05, fz), q, new Vector3(0.34, 0.34, 1));
      halos.setMatrixAt(i, m);
    });
    waxMesh.castShadow = shadows;
    stickMesh.castShadow = shadows;
    return { waxMesh, stickMesh, flames, halos };
  }, [low, p.ivory, p.candle, goldMat, fx, shadows]);

  const card = useMemo(() => {
    const outer = new Shape();
    const rr = (s: Shape, x: number, y: number, w: number, h: number, r: number) => {
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
    };
    rr(outer, -0.2, -0.15, 0.4, 0.3, 0.03);
    const hole = new Shape();
    rr(hole, -0.158, -0.108, 0.316, 0.216, 0.012);
    outer.holes.push(hole);
    const frame = new ExtrudeGeometry(outer, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 3, curveSegments: 6 });
    const paper = new PlaneGeometry(0.322, 0.222);
    const map = cardTexture(p.linen, p.goldInk);
    const paperMat = new MeshStandardMaterial({ map, roughness: 0.75 });
    return { frame, paper, map, paperMat };
  }, [p.linen, p.goldInk]);

  const petals = useMemo(() => {
    const d = petalShape(4, 5);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(d.position, 3));
    g.setIndex(new BufferAttribute(d.index, 1));
    g.computeVertexNormals();
    const mat = new MeshStandardMaterial({ color: p.rose, roughness: 0.6, side: DoubleSide });
    const spots: [number, number, number][] = [
      [0.12, 0.62, 0.4],
      [-0.2, 0.6, 2.1],
      [0.38, 0.5, 4.0],
      [-0.42, 0.46, 1.2],
      [0.02, 0.7, 5.2],
      [0.55, 0.38, 2.8],
      [-0.62, 0.36, 0.5],
      [-0.08, 0.2, 3.6],
      [0.3, 0.68, 1.6],
      [-0.33, 0.7, 4.6],
      [0.68, -0.05, 2.2],
      [-0.7, 0.05, 5.8],
    ];
    // A few on the cloth, more fallen on the stage floor in front of the table.
    const floor: [number, number, number][] = Array.from({ length: 26 }, (_, i) => {
      const a = -0.3 + ((i * 0.618) % 1) * (Math.PI + 0.6);
      const r = 1.0 + ((i * 0.381) % 1) * 1.6;
      return [Math.cos(a) * r, Math.sin(a) * r, i * 2.1];
    });
    const mesh = new InstancedMesh(g, mat, spots.length + floor.length);
    const o = new Object3D();
    floor.forEach(([x, z, r], i) => {
      o.position.set(x, 0.004, z);
      o.rotation.set(-Math.PI / 2 + 0.2 * Math.sin(i * 2.3), 0.15 * Math.cos(i * 1.3), r);
      o.scale.setScalar(0.05 + 0.012 * Math.sin(i * 4.1));
      o.updateMatrix();
      mesh.setMatrixAt(spots.length + i, o.matrix);
    });
    spots.forEach(([x, z, r], i) => {
      o.position.set(x, 0.006 + 0.762, z);
      o.rotation.set(-Math.PI / 2 + 0.25 * Math.sin(i * 3.1), 0.2 * Math.cos(i * 1.7), r);
      o.scale.setScalar(0.045 + 0.01 * Math.sin(i * 5.3));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    return mesh;
  }, [p.rose]);

  useDispose([
    goldMat,
    cloth.geometry,
    cloth.material,
    bowl,
    roses.geometry,
    roses.material as Material,
    leaves.geometry,
    leaves.material as Material,
    candles.waxMesh.geometry,
    candles.waxMesh.material as Material,
    candles.stickMesh.geometry,
    candles.flames.geometry,
    candles.flames.material as Material,
    candles.halos.geometry,
    candles.halos.material as Material,
    card.frame,
    card.paper,
    card.map,
    card.paperMat,
    petals.geometry,
    petals.material as Material,
  ]);

  return (
    <group>
      <mesh geometry={cloth.geometry} material={cloth.material} receiveShadow={shadows} />
      <primitive object={petals} />
      <group position={[0, 0.762, 0]}>
        <mesh geometry={bowl} material={goldMat} position={[0, 0, -0.06]} castShadow={shadows} />
        <primitive object={roses} />
        <primitive object={leaves} />
        <primitive object={candles.waxMesh} />
        <primitive object={candles.stickMesh} />
        <group position={[0, 0.158, 0.43]} rotation={[-0.2, 0, 0]}>
          <mesh geometry={card.frame} material={goldMat} position={[0, 0, -0.006]} castShadow={shadows} />
          <mesh geometry={card.paper} material={card.paperMat} position={[0, 0, 0.004]} />
          <mesh material={goldMat} position={[0, -0.04, -0.075]} rotation={[0.52, 0, 0]}>
            <boxGeometry args={[0.022, 0.24, 0.008]} />
          </mesh>
          <FitGoldText
            text={names}
            lang={lang}
            height={0.08}
            maxWidth={0.255}
            color={p.goldDeep}
            emissive={p.goldInk}
            emissiveIntensity={0.35}
            position={[0, -0.004, 0.008]}
            onReady={onTextReady}
          />
        </group>
        <primitive object={candles.halos} renderOrder={4} />
        <primitive object={candles.flames} renderOrder={5} />
      </group>
    </group>
  );
}
