'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, HalfFloatType, Matrix4, PerspectiveCamera, Plane, ShaderMaterial, Vector3, Vector4, WebGLRenderTarget, type Mesh } from 'three';
import { LAKE } from '../layout';
import { SKY_FRAG, SKY_VERT, WATER_FRAG, WATER_VERT, type SkyUniforms, type WaterUniforms } from '../shaders';

/** Sunset sky dome (one draw call); its colour function is shared with the water. */
export function SkyDome({ uniforms }: { uniforms: SkyUniforms }) {
  const material = useMemo(() => new ShaderMaterial({ uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, fog: false }), [uniforms]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[400, 48, 24]} />
    </mesh>
  );
}

const W = LAKE.half * 2;
const D = LAKE.zNear - LAKE.zFar;
const CZ = (LAKE.zNear + LAKE.zFar) / 2;

/**
 * The still lake. `reflection` > 0 (high tier): one surface sampling a real planar reflection
 * (a mirrored camera renders the scene into a target each frame). Otherwise the scene draws a
 * mirrored copy of the garden under the water, and the pond is two cheap layers: the reflected
 * sky beneath it and a tinted film with ripples, wakes and sun glints over it.
 */
export function Pond({ uniforms, reflection }: { uniforms: WaterUniforms; reflection: number }) {
  const real = reflection > 0;
  const materials = useMemo(() => {
    const make = (define: string | null, extra: Partial<ShaderMaterial> = {}) =>
      Object.assign(new ShaderMaterial({ uniforms, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, defines: define ? { [define]: '' } : {} }), extra);
    return real ? { surface: make(null) } : { base: make('MODE_BASE', { depthWrite: false }), film: make('MODE_FILM', { transparent: true, depthWrite: false }) };
  }, [uniforms, real]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  return real ? (
    <ReflectiveSurface uniforms={uniforms} size={reflection} material={materials.surface!} />
  ) : (
    <group position={[0, 0, CZ]} rotation-x={-Math.PI / 2}>
      <mesh material={materials.base!} renderOrder={-1}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh material={materials.film!} renderOrder={5}>
        <planeGeometry args={[W, D]} />
      </mesh>
    </group>
  );
}

function ReflectiveSurface({ uniforms, size, material }: { uniforms: WaterUniforms; size: number; material: ShaderMaterial }) {
  const mesh = useRef<Mesh>(null);
  const r = useMemo(
    () => ({
      target: new WebGLRenderTarget(size, size, { type: HalfFloatType }),
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

  // After the camera has moved (priority 0), before the composer renders (priority 1).
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
    // Oblique near plane: clip everything below the water out of the reflection.
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

  return (
    <mesh ref={mesh} material={material} position={[0, 0, CZ]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[W, D]} />
    </mesh>
  );
}
