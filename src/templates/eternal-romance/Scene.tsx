'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { DepthOfFieldEffect } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BackSide, MathUtils, Mesh, MeshStandardMaterial, Object3D, Vector3, type CanvasTexture, type PointLight, type SpotLight } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { useTweak } from '@/lib/invite/lab/tweaks';
import { useInvite, useInviteStore } from '@/lib/invite/machine';
import { scaledCount, TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import type { SceneProps } from '@/lib/invite/scene-types';
import { Burst } from '@/lib/invite/stage/Burst';
import { CinematicCamera, useDirector } from '@/lib/invite/stage/CinematicCamera';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { NEUTRAL_GRADE, type GradeParams } from '@/lib/invite/stage/grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { cssFontFamily } from '@/lib/invite/stage/textures';
import { useIntro } from '@/lib/invite/stage/useIntro';
import type { Vec3 } from '@/lib/invite/stage/rig';
import { ambientShot, CARD, TABLE, TABLE_TOP, TRACK } from './camera';
import { CURTAIN, flicker, type CurtainParams } from './geometry';
import { crestTexture, useCurtain } from './parts/Curtain';
import { useBackWall, useBeam, useDust, useLegs, usePetals } from './parts/effects';
import { useFacade } from './parts/Facade';
import { FitGoldText } from './parts/FitGoldText';
import { Post } from './parts/Post';
import { Table, useTableFx } from './parts/Table';
import { easeInOutCubic, INTRO, introState, PETALS_START, smoothstep } from './timeline';

const SPOT_POS: Vec3 = [0, 14, 4.2];
const AIM_CURTAIN: Vec3 = [0, 4.75, 0];
const AIM_TABLE: Vec3 = [TABLE[0], 0.8, TABLE[2]];
const FACADE_Z = -14.3;
const FACADE_FOCUS = new Vector3(0, 4.2, FACADE_Z);
const TABLE_FOCUS = new Vector3(TABLE[0], TABLE_TOP + 0.12, TABLE[2]);
const CARD_FOCUS = new Vector3(...CARD);
const CURTAIN_FOCUS = new Vector3(0, 4.6, 0);

/** The valance: a short swagged pelmet in front of the rod, permanently gathered. */
const VALANCE: CurtainParams = { ...CURTAIN, width: 22, top: 9.95, length: 2.2, fringe: 0.17, raised: 8.98, sag: 0.55, depth: 0.12, crestS: -10 };

/**
 * Eternal Romance (الرومانسية الأبدية): theatre and candlelight.
 *  S1  a burgundy velvet curtain fills the frame — deep pleats, sheen, a gold fringe and an
 *      embroidered crest in a soft spotlight from above; held, it lifts, gathering into swags,
 *      and rose petals begin to fall;
 *  S2  the spotlight swings down to an ivory table: red roses in a gold bowl, flickering candles
 *      (one light), and a gold-framed name card the camera dollies up to on a 50 mm lens;
 *  S3  a pull back: on the back wall, the venue façade draws itself in gold lines on burgundy
 *      darkness, framed by the raised swags; the names and the date settle.
 * Every visual is a pure function of director.time (timeline.ts), so skip/seek/rewind are exact.
 */
export default function EternalRomanceScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const sc = view.palette.scene;
  const pal = useMemo(() => {
    const gold = sc.gold ?? view.palette.gold;
    const velvet = sc.velvet ?? '#6A1A2B';
    const deep = sc.velvetDeep ?? '#3A0D17';
    const hi = sc.velvetHi ?? '#9C2D40';
    const rose = sc.rose ?? '#A4142C';
    return {
      velvet,
      deep,
      hi,
      rose,
      ivory: sc.ivory ?? '#F8F3E8',
      linen: sc.linen ?? '#F2EADF',
      candle: sc.candle ?? '#FFB867',
      gold,
      goldInk: view.palette.goldInk,
      goldDeep: mix(gold, '#5c3f16', 0.42),
      goldHot: mix(gold, '#fff1cc', 0.5),
    };
  }, [sc, view.palette.gold, view.palette.goldInk]);
  const curtainPal = useMemo(() => ({ velvet: pal.velvet, deep: pal.deep, hi: pal.hi, gold: mix(pal.gold, '#ecd59c', 0.3), goldDeep: mix(pal.gold, '#5a3d14', 0.5) }), [pal]);
  const tablePal = useMemo(
    () => ({
      linen: pal.linen,
      ivory: pal.ivory,
      rose: pal.rose,
      roseDeep: shade(mix(pal.rose, pal.deep, 0.45), 0.75),
      roseHi: mix(pal.rose, pal.hi, 0.35),
      gold: pal.gold,
      goldDeep: pal.goldDeep,
      goldInk: pal.goldInk,
      candle: pal.candle,
      leaf: mix('#2a3b22', pal.deep, 0.2),
    }),
    [pal],
  );
  const names = `${view.groom} ${view.lang === 'ar' ? 'و' : '&'} ${view.bride}`;
  const textReady = useTextsReady(4);

  const spotGate = useTweak('spot (curtain)', 620, { min: 0, max: 2000, step: 5 });
  const spotTable = useTweak('spot (table)', 420, { min: 0, max: 2000, step: 5 });
  const candleK = useTweak('candle light', 1.4, { min: 0, max: 20, step: 0.05 });
  const rake = useTweak('raking light', 0.38, { min: 0, max: 4, step: 0.05 });
  const hemi = useTweak('hemisphere', 0.22, { min: 0, max: 3, step: 0.01 });
  const envK = useTweak('environment', 0.3, { min: 0, max: 3, step: 0.05 });
  const bloom = useTweak('bloom', 0.85, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.5, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.16,
    ambient: (scroll, t) => ambientShot(scroll, t, store.getState().capture != null),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.014, 0.002, 0.006],
      gamma: [1.0, 0.98, 0.97],
      gain: [1.03, 1.0, 0.96],
      saturation: 1.04,
      contrast: 1.06,
      shadowTint: [0.56, 0.43, 0.46],
      highlightTint: [0.6, 0.53, 0.42],
      splitAmount: 0.24,
      bloom,
      vignette,
      grain: 0.035,
    }),
    [bloom, vignette],
  );

  // The embroidered crest waits for the display font, like the 3D text does.
  const [crest, setCrest] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const family = cssFontFamily(view.lang === 'ar' ? '--font-aref' : '--font-pinyon', 'serif');
    const font = `700 120px ${family}`;
    document.fonts
      .load(font, view.monogram)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        setCrest(crestTexture(view.monogram, family));
        textReady();
      });
    return () => {
      cancelled = true;
    };
  }, [view.monogram, view.lang, textReady]);
  useEffect(() => () => crest?.dispose(), [crest]);

  const curtain = useCurtain({ segments: low ? [150, 76] : [230, 124], low, palette: curtainPal, crest });
  const valance = useCurtain({ params: VALANCE, segments: low ? [120, 18] : [200, 30], low, palette: curtainPal });
  const fx = useTableFx();
  const facade = useFacade(mix(pal.gold, '#f0d9a2', 0.25), pal.goldHot, !low);
  const petals = usePetals(scaledCount(400, tier), pal.rose, shade(mix(pal.rose, pal.deep, 0.5), 0.8), { min: [-7, 0, -12], size: [14, 9.6, 21] }, { min: [-1.5, 0.78, -4.6], size: [3, 2.4, 3] });
  const dust = useDust(mix(pal.candle, '#fff0d8', 0.4), scaledCount(260, tier), { min: [-6, 0.2, -10], size: [12, 8, 18] });
  const beam = useBeam(mix('#fff4e2', pal.candle, 0.2));
  const wall = useBackWall(shade(pal.deep, 0.62), shade(pal.deep, 0.1));
  const legs = useLegs(shade(pal.deep, 0.9), [
    [-7.7, -5.6, 0.18],
    [7.7, -5.6, -0.18],
    [-9, -10.2, 0.1],
    [9, -10.2, -0.1],
  ]);
  const floorMat = useMemo(() => new MeshStandardMaterial({ color: shade(pal.deep, 0.62), roughness: 0.52, metalness: 0.05 }), [pal.deep]);
  useEffect(() => () => floorMat.dispose(), [floorMat]);

  const spot = useRef<SpotLight>(null);
  const candleLight = useRef<PointLight>(null);
  const beamMesh = useRef<Mesh>(null);
  const namesMat = useRef<MeshStandardMaterial>(null);
  const dateMat = useRef<MeshStandardMaterial>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const spotTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(...AIM_CURTAIN);
    return o;
  }, []);
  const away = useRef(0);
  const handoffAt = useRef(-1);
  const kickAt = useRef(-1);
  const clock = useThree((s) => s.clock);
  const tmp = useMemo(() => ({ aim: new Vector3(), dir: new Vector3(), focus: new Vector3() }), []);

  // A guest's "we'll be there": the candles flare and a breath of petals swirls through.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.rsvp.id !== prev.rsvp.id && s.rsvp.attending) kickAt.current = clock.elapsedTime;
      }),
    [store, clock],
  );

  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('cloth', { gain: 0.85, rate: 0.8 });
        haptics.tap();
      }, [], 0.05)
        .call(() => audio.sfx('cloth', { gain: 0.55, rate: 0.62 }), [], 0.85)
        .call(() => audio.sfx('cloth', { gain: 0.35, rate: 0.7 }), [], 1.6)
        .call(() => audio.sfx('whoosh', { gain: 0.3, rate: 0.55 }), [], 2.2)
        .call(() => audio.sfx('paper', { gain: 0.1, rate: 2.4 }), [], 2.9)
        .call(() => audio.sfx('paper', { gain: 0.08, rate: 2.9 }), [], 3.45)
        .call(() => audio.sfx('paper', { gain: 0.09, rate: 2.2 }), [], 4.1)
        .call(() => audio.sfx('paper', { gain: 0.07, rate: 2.7 }), [], 4.75)
        .call(() => audio.sfx('chimes', { gain: 0.42, rate: 1.25 }), [], 5.3)
        .call(() => audio.sfx('chimes', { gain: 0.3, rate: 1.5 }), [], 6.3)
        .call(() => {
          audio.sfx('chimes', { gain: 0.5, rate: 1.0 });
          haptics.success();
        }, [], 7.6)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture, scroll } = store.getState();
    const s = introState(director.time);
    const t = state.clock.elapsedTime;
    const now = capture ? 4 + director.time : t;
    const content = phase === 'handoff' || phase === 'content';
    away.current = capture ? (content ? 1 : 0) : away.current + ((content ? 1 : 0) - away.current) * Math.min(1, delta * 1.5);
    if (content && handoffAt.current < 0) handoffAt.current = t;
    if (!content) handoffAt.current = -1;
    const petalT = content ? INTRO - PETALS_START + (capture ? 0 : t - handoffAt.current) : s.petals;
    const since = kickAt.current >= 0 && !capture ? t - kickAt.current : Infinity;
    const flare = Number.isFinite(since) ? Math.exp(-since * 1.1) : 0;

    // Curtain and valance.
    const cu = curtain.uniforms;
    // Once the guest reads, the curtain draws up a little higher, out of the hero text's way.
    cu.uLift.value = s.lift + 0.15 * away.current;
    cu.uSwag.value = s.swag;
    // The crest is for the closed curtain; gathered into the swags it would only read as a scribble.
    cu.uCrestK.value = 1 - smoothstep(0.25, 0.7, s.lift);
    cu.uSway.value = s.hemSwing * 0.18;
    cu.uMove.value = capture ? 0 : 0.04;
    cu.uTime.value = now;
    const va = valance.uniforms;
    va.uLift.value = 1;
    va.uSwag.value = 1;
    va.uMove.value = capture ? 0 : 0.015;
    va.uTime.value = now;

    // The spotlight: on the curtain, then swinging down onto the table.
    tmp.aim.set(...AIM_CURTAIN).lerp(new Vector3(...AIM_TABLE), s.spot);
    tmp.aim.y += Math.sin(Math.PI * s.spot) * 0.6;
    spotTarget.position.copy(tmp.aim);
    spotTarget.updateMatrixWorld();
    const angle = MathUtils.lerp(0.22, 0.16, s.spot);
    // Behind the content the table is lit by its candles; the spotlight sinks to a glow.
    const spotK = MathUtils.lerp(spotGate, spotTable, s.spot) * MathUtils.lerp(1, 0.32 + 0.5 * easeInOutCubic(scroll), away.current);
    if (spot.current) {
      spot.current.angle = angle;
      spot.current.intensity = spotK;
    }
    tmp.dir.copy(tmp.aim).sub(new Vector3(...SPOT_POS));
    const len = tmp.dir.length();
    tmp.dir.normalize();
    for (const u of [cu, va]) {
      u.uSpotPos.value.set(...SPOT_POS);
      u.uSpotDir.value.copy(tmp.dir);
      u.uSpotCos.value.set(Math.cos(angle * 1.02), Math.cos(angle * 0.12));
      u.uSpotK.value = 1;
    }
    if (beamMesh.current) {
      beamMesh.current.position.set(...SPOT_POS);
      beamMesh.current.lookAt(tmp.aim);
      const r = Math.tan(angle) * len;
      beamMesh.current.scale.set(r, r, len);
      (beamMesh.current.material as unknown as { uniforms: Record<string, { value: number }> }).uniforms.uK!.value = (1 - 0.35 * s.spot) * (1 - 0.45 * away.current);
    }

    // Candles: one light for all of them, flickering; flames and wax glow follow it.
    const fl = 0.5 * flicker(now, 0.2) + 0.5 * flicker(now * 1.13, 0.71);
    if (candleLight.current) candleLight.current.intensity = candleK * s.candles * fl * (1 + flare * 0.9);
    fx.uTime.value = now;
    fx.uK.value = s.candles * (1 + flare * 0.6);
    fx.uGlow.value = s.candles * fl * (1 + flare * 0.5);

    // The façade drawing and the settling names.
    const lu = facade.lines.material.uniforms;
    lu.uDraw!.value = s.draw;
    lu.uK!.value = s.sketch * (1 - 0.3 * away.current);
    lu.uCalm!.value = Math.max(s.names, away.current);
    // Behind the DOM hero the calm oval grows to hold the whole text column.
    lu.uCalmBox!.value.set(0, 3.8 + 0.6 * away.current, 3.6 - 0.5 * away.current, 1.75 + 2.1 * away.current);
    const li = facade.lights.material.uniforms;
    li.uDraw!.value = s.draw;
    li.uTime!.value = now;
    li.uK!.value = s.sketch;
    if (namesMat.current) namesMat.current.opacity = s.names * (1 - away.current);
    if (dateMat.current) dateMat.current.opacity = s.date * (1 - away.current);

    // Petals and dust.
    const pu = (petals.material as { uniforms: Record<string, { value: number }> }).uniforms;
    pu.uT!.value = petalT;
    pu.uTime!.value = now;
    pu.uGust!.value = flare * 1.5;
    pu.uLight!.value = 0.85 + 0.25 * s.spot;
    const du = dust.material.uniforms;
    du.uTime!.value = now;
    du.uK!.value = 0.5 + 0.5 * smoothstep(1.2, 2.6, director.time);

    // Focus: the curtain, the table, the card, the façade; scrolling drifts back to the table.
    if (!content && phase !== 'opening') tmp.focus.copy(CURTAIN_FOCUS);
    else if (content) tmp.focus.copy(FACADE_FOCUS).lerp(TABLE_FOCUS, easeInOutCubic(scroll));
    else if (s.focus <= 1) tmp.focus.copy(TABLE_FOCUS).lerp(CARD_FOCUS, s.focus);
    else tmp.focus.copy(CARD_FOCUS).lerp(FACADE_FOCUS, s.focus - 1);
    du.uFocus!.value = state.camera.position.distanceTo(tmp.focus);
    if (dof.current) {
      dof.current.target?.copy(tmp.focus);
      const opening = smoothstep(2.5, 3.3, director.time) * (1 - smoothstep(5.4, 7.4, director.time) * 0.75);
      dof.current.bokehScale = content ? 3 * easeInOutCubic(scroll) + 0.6 : phase === 'opening' ? 3.2 * opening : 0;
    }
  });

  return (
    <>
      <color attach="background" args={[shade(pal.deep, 0.18)]} />
      <hemisphereLight args={[mix(pal.hi, pal.candle, 0.3), shade(pal.deep, 0.4), hemi]} />
      <primitive object={spotTarget} />
      <spotLight
        ref={spot}
        position={SPOT_POS}
        target={spotTarget}
        angle={0.22}
        penumbra={0.62}
        decay={2}
        intensity={spotGate}
        color={mix('#fff6ea', pal.candle, 0.12)}
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-camera-near={6}
        shadow-camera-far={32}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* A low raking light from the wings: it is what makes the pleats read as deep velvet. */}
      <directionalLight position={[-9, 3.5, 7]} intensity={rake} color={mix(pal.hi, '#ffd2b8', 0.5)} />
      <pointLight ref={candleLight} position={[TABLE[0], TABLE_TOP + 0.42, TABLE[2] - 0.02]} color={pal.candle} intensity={candleK} decay={2} />
      <Environment resolution={settings.envResolution} frames={1} environmentIntensity={envK}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={shade(mix(pal.deep, pal.candle, 0.22), 0.7)} side={BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={1.4} color={mix(pal.linen, pal.candle, 0.4)} position={[0, -5, 3]} rotation-x={-Math.PI / 2} scale={[12, 8, 1]} />
        <Lightformer form="rect" intensity={2.4} color={mix('#ffffff', pal.candle, 0.3)} position={[0, 9, 3]} rotation-x={Math.PI / 2} scale={[7, 3, 1]} />
        <Lightformer form="ring" intensity={2.6} color={pal.candle} position={[2.5, 1.2, 6]} scale={1.6} />
        <Lightformer form="rect" intensity={0.9} color={pal.hi} position={[-7, 2.5, 1]} rotation-y={Math.PI / 2} scale={[5, 6, 1]} />
        <Lightformer form="rect" intensity={0.7} color={pal.candle} position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <mesh geometry={wall.geometry} material={wall.material} position={[0, 17, -14.8]} renderOrder={-10} />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, -4]} material={floorMat} receiveShadow={settings.shadows}>
          <planeGeometry args={[46, 34]} />
        </mesh>
        <primitive object={legs} />

        <group position={[0, 0, FACADE_Z]}>
          <mesh geometry={facade.lines.geometry} material={facade.lines.material} frustumCulled={false} renderOrder={2} />
          <points geometry={facade.lights.geometry} material={facade.lights.material} frustumCulled={false} renderOrder={3} />
          <group position={[0, 0, 0.3]}>
            <FitGoldText
              text={names}
              lang={view.lang}
              height={1.3}
              maxWidth={7.2}
              color={mix(pal.gold, '#f6e2b0', 0.3)}
              emissive={pal.gold}
              emissiveIntensity={0.6}
              opacity={0}
              position={[0, 4.12, 0]}
              materialRef={namesMat}
              onReady={textReady}
            />
            <FitGoldText
              text={view.dateLine}
              lang={view.lang}
              role="serif"
              height={0.5}
              maxWidth={6.4}
              color={mix(pal.gold, '#f6e2b0', 0.3)}
              emissive={pal.gold}
              emissiveIntensity={0.55}
              opacity={0}
              position={[0, 2.9, 0]}
              materialRef={dateMat}
              onReady={textReady}
            />
          </group>
        </group>

        <group position={TABLE}>
          <Table palette={tablePal} low={low} shadows={settings.shadows} fx={fx} names={names} lang={view.lang} onTextReady={textReady} roseCount={low ? 7 : 16} />
        </group>

        <mesh geometry={curtain.geometry} material={curtain.material} frustumCulled={false} />
        <mesh geometry={valance.geometry} material={valance.material} position={[1.25, 0, 0.32]} frustumCulled={false} />

        <primitive object={petals} />
        <points geometry={dust.geometry} material={dust.material} frustumCulled={false} renderOrder={6} />
        <mesh ref={beamMesh} geometry={beam.geometry} material={beam.material} frustumCulled={false} renderOrder={7} />
        <Burst color={mix(pal.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Post grade={grade} dofRef={dof} />
      <ShaderWarmup />
    </>
  );
}
