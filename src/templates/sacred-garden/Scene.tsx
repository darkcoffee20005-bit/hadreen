'use client';

import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, Vector3, type Group, type MeshStandardMaterial } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { LightRays } from '@/lib/invite/kit/LightRays';
import { useTweak } from '@/lib/invite/lab/tweaks';
import { useInvite, useInviteStore } from '@/lib/invite/machine';
import { scaledCount, TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import type { SceneProps } from '@/lib/invite/scene-types';
import { Burst } from '@/lib/invite/stage/Burst';
import { CinematicCamera, useDirector } from '@/lib/invite/stage/CinematicCamera';
import { mixHex, shadeHex } from '@/lib/invite/stage/color';
import { NEUTRAL_GRADE, type GradeParams } from '@/lib/invite/stage/grade';
import { Grade } from '@/lib/invite/stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { goboTexture } from '@/lib/invite/stage/textures';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { ambientShot, BASMALA, buildTrack, ENVELOPE_AT, envelopeSize, swanPlacement } from './layout';
import { GardenEnvelope, type EnvelopeAnim } from './parts/Envelope';
import { Garden, SwanPair, useGardenAssets, type SwimState } from './parts/Garden';
import { Petals } from './parts/Petals';
import { Pond, SkyDome } from './parts/Pond';
import { skyUniforms, waterUniforms } from './shaders';

/**
 * الحديقة المقدّسة — a nikkah at golden hour in an Iraqi garden.
 * Gate: a blush envelope with a gilded floral emboss and a wine wax seal, in dappled warm light.
 * Opening (8 s): the seal cracks into four shards, the flap curls open, the envelope drops away;
 * low over a still reflecting pool a rose-wrapped stone arch glows against the sun; two swans
 * glide in and meet in a heart; the basmala and the names fade up in gold.
 * Content: the heart under the arch frames the DOM names; scrolling cranes up into the sky.
 */
const SUN_DIR = new Vector3(0.105, 0.354, -1).normalize();

interface Beats {
  drop: number;
  glow: number;
  basmala: number;
  names: number;
  shimmer: number;
}

export default function SacredGardenScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const p = view.palette;
  const sc = p.scene;
  const c = useMemo(
    () => ({
      paper: sc.paper ?? '#F2DED6',
      seal: sc.seal ?? '#6B1626',
      stone: sc.stone ?? '#DCCDB9',
      rose: sc.rose ?? '#D98A97',
      leaf: sc.leaf ?? '#5E7A55',
      pond: sc.pond ?? '#2E4B47',
      sun: sc.sun ?? '#FFC98A',
      skyTop: sc.skyTop ?? '#F6D2A2',
      skyLow: sc.skyLow ?? '#E8A79E',
      gold: p.gold,
      goldInk: p.goldInk,
    }),
    [sc.paper, sc.seal, sc.stone, sc.rose, sc.leaf, sc.pond, sc.sun, sc.skyTop, sc.skyLow, p.gold, p.goldInk],
  );

  const sunI = useTweak('sun', 2.6, { min: 0, max: 8, step: 0.05 });
  const fillI = useTweak('fill', 1.1, { min: 0, max: 4, step: 0.05 });
  const hemiI = useTweak('hemisphere', 1.15, { min: 0, max: 3, step: 0.05 });
  const keyI = useTweak('envelope key', 38, { min: 0, max: 200, step: 1 });
  const bloom = useTweak('bloom', 0.7, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.42, { min: 0, max: 1, step: 0.01 });

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.85;
  const env = useMemo(() => envelopeSize(portrait ? 0.5 : 1.6), [portrait]);

  const director = useDirector({
    track: buildTrack(envelopeSize(1.6)),
    parallax: 0.32,
    ambient: (scroll, t) => ambientShot(scroll, store.getState().capture ? 0 : t * 0.08),
  });
  useLayoutEffect(() => {
    director.track = buildTrack(env);
  }, [director, env]);

  const envelope = useRef<EnvelopeAnim>({ flap: 0, crack: 0, glint: 0 });
  const swim = useRef<SwimState>({ swim: 0 });
  const beats = useRef<Beats>({ drop: 0, glow: 0, basmala: 0, names: 0, shimmer: 0 });
  const rays = useRef(0.3);
  const away = useRef(0);
  const envGroup = useRef<Group>(null);
  const basmalaMat = useRef<MeshStandardMaterial>(null);
  const nameMats = [useRef<MeshStandardMaterial>(null), useRef<MeshStandardMaterial>(null), useRef<MeshStandardMaterial>(null)];
  const namesGroup = useRef<Group>(null);
  const key = useRef<import('three').SpotLight>(null);
  const textReady = useTextsReady(4);

  const assets = useGardenAssets(c, tier);
  const sky = useMemo(
    () =>
      skyUniforms(
        { zenith: mixHex(c.skyLow, '#A3849C', 0.4), mid: mixHex(c.skyLow, c.skyTop, 0.25), horizon: mixHex(c.skyTop, c.sun, 0.45), sun: mixHex(c.sun, '#ffffff', 0.2) },
        SUN_DIR,
      ),
    [c.skyLow, c.skyTop, c.sun],
  );
  const water = useMemo(() => waterUniforms(sky, shadeHex(c.pond, 0.42)), [sky, c.pond]);
  const haze = useMemo(() => mixHex(c.skyTop, c.skyLow, 0.55), [c.skyTop, c.skyLow]);
  const gobo = useMemo(() => (typeof document === 'undefined' ? null : goboTexture('leaves', 512, 5, 0.62)), []);
  const spotTarget = useMemo(() => new Object3D(), []);
  const petalColors = useMemo(() => [mixHex(c.rose, '#ffffff', 0.45), c.rose, mixHex(c.rose, '#ffffff', 0.2), shadeHex(c.rose, 0.85), '#F6E7DA'], [c.rose]);

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.02, 0.005, 0.012],
      gamma: [1.0, 0.99, 0.97],
      gain: [1.03, 1.0, 0.95],
      saturation: 1.04,
      contrast: 1.04,
      shadowTint: toRgb(mixHex(c.pond, c.seal, 0.35), 0.5),
      highlightTint: toRgb(c.sun, 0.62),
      splitAmount: 0.24,
      bloom,
      vignette,
      grain: 0.03,
    }),
    [c.pond, c.seal, c.sun, bloom, vignette],
  );

  useIntro(
    (tl) => {
      const b = beats.current;
      tl.call(
        () => {
          audio.sfx('waxCrack');
          haptics.crack();
        },
        [],
        0.02,
      )
        .to(envelope.current, { crack: 1, duration: 1.35, ease: 'power1.in' }, 0)
        .call(() => audio.sfx('paper'), [], 0.62)
        .to(envelope.current, { flap: 1, duration: 1.1, ease: 'power2.inOut' }, 0.6)
        .call(() => audio.sfx('whoosh', { gain: 0.7 }), [], 1.75)
        .to(b, { drop: 1, duration: 1.1, ease: 'power2.in' }, 1.7)
        .call(() => audio.sfx('water', { gain: 0.6 }), [], 2.9)
        .to(b, { glow: 1, duration: 2.2, ease: 'sine.inOut' }, 2.7)
        .to(swim.current, { swim: 1, duration: 2.5, ease: 'none' }, 4.3)
        .call(() => audio.sfx('water', { gain: 0.45, rate: 0.9 }), [], 4.9)
        .call(() => audio.sfx('chimes', { gain: 0.8 }), [], 6.8)
        .to(b, { basmala: 1, duration: 0.65, ease: 'sine.out' }, 6.8)
        .to(b, { names: 1, duration: 0.6, ease: 'sine.out' }, 7.4)
        .fromTo(b, { shimmer: 0 }, { shimmer: 1, duration: 0.9, ease: 'none' }, 7.3)
        .to(director, { time: 8, duration: 8, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture } = store.getState();
    const t = state.clock.elapsedTime;
    const b = beats.current;
    envelope.current.glint = capture ? 0.5 : (t / 3) % 1;

    if (envGroup.current) {
      const g = envGroup.current;
      g.position.set(ENVELOPE_AT[0], ENVELOPE_AT[1] - b.drop * b.drop * 3.4, ENVELOPE_AT[2] - b.drop * 0.4);
      g.rotation.set(-b.drop * 0.7, 0, phase === 'gate' && !capture ? Math.sin(t * 0.7) * 0.012 : 0);
      g.visible = b.drop < 0.995;
    }
    if (key.current) key.current.intensity = keyI * (1 - b.drop * 0.85);

    const target = phase === 'handoff' || phase === 'content' ? 1 : 0;
    away.current = capture ? target : away.current + (target - away.current) * Math.min(1, delta * 1.3);
    const keep = 1 - away.current;
    const low = tier === 'low';
    if (basmalaMat.current) {
      basmalaMat.current.opacity = b.basmala * keep;
      basmalaMat.current.visible = b.basmala * keep > 0.002;
      basmalaMat.current.emissiveIntensity = (low ? 0.55 : 0.3) + 0.4 * (1 - b.basmala);
    }
    const shimmer = Math.sin(Math.PI * b.shimmer);
    nameMats.forEach((m) => {
      if (!m.current) return;
      m.current.opacity = b.names * keep;
      m.current.visible = b.names * keep > 0.002;
      m.current.emissiveIntensity = (low ? 0.6 : 0.32) + shimmer * 0.9;
    });
    if (namesGroup.current) namesGroup.current.position.y = (1 - b.names) * -0.06 + away.current * 0.25;
    rays.current = (0.35 + 0.65 * b.glow) * (1 - away.current * 0.35);

    // Pond: time, sun glitter and the swans' wakes.
    water.uTime.value = capture ? 4 : t;
    water.uSunStrength.value = 0.12 + 0.88 * b.glow;
    const u = swim.current.swim;
    [-1, 1].forEach((side, i) => {
      const s = swanPlacement(side as -1 | 1, u);
      const v = i === 0 ? water.uSwanA.value : water.uSwanB.value;
      v.set(s.x, s.z, Math.cos(s.heading), -Math.sin(s.heading));
      if (i === 0) water.uWake.value.x = s.wake;
      else water.uWake.value.y = s.wake;
    });
  });

  const realReflection = tier === 'high' ? settings.reflection : 0;
  const ar = view.lang === 'ar';
  const fontVar = ar ? '--font-aref' : '--font-pinyon';

  return (
    <>
      <SkyDome uniforms={sky} />
      <fog attach="fog" args={[haze, 24, 95]} />
      <hemisphereLight args={[mixHex(c.skyTop, '#ffffff', 0.3), shadeHex(c.leaf, 0.55), hemiI]} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(20).toArray()} intensity={sunI} color={c.sun} />
      <directionalLight position={[-5, 4, 10]} intensity={fillI} color={mixHex(c.skyLow, '#ffffff', 0.45)} />
      <primitive object={spotTarget} position={ENVELOPE_AT} />
      <spotLight
        ref={key}
        position={[1.5, 3.0, 8.4]}
        target={spotTarget}
        angle={0.85}
        penumbra={0.9}
        intensity={keyI}
        color="#FFEDEA"
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        map={settings.shadows ? gobo : null}
      />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={1.7} color={mixHex(c.sun, '#ffffff', 0.3)} position={[0, 2.5, 10]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color={c.skyTop} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[16, 16, 1]} />
        <Lightformer form="circle" intensity={5} color={c.sun} position={SUN_DIR.clone().multiplyScalar(12).toArray()} scale={3} />
        <Lightformer form="rect" intensity={0.35} color={shadeHex(c.leaf, 0.6)} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[16, 16, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <group ref={envGroup} position={ENVELOPE_AT}>
          <GardenEnvelope size={env} colors={{ paper: mixHex(c.paper, '#E7C6D0', 0.45), wine: c.seal, gold: c.gold, seal: c.seal }} monogram={view.monogram} fontVar={fontVar} state={envelope} />
        </group>

        <Garden assets={assets} colors={c} />
        <SwanPair geometry={assets.geometry.swan} material={assets.materials.swan} state={swim} />
        {realReflection === 0 && (
          <group scale={[1, -1, 1]}>
            <Garden assets={assets} colors={c} mirrored />
            <SwanPair geometry={assets.geometry.swan} material={assets.materials.swanMirror} state={swim} mirrored />
          </group>
        )}
        <Pond uniforms={water} reflection={realReflection} />
        <Petals air={scaledCount(160, tier)} floating={scaledCount(80, tier)} colors={petalColors} />

        <GoldText text={BASMALA} lang="ar" role="serif" height={0.3} position={[0, 3.2, -2.32]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.3} opacity={0} materialRef={basmalaMat} onReady={textReady} />
        <group ref={namesGroup}>
          <GoldText text={view.groom} lang={view.lang} height={0.54} position={[0, 2.56, -2.18]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.32} opacity={0} materialRef={nameMats[0]} onReady={textReady} />
          <GoldText text={ar ? 'و' : '&'} lang={view.lang} role="serif" height={0.24} position={[0, 2.13, -2.18]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.32} opacity={0} materialRef={nameMats[1]} onReady={textReady} />
          <GoldText text={view.bride} lang={view.lang} height={0.54} position={[0, 1.72, -2.18]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.32} opacity={0} materialRef={nameMats[2]} onReady={textReady} />
        </group>

        <group position={[0.5, 2.6, -6.2]} rotation={[-0.25, 0, 0.12]}>
          <LightRays intensity={rays} color={mixHex(c.sun, '#ffffff', 0.3)} count={tier === 'low' ? 3 : 5} length={9} spread={2.6} />
        </group>
        {tier !== 'low' && (
          <group position={[0.2, 2.2, -5.0]} rotation={[-0.3, 0, -0.08]}>
            <LightRays intensity={rays} color={mixHex(c.sun, '#ffffff', 0.45)} count={4} length={8} spread={3.2} />
          </group>
        )}
        <Sparkles count={scaledCount(110, tier)} scale={[6, 4.5, 9]} position={[0, 2, 0.5]} size={2.4} speed={0.2} opacity={0.6} color={mixHex(c.sun, '#ffffff', 0.4)} noise={0.6} />
        <Burst color={mixHex(c.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}

function toRgb(hex: string, k: number): [number, number, number] {
  const col = new Color(hex);
  col.convertLinearToSRGB();
  return [col.r * k + (1 - k) * 0.5, col.g * k + (1 - k) * 0.5, col.b * k + (1 - k) * 0.5];
}
