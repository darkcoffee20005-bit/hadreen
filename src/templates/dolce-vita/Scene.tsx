'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, Object3D, type Group, type MeshStandardMaterial, type PerspectiveCamera } from 'three';
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
import { Grade } from '@/lib/invite/stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { ambientShot, TRACK } from './camera';
import { Balcony } from './parts/Balcony';
import { Boat } from './parts/Boat';
import { Clouds, Lake, Shore, SkyDome, useShoreAssets } from './parts/Landscape';
import { GateCard, useCardMaterial, useDisplayFamily, useEnvelope, useSparks } from './parts/Letter';
import { skyUniforms, waterUniforms } from './shaders';
import { cloudAtlas, cottoTexture, dotTexture, facadeTexture, stoneTexture, waterNormalTexture } from './textures';
import { boatX, INTRO, introState, letterRise } from './timeline';
import { BOAT_Z, CARD, CARD_SIZE, CARD_TILT, ENVELOPE, ENVELOPE_LEAN, ENVELOPE_SIZE, LAKE_Y } from './world';

const FOG = { color: '#D9E7F3', near: 40, far: 820 };
/** The envelope (and the names above it) turn toward the end shot. */
const YAW = 0.38;

/**
 * Dolce Vita (دولتشي فيتا): a bright Mediterranean-lake daydream.
 *  S1  a powder-blue card with a gilded wreath on the stone balustrade, framed by roses; the DOM
 *      scratch tiles (day | month | year) sit on the rail at the bottom of the frame
 *  S2  a sparkle burst, then a crane up and back over the roses: the lake (scrolling normals and
 *      sky reflection; planar on high, mirrored shore on medium), three layers of mountains in
 *      haze, villas with terracotta roofs, cypresses, drifting clouds, a sloop gliding through
 *      the glitter
 *  S3  an arc down to the bistro table: the powder-blue envelope opens, the names float up in
 *      gold over navy; behind the content the letter rises out of the envelope with the scroll.
 * Every visual is a pure function of director.time (timeline.ts), so skip/seek/rewind are exact.
 */
