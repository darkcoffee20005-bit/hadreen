'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3, type Points, type ShaderMaterial } from 'three';
import { mulberry32 } from '../audio/dsp';
import { inviteStore } from '../machine';
import { scaledCount } from '../quality/tiers';

const LIFE = 1.6;

/**
 * Gold particle burst for the RSVP success moment. Fires from the viewport point the content page
 * reports (machine.fireBurst), projected just in front of the camera.
 */
export function Burst({ color = '#E8CC8C' }: { color?: string }) {
  const camera = useThree((s) => s.camera);
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const count = scaledCount(160, inviteStore.getState().tier);
  const state = useRef({ started: -1, id: 0 });

  const { geometry, velocities } = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('seed', new BufferAttribute(new Float32Array(count).map((_, i) => (i * 0.618) % 1), 1));
    return { geometry: g, velocities: new Float32Array(count * 3) };
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const { burst } = inviteStore.getState();
    const p = points.current;
    if (!p || !material.current) return;
    const t = clock.elapsedTime;
    if (burst.id !== state.current.id) {
      state.current = { id: burst.id, started: t };
      // Origin: the viewport point, 2.5 units in front of the camera.
      const origin = new Vector3(burst.x * 2 - 1, -(burst.y * 2 - 1), 0.5).unproject(camera);
      const dir = origin.sub(camera.position).normalize();
      const at = camera.position.clone().add(dir.multiplyScalar(2.5));
      const rand = mulberry32(burst.id);
      const pos = geometry.getAttribute('position') as BufferAttribute;
      for (let i = 0; i < count; i++) {
        pos.setXYZ(i, at.x, at.y, at.z);
        const a = rand() * Math.PI * 2;
        const e = rand() * Math.PI - Math.PI / 2;
        const speed = 0.6 + rand() * 1.4;
        velocities[i * 3] = Math.cos(a) * Math.cos(e) * speed;
        velocities[i * 3 + 1] = Math.sin(e) * speed + 0.8;
        velocities[i * 3 + 2] = Math.sin(a) * Math.cos(e) * speed;
      }
      pos.needsUpdate = true;
    }
    const age = t - state.current.started;
    p.visible = state.current.started >= 0 && age < LIFE;
    if (!p.visible) return;
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const dt = Math.min(delta, 1 / 30);
    for (let i = 0; i < count; i++) {
      velocities[i * 3 + 1] = velocities[i * 3 + 1]! - 1.6 * dt; // gravity
      pos.setXYZ(i, pos.getX(i) + velocities[i * 3]! * dt, pos.getY(i) + velocities[i * 3 + 1]! * dt, pos.getZ(i) + velocities[i * 3 + 2]! * dt);
    }
    pos.needsUpdate = true;
    material.current.uniforms.uFade!.value = 1 - age / LIFE;
  });

  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) }, uFade: { value: 1 } }), [color]);

  return (
    <points ref={points} geometry={geometry} visible={false} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float seed;
          varying float vSeed;
          void main() {
            vSeed = seed;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + seed * 5.0) * (30.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uFade;
          varying float vSeed;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * uFade;
            gl_FragColor = vec4(uColor * (1.2 + vSeed), a);
          }`}
      />
    </points>
  );
}
