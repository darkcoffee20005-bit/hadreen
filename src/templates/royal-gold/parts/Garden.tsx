'use client';

import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  type Texture,
  Vector2,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas } from '@/lib/invite/stage/textures';
import { mixHex } from '@/lib/invite/stage/color';
import { archArcs, cypressProfile, domeProfile, minaretProfile, type P2 } from '../geometry';
import { patchMaterial } from '../materials';
import { pathTexture, tex, type WallPalette } from '../textures';

export const MOSQUE_Z = -42;

const lathe = (pts: P2[], seg: number) =>
  new LatheGeometry(
    pts.map(([r, y]) => new Vector2(r, y)),
    seg,
  );

/** The mosque's silhouette volumes, in two geometries: stone (hall, portal, drums, minarets) and gilded domes. */
export function buildMosque() {
  const stone = [];
  const hall = new BoxGeometry(14, 3.4, 7);
  hall.translate(0, 1.7, 0);
  const portal = new BoxGeometry(4.8, 6.0, 1.4);
  portal.translate(0, 3.0, 4.1);
  const drum = new CylinderGeometry(2.75, 2.85, 1.2, 32);
  drum.translate(0, 4.0, -0.4);
  stone.push(hall, portal, drum);
  for (const side of [-1, 1]) {
    const d = new CylinderGeometry(1.05, 1.1, 0.5, 20);
    d.translate(side * 4.5, 3.65, 0.6);
    const m = lathe(minaretProfile(12.5, 0.36), 12);
    m.translate(side * 7.9, 0, 2.6);
    stone.push(d, m);
  }
  const gilt = [];
  const dome = lathe(domeProfile(3.0, 4.7), 40);
  dome.translate(0, 4.6, -0.4);
  const finial = lathe(
    [
      [0, 0],
      [0.14, 0.04],
      [0.2, 0.2],
      [0.1, 0.36],
      [0.16, 0.52],
      [0.07, 0.68],
      [0.025, 1.3],
      [0, 1.42],
    ],
    12,
  );
  finial.translate(0, 9.25, -0.4);
  gilt.push(dome, finial);
  for (const side of [-1, 1]) {
    const sd = lathe(domeProfile(1.15, 1.9), 24);
    sd.translate(side * 4.5, 3.9, 0.6);
    gilt.push(sd);
  }
  const result = { stone: mergeGeometries(stone)!, gilt: mergeGeometries(gilt)! };
  [...stone, ...gilt].forEach((g) => g.dispose());
  return result;
}

/** Arcade and portal niche painted on the facade (alpha), shaded a touch deeper than the stone. */
function facadeTexture(shade: string, line: string): Texture {
  const [c, ctx] = canvas(1024, 512);
  const W = 1024;
  const H = 512;
  ctx.clearRect(0, 0, W, H);
  const archPath = (cx: number, base: number, w: number, spring: number, apex: number) => {
    const { radius, left, right, apexAngle } = archArcs(w, spring, apex);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, base);
    ctx.lineTo(cx - w / 2, base - spring);
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + ((apexAngle - Math.PI) * i) / 16;
      ctx.lineTo(cx + left[0] + Math.cos(a) * radius, base - (left[1] + Math.sin(a) * radius));
    }
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI - apexAngle - ((Math.PI - apexAngle) * i) / 16;
      ctx.lineTo(cx + right[0] + Math.cos(a) * radius, base - (right[1] + Math.sin(a) * radius));
    }
    ctx.lineTo(cx + w / 2, base);
    ctx.closePath();
  };
  // Hall arcade (left of the portal and right of it).
  ctx.fillStyle = shade;
  ctx.strokeStyle = line;
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const cx = 60 + i * 64 + (i >= 4 ? 392 : 0);
    if (cx > W - 40) continue;
    archPath(cx, H - 40, 40, 170, 250);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = line;
  ctx.fillRect(0, 18, W, 10);
  return tex(c, true);
}

function portalTexture(shade: string, line: string): Texture {
  const [c, ctx] = canvas(256, 320);
  const { radius, left, right, apexAngle } = archArcs(150, 150, 255);
  ctx.fillStyle = shade;
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ctx.beginPath();
  const cx = 128;
  const base = 320;
  ctx.moveTo(cx - 75, base);
  ctx.lineTo(cx - 75, base - 150);
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + ((apexAngle - Math.PI) * i) / 20;
    ctx.lineTo(cx + left[0] + Math.cos(a) * radius, base - (left[1] + Math.sin(a) * radius));
  }
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI - apexAngle - ((Math.PI - apexAngle) * i) / 20;
    ctx.lineTo(cx + right[0] + Math.cos(a) * radius, base - (right[1] + Math.sin(a) * radius));
  }
  ctx.lineTo(cx + 75, base);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(24, 30, 208, 292);
  return tex(c, true);
}

/**
 * Beyond the arch: a zellige path between clipped hedges and cypresses leading to a pale-gold
 * mosque (dome and minarets) sinking into golden haze, with a band of ground mist.
 */