export default function DolceVitaScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const sc = view.palette.scene;
  const pal = useMemo(
    () => ({
      powder: sc.powder ?? '#A9C7E4',
      powderDeep: sc.powderDeep ?? '#6F97C2',
      skyTop: sc.skyTop ?? '#BFDDF5',
      skyLow: sc.skyLow ?? '#EAF4FB',
      lake: sc.lake ?? '#4F86B0',
      mountain: sc.mountain ?? '#8098AE',
      villa: sc.villa ?? '#EAD2B0',
      terracotta: sc.terracotta ?? '#C8714F',
      rose: sc.rose ?? '#E8A3B4',
      stone: sc.stone ?? '#EFE7DC',
      foil: sc.foil ?? '#B9CFE6',
      gold: view.palette.gold,
      ink: view.palette.ink,
    }),
    [sc, view.palette.gold, view.palette.ink],
  );

  // The lake world is ~1 km deep: give this scene's camera the range it needs.
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  useLayoutEffect(() => {
    const prev = camera.far;
    camera.far = 1500;
    camera.updateProjectionMatrix();
    return () => {
      camera.far = prev;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  // The mirrored shore (medium tier) clips everything that was under the water.
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const prev = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = prev;
    };
  }, [gl]);

  const family = useDisplayFamily(view.lang);
  const textReady = useTextsReady(8);

  const sun = useTweak('sun', 2.7, { min: 0, max: 8, step: 0.05 });
  const hemi = useTweak('hemisphere', 1.15, { min: 0, max: 4, step: 0.05 });
  const glitterK = useTweak('glitter', 1, { min: 0, max: 3, step: 0.05 });
  const bloom = useTweak('bloom', 0.5, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.22, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.05,
    ambient: (scroll, t) => ambientShot(scroll, t, store.getState().capture != null),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.012, 0.014, 0.022],
      gamma: [1.0, 1.0, 1.02],
      gain: [1.02, 1.01, 0.99],
      saturation: 1.1,
      contrast: 1.03,
      shadowTint: [0.42, 0.47, 0.58],
      highlightTint: [0.57, 0.53, 0.47],
      splitAmount: 0.2,
      bloom,
      vignette,
      grain: 0.022,
    }),
    [bloom, vignette],
  );

  const maps = useMemo(() => {
    if (typeof document === 'undefined') return { water: null, clouds: null, facade: null, cotto: null, stone: null, dot: null };
    return { water: waterNormalTexture(), clouds: cloudAtlas(), facade: facadeTexture(), cotto: cottoTexture(), stone: stoneTexture(), dot: dotTexture() };
  }, []);
  useEffect(() => () => Object.values(maps).forEach((m) => m?.dispose()), [maps]);

  const sky = useMemo(() => skyUniforms(mix(pal.skyTop, pal.powderDeep, 0.45), mix(pal.skyLow, pal.skyTop, 0.25), mix(pal.lake, pal.skyLow, 0.6), '#F1F6F9', '#FFF3DC'), [pal]);
  const water = useMemo(() => {
    const u = waterUniforms(sky, pal.lake, mix(pal.lake, '#21597C', 0.45), FOG);
    u.uNormal.value = maps.water;
    return u;
  }, [sky, pal.lake, maps.water]);

  const shore = useShoreAssets({ terracotta: pal.terracotta, villa: pal.villa }, maps.facade, low);
  const cardMat = useCardMaterial(view.monogram, family, mix(pal.powder, '#FFFFFF', 0.08), shade(pal.gold, 0.74), textReady);
  const envelope = useEnvelope(
    view.monogram,
    family,
    { paper: mix(pal.powder, '#FFFFFF', 0.12), gold: pal.gold, liner: '#F7E9B8', rose: pal.rose, ink: pal.ink, powder: pal.powder, mountain: pal.mountain, lake: pal.lake },
    textReady,
  );
  const sparks = useSparks(scaledCount(150, tier), pal.gold, pal.foil, maps.dot);

  const boat = useRef<Group>(null);
  const flap = useRef<Group>(null);
  const letter = useRef<Group>(null);
  const names = useRef<Group>(null);
  const nameMats = useRef<(MeshStandardMaterial | null)[]>([]);
  const worldTime = useRef(0);
  const drift = useRef(0);
  const away = useRef(0);
  const rise = useRef(0);
  const sunTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(1.0, 0.6, 0.6);
    return o;
  }, []);

  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('chimes', { gain: 0.8, rate: 1.15 });
        haptics.success();
      }, [], 0.02)
        .call(() => audio.sfx('chimes', { gain: 0.35, rate: 1.5 }), [], 0.35)
        .call(() => audio.sfx('whoosh', { gain: 0.7, rate: 0.75 }), [], 0.7)
        .call(() => audio.sfx('whoosh', { gain: 0.35, rate: 0.45 }), [], 1.6)
        .call(() => audio.sfx('water', { gain: 0.7 }), [], 3.25)
        .call(() => audio.sfx('water', { gain: 0.45, rate: 0.85 }), [], 4.4)
        .call(() => audio.sfx('whoosh', { gain: 0.4, rate: 0.6 }), [], 5.25)
        .call(() => {
          audio.sfx('paper', { gain: 0.6 });
          haptics.tap();
        }, [], 5.7)
        .call(() => audio.sfx('paper', { gain: 0.4, rate: 1.25 }), [], 6.25)
        .call(() => audio.sfx('chimes', { gain: 0.5, rate: 1.0 }), [], 6.85)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture, scroll } = store.getState();
    const s = introState(director.time);
    const clock = state.clock.elapsedTime;
    const now = capture ? 6 + director.time : clock;
    worldTime.current = now;
    const after = phase === 'handoff' || phase === 'content';
    drift.current = after && !capture ? drift.current + delta : 0;
    away.current = capture ? (after ? 1 : 0) : away.current + ((after ? 1 : 0) - away.current) * Math.min(1, delta * 1.6);

    water.uTime.value = now;
    const crossing = Math.sin(Math.PI * Math.min(1, Math.max(0, (director.time - 2.7) / 3.3)));
    water.uGlitter.value = s.glitter * glitterK;

    const bx = boatX(s.boat, drift.current);
    water.uBoat.value.set(bx, BOAT_Z, 0.35 + 0.65 * crossing);
    if (boat.current) {
      const b = boat.current;
      const bob = capture ? 0 : 1;
      b.position.set(bx, LAKE_Y + 0.25 + Math.sin(now * 1.3) * 0.12 * bob, BOAT_Z);
      b.rotation.set(Math.sin(now * 0.9) * 0.035 * bob - 0.07, Math.PI, Math.sin(now * 1.1 + 1) * 0.02 * bob);
    }

    const sp = sparks.material.uniforms;
    sp.uT!.value = phase === 'gate' || phase === 'boot' || phase === 'loading' ? -1 : director.time;
    sp.uGate!.value = phase === 'gate' ? 1 : 0;
    sp.uClock!.value = capture ? 0.35 : clock;
    sp.uScale!.value = state.size.height * 0.06;

    if (flap.current) flap.current.rotation.x = -Math.PI * 1.06 * s.flap;
    const target = letterRise(s.peek, after ? scroll : 0);
    rise.current = capture || !after ? target : rise.current + (target - rise.current) * Math.min(1, delta * 3);
    if (letter.current) letter.current.position.y = -ENVELOPE_SIZE[1] * 0.05 + rise.current * ENVELOPE_SIZE[1] * 0.82;
    if (names.current) {
      const k = s.names * (1 - away.current);
      names.current.position.y = ENVELOPE[1] + 0.25 + (1 - s.names) * -0.06 + away.current * 0.18;
      names.current.visible = k > 0.002;
      for (const m of nameMats.current) if (m) m.opacity = k;
    }
  });

  const [ew, eh] = ENVELOPE_SIZE;
  const navy = (m: MeshStandardMaterial | null) => {
    if (!m) return;
    m.metalness = 0.15;
    m.roughness = 0.55;
  };
  const nameLine = (text: string, y: number, height: number, i: number, role: 'display' | 'serif' = 'display') => {
    const gold = role === 'serif';
    return (
      <group key={`${text}-${i}`}>
        {/* A gilded edge behind the navy letters (or a navy shadow behind the gold «و»). */}
        <GoldText text={text} lang={view.lang} role={role} height={height} position={[0.003, y - 0.004, -0.003]} color={gold ? pal.ink : pal.gold} emissive={gold ? pal.ink : view.palette.goldInk} emissiveIntensity={0.3} opacity={0} materialRef={(m) => { nameMats.current[i * 2] = m; if (gold) navy(m); }} onReady={textReady} />
        <GoldText text={text} lang={view.lang} role={role} height={height} position={[0, y, 0]} color={gold ? pal.gold : pal.ink} emissive={gold ? view.palette.goldInk : pal.ink} emissiveIntensity={gold ? 0.35 : 0.2} opacity={0} materialRef={(m) => { nameMats.current[i * 2 + 1] = m; if (!gold) navy(m); }} onReady={textReady} />
      </group>
    );
  };

  return (
    <>
      <SkyDome uniforms={sky} />
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />
      <hemisphereLight args={['#E6F0F9', '#CDBB9F', hemi]} />
      <primitive object={sunTarget} />
      <directionalLight
        position={[1.0 - 4, 0.6 + 12, 0.6 + 4.5]}
        target={sunTarget}
        intensity={sun}
        color="#FFF2DE"
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-camera-left={-3.4}
        shadow-camera-right={3.4}
        shadow-camera-top={3.4}
        shadow-camera-bottom={-3.4}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[6, 3, -8]} intensity={0.6} color={mix('#FFFFFF', pal.powder, 0.4)} />
      <Environment resolution={settings.envResolution} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={shade(mix(pal.skyTop, pal.lake, 0.35), 0.75)} side={BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={3} color="#FFF4E0" position={[-4, 7, 5]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#FFFFFF" position={[0, 2, 8]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.0} color={pal.powder} position={[7, 2, -2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} color={pal.stone} position={[0, -4, 2]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <Clouds count={scaledCount(24, tier)} atlas={maps.clouds} time={worldTime} lit="#FFFFFF" shade={mix(pal.powder, '#F4F7FA', 0.6)} fog={FOG} />
        <Shore a={shore} />
        {tier === 'medium' && <Shore a={shore} mirrored />}
        <Lake uniforms={water} reflection={tier === 'high' ? settings.reflection : 0} />
        <Boat ref={boat} ink={pal.ink} gold={pal.gold} />

        <Balcony stone={pal.stone} stoneMap={maps.stone} cotto={maps.cotto} rose={pal.rose} powder={pal.powder} gold={pal.gold} low={low} shadows={settings.shadows} />

        {/* S1 · the card on the rail, propped toward us. */}
        <group position={[CARD[0], CARD[1] + Math.sin(CARD_TILT) * CARD_SIZE[1] * 0.5 + 0.003, CARD[2] - 0.02]} rotation={[-Math.PI / 2 + CARD_TILT, 0, 0]}>
          <GateCard material={cardMat} />
        </group>
        <points geometry={sparks.geometry} material={sparks.material} position={[CARD[0], CARD[1] + Math.sin(CARD_TILT) * CARD_SIZE[1] * 0.5 + 0.003, CARD[2] - 0.02]} frustumCulled={false} renderOrder={8} />

        {/* S3 · the envelope in its brass holder on the table. */}
        {envelope && (
          <group position={ENVELOPE} rotation={[-ENVELOPE_LEAN, YAW, 0, 'YXZ']}>
            <mesh geometry={envelope.back} material={envelope.paper} castShadow />
            <group ref={letter} position={[0, 0, 0.003]}>
              <mesh geometry={envelope.letter} material={[envelope.plain, envelope.plain, envelope.plain, envelope.plain, envelope.letterMat, envelope.plain]} />
            </group>
            <mesh geometry={envelope.pocket} material={envelope.paper} position-z={0.006} />
            <group ref={flap} position={[0, eh / 2, 0.008]}>
              <mesh geometry={envelope.flap} material={envelope.paper} position-z={0.0006} />
              <mesh geometry={envelope.flap} material={envelope.liner} position-z={-0.0006} scale={[0.96, 0.96, 1]} />
            </group>
            <mesh position={[0, -eh / 2 + 0.006, 0.02]}>
              <boxGeometry args={[ew * 0.6, 0.014, 0.022]} />
              <meshStandardMaterial color={pal.gold} metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        )}
        <group ref={names} position={[ENVELOPE[0], ENVELOPE[1] + 0.25, ENVELOPE[2] + 0.04]} rotation-y={YAW} visible={false}>
          {nameLine(view.groom, 0.4, 0.15, 0)}
          {nameLine(view.lang === 'ar' ? 'و' : '&', 0.313, 0.07, 1, 'serif')}
          {nameLine(view.bride, 0.228, 0.15, 2)}
        </group>

        <Burst color={mix(pal.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}
