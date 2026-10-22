'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  type CanvasTexture,
  type Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SphereGeometry,
  type SpotLight,
} from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { Sky } from '@/lib/invite/kit/Sky';
import { useInviteStore } from '@/lib/invite/machine';
import type { Director } from '@/lib/invite/stage/CinematicCamera';
import { mixHex } from '@/lib/invite/stage/color';
import { cssFontFamily, textTexture } from '@/lib/invite/stage/textures';
import { DRAW_Z, ELEVATION_CENTER } from '../camera';
import { COLUMN, DOOR, ELEVATION_H, ELEVATION_W, FANLIGHT, LAMPS, PEDIMENT, PORCH, STEPS, WALL, WING, WINDOWS } from '../facade';
import { columnGeometry, fanlightGeometry, lampPostGeometry, stoneGeometry } from '../geometry';
import { doorNormal, fanlightTexture, glowTexture, washTexture, windowTexture } from '../textures';
import { introState, smoothstep } from '../timeline';

export interface FacadePalette {
  stone: string;
  ink: string;
  night: string;
  dusk: string;
  warm: string;
}

const dummy = new Object3D();
function place(mesh: InstancedMesh | null, items: { p: [number, number, number]; s?: [number, number, number]; r?: [number, number, number] }[]) {
  if (!mesh) return;
  items.forEach((it, i) => {
    dummy.position.set(...it.p);
    dummy.scale.set(...(it.s ?? [1, 1, 1]));
    dummy.rotation.set(...(it.r ?? [0, 0, 0]));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * The hall at blue hour: off-white stone under a deep evening sky, uplights washing the fluted
 * columns, warm windows and fanlight, black double doors that swing in on a white, lit hall.
 * The card's drawing hangs here too, over the façade, and dissolves into it after the cut.
 */
export function Facade({
  palette: p,
  director,
  drawing,
  hall,
  spots,
  lampLights,
  detail,
  fontVar,
}: {
  palette: FacadePalette;
  director: Director;
  drawing: CanvasTexture | null;
  hall: string;
  /** Real spotlights up the columns: 0 (washes only), 4 (the columns) or 5 (and the pediment). */
  spots: 0 | 4 | 5;
  lampLights: boolean;
  detail: number;
  fontVar: string;
}) {
  const store = useInviteStore();
  const geo = useMemo(
    () => ({
      stone: stoneGeometry(),
      column: columnGeometry(detail),
      fanlight: fanlightGeometry(),
      lamp: lampPostGeometry(),
      globe: new SphereGeometry(0.2, 16, 12),
      leafL: new BoxGeometry(DOOR.halfWidth, DOOR.top - PORCH, 0.07).translate(DOOR.halfWidth / 2, (DOOR.top - PORCH) / 2, 0),
      leafR: new BoxGeometry(DOOR.halfWidth, DOOR.top - PORCH, 0.07).translate(-DOOR.halfWidth / 2, (DOOR.top - PORCH) / 2, 0),
      wash: new PlaneGeometry(1.5, COLUMN.height + 0.9).translate(0, (COLUMN.height + 0.9) / 2, 0),
      window: new PlaneGeometry(1, 1),
      tree: new ConeGeometry(1, 1, 7, 1).translate(0, 0.5, 0),
      drawingPlane: new PlaneGeometry(ELEVATION_W, ELEVATION_H),
      spill: new PlaneGeometry(1, 1),
    }),
    [detail],
  );
  const tex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return { door: doorNormal(), fanlight: fanlightTexture(), window: windowTexture(), wash: washTexture(), glow: glowTexture() };
  }, []);
  const mats = useMemo(() => {
    const stone = new MeshStandardMaterial({ color: p.stone, roughness: 0.84, metalness: 0 });
    return {
      stone,
      door: new MeshPhysicalMaterial({ color: '#0c0c0c', roughness: 0.32, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.18, normalMap: tex?.door ?? null }),
      fanlight: new MeshBasicMaterial({ map: tex?.fanlight ?? null, toneMapped: false }),
      window: new MeshBasicMaterial({ map: tex?.window ?? null, toneMapped: false }),
      wash: new MeshBasicMaterial({ color: p.warm, map: tex?.wash ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }),
      lamp: new MeshStandardMaterial({ color: '#111111', roughness: 0.45, metalness: 0.6 }),
      globe: new MeshBasicMaterial({ color: '#fff4e0', toneMapped: false }),
      halo: new MeshBasicMaterial({ color: p.warm, map: tex?.glow ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }),
      pool: new MeshBasicMaterial({ color: p.warm, map: tex?.glow ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }),
      tree: new MeshStandardMaterial({ color: '#0e1316', roughness: 1 }),
      ground: new MeshStandardMaterial({ color: '#25262b', roughness: 0.3, metalness: 0.1 }),
      spill: new MeshBasicMaterial({ color: p.warm, map: tex?.glow ?? null, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }),
    };
  }, [p.stone, p.warm, tex]);
  // The drawing arrives with the fonts, later than everything else: its own material, so the
  // instanced meshes above are never rebuilt (and never lose their placement) when it does.
  const drawingMat = useMemo(
    () => new MeshBasicMaterial({ color: p.ink, alphaMap: drawing, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    [p.ink, drawing],
  );
  useEffect(() => () => drawingMat.dispose(), [drawingMat]);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      if (tex) Object.values(tex).forEach((t) => t.dispose());
    },
    [geo, mats, tex],
  );

  // The hall's name, carved into the tympanum.
  const [name, setName] = useState<{ texture: CanvasTexture; aspect: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void textTexture(hall, { family: cssFontFamily(fontVar, 'serif'), weight: 700, px: 140, rtl: true }).then((t) => {
      if (cancelled) t.texture.dispose();
      else setName(t);
    });
    return () => {
      cancelled = true;
    };
  }, [hall, fontVar]);
  useEffect(() => () => name?.texture.dispose(), [name]);

  const columns = useRef<InstancedMesh>(null);
  const washes = useRef<InstancedMesh>(null);
  const windows = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const globes = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const trees = useRef<InstancedMesh>(null);
  const pools = useRef<InstancedMesh>(null);
  const leafL = useRef<Group>(null);
  const leafR = useRef<Group>(null);
  const spotRefs = useRef<(SpotLight | null)[]>([]);

  useLayoutEffect(() => {
    place(columns.current, COLUMN.xs.map((x) => ({ p: [x, PORCH, COLUMN.z] })));
    place(washes.current, COLUMN.xs.map((x) => ({ p: [x, PORCH - 0.05, COLUMN.z + COLUMN.radius + 0.06] })));
    place(windows.current, [
      ...WINDOWS.xs.map((x) => ({ p: [x, (WINDOWS.bottom + WINDOWS.top) / 2, WALL.z - 0.18] as [number, number, number], s: [WINDOWS.halfWidth * 2, WINDOWS.top - WINDOWS.bottom, 1] as [number, number, number] })),
      ...[-1, 1].flatMap((s) =>
        WING.windowXs.map((x) => ({ p: [s * x, (WING.windowBottom + WING.windowTop) / 2, WALL.z - 0.55] as [number, number, number], s: [WING.windowHalfWidth * 2, WING.windowTop - WING.windowBottom, 1] as [number, number, number] })),
      ),
    ]);
    place(lamps.current, LAMPS.xs.map((x) => ({ p: [x, 0, LAMPS.z] })));
    place(globes.current, LAMPS.xs.map((x) => ({ p: [x, LAMPS.height - 0.05, LAMPS.z] })));
    place(halos.current, LAMPS.xs.map((x) => ({ p: [x, LAMPS.height - 0.05, LAMPS.z + 0.05], s: [1.6, 1.6, 1] })));
    place(pools.current, [
      ...LAMPS.xs.map((x) => ({ p: [x, 0.01, LAMPS.z] as [number, number, number], s: [5, 5, 1] as [number, number, number], r: [-Math.PI / 2, 0, 0] as [number, number, number] })),
      { p: [0, 0.008, STEPS.front + 1.6], s: [12, 4.5, 1], r: [-Math.PI / 2, 0, 0] },
    ]);
    const rand = mulberry32(9);
    const t: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (const s of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const h = 4 + rand() * 4.5;
        t.push({ p: [s * (11.2 + rand() * 7), 0, -3 - rand() * 12], s: [1.1 + rand() * 1.2, h, 1.1 + rand() * 1.2] });
      }
    place(trees.current, t);
  }, [geo, mats]);

  const stars = useMemo(() => {
    const rand = mulberry32(77);
    const n = 160;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI - Math.PI;
      const e = 0.18 + rand() * 1.1;
      pos[i * 3] = Math.cos(a) * 55 * Math.cos(e);
      pos[i * 3 + 1] = 55 * Math.sin(e);
      pos[i * 3 + 2] = Math.sin(a) * 55 * Math.cos(e) * 0.6 - 15;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    const m = new PointsMaterial({ color: '#dfe6ff', size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false });
    return new Points(g, m);
  }, []);
  useEffect(
    () => () => {
      stars.geometry.dispose();
      (stars.material as PointsMaterial).dispose();
    },
    [stars],
  );

  const inkColor = useMemo(() => new Color(p.ink), [p.ink]);
  const warmColor = useMemo(() => new Color(mixHex(p.warm, '#ffffff', 0.35)), [p.warm]);
  const spotTargets = useMemo(() => {
    const targets = [
      ...COLUMN.xs.map((x) => [x, PORCH + COLUMN.height, COLUMN.z]),
      [0, PEDIMENT.base + 0.6, COLUMN.z + 0.3],
    ].map(([x, y, z]) => {
      const o = new Object3D();
      o.position.set(x!, y!, z!);
      return o;
    });
    return targets;
  }, []);
  const spotList = useMemo(() => {
    const all = [
      { from: [COLUMN.xs[1], PORCH + 0.05, COLUMN.z + 1.0], target: 1 },
      { from: [COLUMN.xs[2], PORCH + 0.05, COLUMN.z + 1.0], target: 2 },
      { from: [COLUMN.xs[0], PORCH + 0.05, COLUMN.z + 1.0], target: 0 },
      { from: [COLUMN.xs[3], PORCH + 0.05, COLUMN.z + 1.0], target: 3 },
      { from: [0, 0.2, 5.5], target: 4 },
    ] as const;
    return all.slice(0, spots);
  }, [spots]);

  useFrame((state) => {
    const { capture } = store.getState();
    const s = introState(director.time);
    const t = capture ? 0 : state.clock.elapsedTime;
    const L = s.lights;
    // The washes are flat cards in front of the columns: gone before the walk passes between them.
    mats.wash.opacity = 0.9 * L * (1 - smoothstep(5.8, 6.3, director.time));
    mats.window.color.setScalar(0.18 + 0.82 * L);
    mats.fanlight.color.setScalar(0.25 + 0.75 * Math.max(L, s.spill));
    mats.globe.color.setScalar(0.4 + 0.6 * L);
    mats.halo.opacity = 0.15 + 0.45 * L;
    mats.pool.opacity = 0.1 + 0.3 * L;
    mats.spill.opacity = 0.75 * s.spill;
    const flicker = 1 + 0.03 * Math.sin(t * 9.1) * Math.sin(t * 3.7);
    spotRefs.current.forEach((sp, i) => {
      if (sp) sp.intensity = (i === 4 ? 40 : 70) * L * flicker;
    });
    if (leafL.current) leafL.current.rotation.y = s.doors * 1.65;
    if (leafR.current) leafR.current.rotation.y = -s.doors * 1.65;
    drawingMat.opacity = s.ink;
    drawingMat.color.copy(inkColor).lerp(warmColor, s.inkWarm);
    drawingMat.blending = s.inkWarm > 0.5 ? AdditiveBlending : NormalBlending;
    drawingMat.visible = s.ink > 0.001 && !s.gate;
  });

  const tympanumZ = COLUMN.z + 0.4 - 0.05 + 0.004;
  return (
    <group>
      <Sky top={p.night} horizon={p.dusk} bottom="#0b0d12" glow={mixHex(p.dusk, '#8fa0c6', 0.35)} glowDir={[0, 0.05, -1]} glowStrength={0.45} radius={70} />
      <primitive object={stars} />
      <mesh geometry={geo.drawingPlane} material={drawingMat} position={[ELEVATION_CENTER[0], ELEVATION_CENTER[1], DRAW_Z]} renderOrder={901} frustumCulled={false} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]} material={mats.ground}>
        <planeGeometry args={[300, 300]} />
      </mesh>
      <mesh geometry={geo.stone} material={mats.stone} />
      <instancedMesh ref={columns} args={[geo.column, mats.stone, COLUMN.xs.length]} />
      <instancedMesh ref={washes} args={[geo.wash, mats.wash, COLUMN.xs.length]} renderOrder={5} />
      <instancedMesh ref={windows} args={[geo.window, mats.window, 2 + WING.windowXs.length * 2]} />
      <mesh geometry={geo.fanlight} material={mats.fanlight} position={[0, FANLIGHT.cy, WALL.z - 0.2]} />
      {name && (
        <mesh position={[0, PEDIMENT.base + 0.5, tympanumZ]} scale={[0.42 * name.aspect, 0.42, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color={mixHex(p.stone, '#5b564d', 0.55)} alphaMap={name.texture} transparent depthWrite={false} roughness={0.9} />
        </mesh>
      )}
      <group ref={leafL} position={[-DOOR.halfWidth, PORCH, WALL.z - 0.12]}>
        <mesh geometry={geo.leafL} material={mats.door} />
      </group>
      <group ref={leafR} position={[DOOR.halfWidth, PORCH, WALL.z - 0.12]}>
        <mesh geometry={geo.leafR} material={mats.door} />
      </group>
      {/* Warm light pouring out of the doorway across the porch and down the steps. */}
      <mesh geometry={geo.spill} material={mats.spill} rotation-x={-Math.PI / 2} position={[0, PORCH + 0.012, 0.2]} scale={[3.4, 4.4, 1]} renderOrder={4} />
      <mesh geometry={geo.spill} material={mats.spill} rotation-x={-Math.PI / 2} position={[0, 0.012, 4.2]} scale={[4.5, 4, 1]} renderOrder={4} />
      <instancedMesh ref={lamps} args={[geo.lamp, mats.lamp, LAMPS.xs.length]} />
      <instancedMesh ref={globes} args={[geo.globe, mats.globe, LAMPS.xs.length]} />
      <instancedMesh ref={halos} args={[geo.window, mats.halo, LAMPS.xs.length]} renderOrder={6} />
      <instancedMesh ref={pools} args={[geo.window, mats.pool, LAMPS.xs.length + 1]} renderOrder={4} />
      <instancedMesh ref={trees} args={[geo.tree, mats.tree, 18]} />
      {spotTargets.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
      {spotList.map((sp, i) => (
        <spotLight
          key={i}
          ref={(el) => {
            spotRefs.current[i] = el;
          }}
          position={sp.from as unknown as [number, number, number]}
          target={spotTargets[sp.target]}
          angle={sp.target === 4 ? 0.34 : 0.26}
          penumbra={0.75}
          decay={1.6}
          distance={sp.target === 4 ? 14 : 9}
          color={p.warm}
          intensity={0}
        />
      ))}
      {lampLights &&
        LAMPS.xs.map((x) => <pointLight key={x} position={[x, LAMPS.height - 0.1, LAMPS.z]} color={p.warm} intensity={4} distance={7} decay={1.8} />)}
    </group>
  );
}