export function Garden({ palette: p, haze, cypressColor }: { palette: WallPalette; haze: string; cypressColor: string }) {
  const parts = useMemo(() => {
    const mosque = buildMosque();
    const ground = new PlaneGeometry(160, 140);
    const path = new PlaneGeometry(2.6, 36);
    const hedgeL = new RoundedBoxGeometry(0.5, 0.6, 33, 3, 0.16);
    hedgeL.translate(-1.75, 0.3, -18.5);
    const hedgeR = hedgeL.clone();
    hedgeR.translate(3.5, 0, 0);
    const hedges = mergeGeometries([hedgeL, hedgeR])!;
    hedgeL.dispose();
    hedgeR.dispose();
    const cypress = lathe(cypressProfile(4.6, 0.55), 10);
    const facade = new PlaneGeometry(14, 3.4);
    const portalFace = new PlaneGeometry(4.8, 6.0);
    const mist = new PlaneGeometry(90, 7);
    return { ...mosque, ground, path, hedges, cypress, facade, portalFace, mist };
  }, []);

  const mats = useMemo(() => {
    const isDom = typeof document !== 'undefined';
    const pathMap = isDom ? pathTexture(p) : null;
    pathMap?.repeat.set(4, 55);
    const h = (m: MeshStandardMaterial, near: number, far: number, max: number) => patchMaterial(m, { haze: { color: haze, near, far, max } });
    return {
      ground: h(new MeshStandardMaterial({ color: mixHex(p.goldPale, p.ivoryWarm, 0.5), roughness: 1 }), 1, 70, 0.95),
      path: h(new MeshStandardMaterial({ color: '#ffffff', map: pathMap, roughness: 0.6 }), 1, 45, 0.92),
      hedge: h(new MeshStandardMaterial({ color: mixHex(cypressColor, '#6E9A6A', 0.25), roughness: 0.9 }), 1, 55, 0.9),
      cypress: h(new MeshStandardMaterial({ color: cypressColor, roughness: 0.85 }), 1, 60, 0.92),
      stone: h(new MeshStandardMaterial({ color: mixHex(p.goldPale, p.ivory, 0.3), roughness: 0.8 }), 3, 70, 0.5),
      gilt: h(new MeshStandardMaterial({ color: p.gold, roughness: 0.3, metalness: 0.7, emissive: p.gold, emissiveIntensity: 0.22 }), 3, 70, 0.42),
      facade: h(new MeshStandardMaterial({ map: isDom ? facadeTexture(mixHex(p.goldPale, p.goldDeep, 0.35), p.gold) : null, transparent: true, roughness: 0.8 }), 3, 62, 0.6),
      portal: h(new MeshStandardMaterial({ map: isDom ? portalTexture(mixHex(p.goldPale, p.goldDeep, 0.4), p.gold) : null, transparent: true, roughness: 0.8 }), 3, 62, 0.6),
      mist: new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: { uColor: { value: new Color(haze) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 uColor; varying vec2 vUv;
          void main(){ float a = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x); gl_FragColor = vec4(uColor, a * 0.7); }`,
      }),
    };
  }, [p, haze, cypressColor]);

  const trees = useMemo(() => {
    const rand = mulberry32(19);
    const spots: [number, number, number][] = [];
    for (let i = 0; i < 10; i++) for (const side of [-1, 1]) spots.push([side * 2.85, -3.4 - i * 3.0, 0.85 + rand() * 0.25]);
    for (let i = 0; i < 8; i++) for (const side of [-1, 1]) spots.push([side * (5.4 + rand() * 0.6), -5 - i * 3.6, 0.95 + rand() * 0.3]);
    const mesh = new InstancedMesh(parts.cypress, mats.cypress, spots.length);
    const m = new Matrix4();
    spots.forEach(([x, z, s], i) => {
      m.makeScale(s * 0.95, s, s * 0.95).setPosition(x, 0, z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }, [parts.cypress, mats.cypress]);

  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => {
        (m as MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
      trees.dispose();
    },
    [parts, mats, trees],
  );

  return (
    <group>
      <mesh geometry={parts.ground} material={mats.ground} rotation-x={-Math.PI / 2} position={[0, -0.01, -70]} />
      <mesh geometry={parts.path} material={mats.path} rotation-x={-Math.PI / 2} position={[0, 0.006, -18.6]} />
      <mesh geometry={parts.hedges} material={mats.hedge} />
      <primitive object={trees} />
      <group position={[0, 0, MOSQUE_Z]} scale={0.84}>
        <mesh geometry={parts.stone} material={mats.stone} />
        <mesh geometry={parts.gilt} material={mats.gilt} />
        <mesh geometry={parts.facade} material={mats.facade} position={[0, 1.7, 3.51]} />
        <mesh geometry={parts.portalFace} material={mats.portal} position={[0, 3.0, 4.81]} />
      </group>
      <mesh geometry={parts.mist} material={mats.mist} position={[0, 3.5, MOSQUE_Z + 9]} />
      <mesh geometry={parts.mist} material={mats.mist} position={[0, 3.5, -16]} scale={[1, 0.6, 1]} />
    </group>
  );
}
