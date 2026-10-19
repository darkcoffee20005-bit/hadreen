'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BackSide,
  Color,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  BoxGeometry,
  IcosahedronGeometry,
  type Mesh,
  type Texture,
} from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { cypressGeometry, hipRoofGeometry, mountainGeometry, promontoryGeometry, slopeGeometry } from '../geometry';
import {
  CLOUD_FRAG,
  CLOUD_VERT,
  SKY_FRAG,
  SKY_VERT,
  WATER_FRAG,
  WATER_VERT,
  type SkyUniforms,
  type WaterUniforms,
} from '../shaders';
import { clouds as cloudLayout, LAKE_Y, MOUNTAINS, trees as treeLayout, villas as villaLayout } from '../world';

export function SkyDome({ uniforms }: { uniforms: SkyUniforms }) {
  const material = useMemo(() => new ShaderMaterial({ uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, fog: false }), [uniforms]);
  const geometry = useMemo(() => new SphereGeometry(1000, 32, 16), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  return <mesh geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}

const STUCCO = ['#F3E4C8', '#EAD2B0', '#F1C9A5', '#F6EEDC', '#E9B99A'];

/**
 * Everything that stands on (and reflects in) the lake: three mountain layers, the promontory,
 * the slope under the balcony, villas and trees. Rendered once more, mirrored, on medium tier.
 */
export function useShoreAssets(palette: { terracotta: string; villa: string }, facade: Texture | null, lowTier: boolean) {
  const assets = useMemo(() => {
    // Nothing under the water may show: the water's base layer doesn't write depth.
    const land = new MeshLambertMaterial({ vertexColors: true, clippingPlanes: [new Plane(new Vector3(0, 1, 0), -LAKE_Y)] });
    const landMirror = new MeshLambertMaterial({ vertexColors: true, clippingPlanes: [new Plane(new Vector3(0, -1, 0), LAKE_Y + 0.02)] });
    const mountains = MOUNTAINS.map((l) => mountainGeometry(l, lowTier ? 90 : 150, lowTier ? 5 : 7));
    const promontory = promontoryGeometry();
    const slope = slopeGeometry();

    const villaList = villaLayout();
    const wallGeo = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const roofGeo = hipRoofGeometry();
    const wallMat = new MeshLambertMaterial({ map: facade });
    const roofMat = new MeshLambertMaterial({ color: '#ffffff' });
    const walls = new InstancedMesh(wallGeo, wallMat, villaList.length);
    const roofs = new InstancedMesh(roofGeo, roofMat, villaList.length);
    const o = new Object3D();
    const c = new Color();
    villaList.forEach((v, i) => {
      o.position.set(...v.position);
      o.rotation.set(0, v.rotation, 0);
      o.scale.set(...v.size);
      o.updateMatrix();
      walls.setMatrixAt(i, o.matrix);
      walls.setColorAt(i, c.set(mixHex(STUCCO[v.tone % STUCCO.length]!, palette.villa, 0.25)));
      o.position.y += v.size[1];
      o.scale.set(v.size[0], v.size[0] * 0.9, v.size[2]);
      o.updateMatrix();
      roofs.setMatrixAt(i, o.matrix);
      roofs.setColorAt(i, c.set(mixHex(palette.terracotta, i % 3 ? '#B25E3E' : '#D88B66', 0.3)));
    });

    const treeList = treeLayout();
    const cyp = treeList.filter((t) => t.kind === 0);
    const round = treeList.filter((t) => t.kind === 1);
    const cypresses = new InstancedMesh(cypressGeometry(lowTier ? 5 : 7), new MeshLambertMaterial({ color: '#ffffff' }), cyp.length);
    cyp.forEach((t, i) => {
      o.position.set(...t.position);
      o.rotation.set(0, i * 1.3, 0);
      o.scale.set(t.width, t.height, t.width);
      o.updateMatrix();
      cypresses.setMatrixAt(i, o.matrix);
      cypresses.setColorAt(i, c.set(mixHex('#2E4B37', '#3F5F44', (i * 0.37) % 1)));
    });
    const crowns = new InstancedMesh(new IcosahedronGeometry(0.5, 2), new MeshLambertMaterial({ color: '#ffffff' }), round.length);
    round.forEach((t, i) => {
      o.position.set(t.position[0], t.position[1] + t.height * 0.45, t.position[2]);
      o.rotation.set(0, i, 0);
      o.scale.set(t.width, t.height * 0.7, t.width);
      o.updateMatrix();
      crowns.setMatrixAt(i, o.matrix);
      crowns.setColorAt(i, c.set(mixHex('#5A7C4B', '#7C9A5E', (i * 0.53) % 1)));
    });
    return { land, landMirror, mountains, promontory, slope, walls, roofs, cypresses, crowns };
  }, [palette.terracotta, palette.villa, facade, lowTier]);

  useEffect(
    () => () => {
      assets.land.dispose();
      assets.landMirror.dispose();
      assets.mountains.forEach((g) => g.dispose());
      assets.promontory.dispose();
      assets.slope.dispose();
      for (const m of [assets.walls, assets.roofs, assets.cypresses, assets.crowns]) {
        m.geometry.dispose();
        (m.material as MeshLambertMaterial).dispose();
        m.dispose();
      }
    },
    [assets],
  );
  return assets;
}

export type ShoreAssets = ReturnType<typeof useShoreAssets>;

export function Shore({ a, mirrored = false }: { a: ShoreAssets; mirrored?: boolean }) {
  const instanced = useMemo(() => {
    const list = [a.walls, a.roofs, a.cypresses, a.crowns];
    return mirrored ? list.map((m) => m.clone()) : list;
  }, [a, mirrored]);
  return (
    <group scale={mirrored ? [1, -1, 1] : 1} position-y={mirrored ? LAKE_Y * 2 : 0}>
      {a.mountains.map((g, i) => (
        <mesh key={i} geometry={g} material={mirrored ? a.landMirror : a.land} />
      ))}
      {!mirrored && <mesh geometry={a.promontory} material={a.land} />}
      {!mirrored && <mesh geometry={a.slope} material={a.land} />}
      {instanced.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

const LAKE_W = 1700;
const LAKE_NEAR = -6;
const LAKE_FAR = -1000;
const LAKE_D = LAKE_NEAR - LAKE_FAR;
const LAKE_CZ = (LAKE_NEAR + LAKE_FAR) / 2;

/**
 * The lake. reflection > 0 (high tier): one surface sampling a real planar reflection. Otherwise
 * two cheap layers: the reflected sky under it (with the mirrored shore drawn over that on medium)
 * and a film of water body, ripples, glitter and the boat's wake over it.
 */
export function Lake({ uniforms, reflection }: { uniforms: WaterUniforms; reflection: number }) {
  const real = reflection > 0;
  const geometry = useMemo(() => new PlaneGeometry(LAKE_W, LAKE_D, 1, 1), []);
  const materials = useMemo(() => {
    const make = (define: string | null, extra: Partial<ShaderMaterial> = {}) =>
      Object.assign(new ShaderMaterial({ uniforms, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, defines: define ? { [define]: '' } : {} }), extra);
    return real ? { surface: make(null) } : { base: make('MODE_BASE', { depthWrite: false }), film: make('MODE_FILM', { transparent: true, depthWrite: false }) };
  }, [uniforms, real]);
  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      geometry.dispose();
    },
    [materials, geometry],
  );

  return real ? (
    <ReflectiveSurface uniforms={uniforms} size={reflection} geometry={geometry} material={materials.surface!} />
  ) : (
    <group position={[0, LAKE_Y, LAKE_CZ]} rotation-x={-Math.PI / 2}>
      <mesh geometry={geometry} material={materials.base!} renderOrder={-1} />
      <mesh geometry={geometry} material={materials.film!} renderOrder={5} />
    </group>
  );
}

function ReflectiveSurface({ uniforms, size, geometry, material }: { uniforms: WaterUniforms; size: number; geometry: PlaneGeometry; material: ShaderMaterial }) {
  const mesh = useRef<Mesh>(null);
  const r = useMemo(
    () => ({
      target: new WebGLRenderTarget(size, size / 2, { type: HalfFloatType }),
      camera: new PerspectiveCamera(),
      plane: new Plane(),
      normal: new Vector3(),
      mirrorPos: new Vector3(),
      cameraPos: new Vector3(),
      rotation: new Matrix4(),
      lookAt: new Vector3(),
      view: new Vector3(),
      target3: new Vector3(),
      clip: new Vector4(),
      q: new Vector4(),
    }),
    [size],
  );
  useEffect(() => {
    uniforms.uReflect.value = r.target.texture;
    return () => {
      uniforms.uReflect.value = null;
      r.target.dispose();
    };
  }, [r, uniforms]);

  // After the camera moved (priority 0), before the composer renders (priority 1).
  useFrame(({ gl, scene, camera }) => {
    const m = mesh.current;
    if (!m) return;
    m.updateMatrixWorld();
    r.mirrorPos.setFromMatrixPosition(m.matrixWorld);
    r.cameraPos.setFromMatrixPosition(camera.matrixWorld);
    r.rotation.extractRotation(m.matrixWorld);
    r.normal.set(0, 0, 1).applyMatrix4(r.rotation);
    r.view.subVectors(r.mirrorPos, r.cameraPos);
    if (r.view.dot(r.normal) > 0) return;
    r.view.reflect(r.normal).negate().add(r.mirrorPos);
    r.rotation.extractRotation(camera.matrixWorld);
    r.lookAt.set(0, 0, -1).applyMatrix4(r.rotation).add(r.cameraPos);
    r.target3.subVectors(r.mirrorPos, r.lookAt).reflect(r.normal).negate().add(r.mirrorPos);
    const vc = r.camera;
    vc.position.copy(r.view);
    vc.up.set(0, 1, 0).applyMatrix4(r.rotation).reflect(r.normal);
    vc.lookAt(r.target3);
    vc.far = (camera as PerspectiveCamera).far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    const tm = uniforms.uTexMatrix.value;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(m.matrixWorld);
    // Oblique near plane: nothing under the water gets into the reflection.
    r.plane.setFromNormalAndCoplanarPoint(r.normal, r.mirrorPos).applyMatrix4(vc.matrixWorldInverse);
    r.clip.set(r.plane.normal.x, r.plane.normal.y, r.plane.normal.z, r.plane.constant);
    const p = vc.projectionMatrix.elements;
    r.q.set((Math.sign(r.clip.x) + p[8]!) / p[0]!, (Math.sign(r.clip.y) + p[9]!) / p[5]!, -1, (1 + p[10]!) / p[14]!);
    r.clip.multiplyScalar(2 / r.clip.dot(r.q));
    p[2] = r.clip.x;
    p[6] = r.clip.y;
    p[10] = r.clip.z + 1 - 0.003;
    p[14] = r.clip.w;
    m.visible = false;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(r.target);
    gl.clear();
    gl.render(scene, vc);
    gl.setRenderTarget(prev);
    m.visible = true;
  }, 0.5);

  return <mesh ref={mesh} geometry={geometry} material={material} position={[0, LAKE_Y, LAKE_CZ]} rotation-x={-Math.PI / 2} />;
}

/** Fair-weather cumulus and mist bands: one instanced draw of billboards drifting east. */
export function Clouds({ count, atlas, time, lit, shade, fog }: { count: number; atlas: Texture | null; time: React.RefObject<number>; lit: string; shade: string; fog: { color: string; near: number; far: number } }) {
  const { geometry, material } = useMemo(() => {
    const list = cloudLayout(count);
    const g = new InstancedBufferGeometry().copy(new PlaneGeometry(1, 1) as unknown as InstancedBufferGeometry);
    g.instanceCount = list.length;
    g.setAttribute('iOffset', new InstancedBufferAttribute(new Float32Array(list.flatMap((c) => c.position)), 3));
    g.setAttribute('iData', new InstancedBufferAttribute(new Float32Array(list.flatMap((c) => [c.size[0], c.size[1], c.seed])), 3));
    g.setAttribute('iKind', new InstancedBufferAttribute(new Float32Array(list.map((c) => c.kind)), 1));
    const m = new ShaderMaterial({
      uniforms: {
        uAtlas: { value: atlas },
        uTime: { value: 0 },
        uLit: { value: new Color(lit) },
        uShade: { value: new Color(shade) },
        uFogColor: { value: new Color(fog.color) },
        uFogNear: { value: fog.near },
        uFogFar: { value: fog.far * 1.2 },
        uOpacity: { value: 0.95 },
      },
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    return { geometry: g, material: m };
  }, [count, atlas, lit, shade, fog.color, fog.near, fog.far]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(() => {
    material.uniforms.uTime!.value = time.current ?? 0;
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-5} />;
}
