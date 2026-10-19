'use client';

import { Environment, Lightformer, RoundedBox, Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import { Color, type Group, type MeshStandardMaterial, type SpotLight } from 'three';
import { audio } from '../audio/engine';
import { haptics } from '../interaction/haptics';
import { Envelope, type EnvelopeState } from '../kit/Envelope';
import { GoldArch } from '../kit/GoldArch';
import { LightRays } from '../kit/LightRays';
import { Sky } from '../kit/Sky';
import { WaxSeal, type SealState } from '../kit/WaxSeal';
import { useInvite, useInviteStore } from '../machine';
import { scaledCount, TIER_SETTINGS } from '../quality/tiers';
import type { SceneProps } from '../scene-types';
import { Burst } from '../stage/Burst';
import { CinematicCamera, useDirector } from '../stage/CinematicCamera';
import { mixHex as mix, shadeHex as shade } from '../stage/color';
import { NEUTRAL_GRADE, type GradeParams } from '../stage/grade';
import { Grade } from '../stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '../stage/Readiness';
import type { TrackKey } from '../stage/rig';
import { goboTexture } from '../stage/textures';
import { useIntro } from '../stage/useIntro';
import { useTweak } from '../lab/tweaks';
import { GoldText } from '../text3d/GoldText';

/**
 * The engine test stage: an emerald-and-gold envelope that exercises everything the templates
 * use (gate, opening timeline, camera track, gobo light, grade, text, sound, hand-off, ambient).
 * Every template plays it, in its own colours, until its bespoke scene replaces it (Phase 3).
 */
const TRACK: TrackKey[] = [
  { at: 0, shot: { position: [0, 0, 4.4], target: [0, 0, 0], fov: 32, fit: [3.7, 4.2] } },
  { at: 0.6, shot: { position: [0, -0.05, 4.0], target: [0, 0, 0], fov: 32, fit: [3.6, 3.9] } },
  { at: 1.6, shot: { position: [0, 0.35, 4.5], target: [0, 0.3, 0], fov: 32, fit: [3.6, 2.9] } },
  { at: 3.1, shot: { position: [0, 1.4, 5.2], target: [0, 1.2, 0], fov: 33, fit: [3.4, 2.8] } },
  { at: 6.2, shot: { position: [0.5, 1.0, 8.6], target: [0, 0.7, 0], fov: 35, fit: [4.9, 6.4] } },
  { at: 8.0, shot: { position: [0, 0.8, 8.2], target: [0, 0.7, 0], fov: 35, fit: [4.7, 6.2] } },
];

export default function TestStage({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const p = view.palette;
  const seal = useRef<SealState>({ crack: 0, glint: 0 });
  const envelope = useRef<EnvelopeState>({ flap: 0 });
  const anim = useRef({ cardRise: 0, settle: 0, envDrop: 0, arch: 0, glow: 0 });
  const rays = useRef(0);
  const away = useRef(0);
  const envGroup = useRef<Group>(null);
  const card = useRef<Group>(null);
  const arch = useRef<Group>(null);
  const archMat = useRef<MeshStandardMaterial>(null);
  const key = useRef<SpotLight>(null);
  const textReady = useTextsReady(3);
  const keyIntensity = useTweak('key light', 130, { min: 0, max: 400, step: 1 });
  const hemi = useTweak('hemisphere', 0.9, { min: 0, max: 3, step: 0.05 });
  const bloom = useTweak('bloom', 0.75, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.5, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.22,
    ambient: (scroll, t) => ({
      position: [Math.sin(t * 0.12) * 0.25, 0.8 + scroll * 3.2, 8.3 + scroll * 1.2],
      target: [0, 0.7 + scroll * 2.6, 0],
      fov: 35,
      fit: [4.7, 6.2],
    }),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      gain: [1.03, 1.0, 0.96],
      shadowTint: rgb(p.band),
      highlightTint: [0.62, 0.55, 0.44],
      splitAmount: 0.3,
      bloom,
      vignette,
    }),
    [p.band, bloom, vignette],
  );

  const gobo = useMemo(() => (typeof document === 'undefined' ? null : goboTexture('lattice')), []);
  const sky = useMemo(
    () => ({ top: shade(p.band, 0.6), horizon: mix(p.band, p.gold, 0.1), bottom: shade(p.band, 0.35) }),
    [p.band, p.gold],
  );

  useIntro(
    (tl) => {
      const a = anim.current;
      tl.call(() => {
        audio.sfx('waxCrack');
        haptics.crack();
      }, [], 0.02)
        .to(seal.current, { crack: 1, duration: 1.0, ease: 'power2.out' }, 0)
        .call(() => audio.sfx('paper'), [], 0.5)
        .to(envelope.current, { flap: 1, duration: 1.1, ease: 'power2.inOut' }, 0.45)
        .call(() => audio.sfx('paper', { rate: 1.2, gain: 0.6 }), [], 1.6)
        .to(a, { cardRise: 1, duration: 1.5, ease: 'power3.inOut' }, 1.5)
        .call(() => audio.sfx('whoosh', { gain: 0.8 }), [], 2.9)
        .to(a, { envDrop: 1, duration: 1.3, ease: 'power2.in' }, 2.8)
        .to(a, { settle: 1, duration: 2.6, ease: 'power2.inOut' }, 3.1)
        .to(a, { arch: 1, duration: 2.6, ease: 'expo.out' }, 3.5)
        .to(rays, { current: 1, duration: 2.6, ease: 'sine.inOut' }, 3.7)
        .call(() => audio.sfx('chimes', { gain: 0.8 }), [], 5.3)
        .to(a, { glow: 1, duration: 2.2, ease: 'sine.inOut' }, 5.6)
        .to(director, { time: 8, duration: 8, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const a = anim.current;
    const t = state.clock.elapsedTime;
    const { phase, capture } = store.getState();
    seal.current.glint = (t * 0.25) % 1;

    if (envGroup.current) {
      envGroup.current.position.y = -a.envDrop * a.envDrop * 5.5;
      envGroup.current.rotation.x = a.envDrop * 0.5;
      envGroup.current.rotation.z = phase === 'gate' && !capture ? Math.sin(t * 0.7) * 0.012 : 0;
      envGroup.current.visible = a.envDrop < 0.98;
    }

    // After the hand-off the card drifts up and back, leaving the arch for the DOM names.
    const target = phase === 'handoff' || phase === 'content' ? 1 : 0;
    away.current = capture ? target : away.current + (target - away.current) * Math.min(1, delta * 1.2);
    if (card.current) {
      const rise = 1.75 * a.cardRise;
      const y = rise + (0.65 - rise) * a.settle + away.current * 6;
      card.current.position.set(0, y, -0.012 + a.settle * 0.35 - away.current * 2.5);
      const s = 1 - away.current * 0.35;
      card.current.scale.setScalar(s);
      card.current.visible = away.current < 0.98;
      card.current.rotation.y = a.settle * Math.sin(t * 0.4) * 0.06;
      card.current.rotation.x = -away.current * 0.25;
    }
    if (arch.current) {
      arch.current.scale.set(1, Math.max(0.001, a.arch), 1);
      arch.current.visible = a.arch > 0.001;
    }
    if (archMat.current) archMat.current.emissiveIntensity = 0.15 + a.glow * 0.45 + Math.sin(t * 1.2) * 0.05 * a.glow;
    if (key.current) key.current.intensity = keyIntensity * (1 + a.glow * 0.3);
  });

  const dustCount = scaledCount(140, tier);

  return (
    <>
      <Sky top={sky.top} horizon={sky.horizon} bottom={sky.bottom} glow={mix(p.band, p.gold, 0.45)} glowDir={[0, 0.5, -1]} glowStrength={0.08} />
      <fog attach="fog" args={[sky.horizon, 20, 55]} />
      <hemisphereLight args={[mix(p.bg, p.gold, 0.25), shade(p.band, 0.6), hemi]} />
      <spotLight
        ref={key}
        position={[3.2, 5.5, 6]}
        angle={0.5}
        penumbra={0.7}
        intensity={keyIntensity}
        color={mix('#ffffff', p.gold, 0.35)}
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-bias={-0.0004}
        map={settings.shadows ? gobo : null}
      />
      <directionalLight position={[-3, 4, -5]} intensity={1.6} color={p.gold} />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={2.2} color={mix('#ffffff', p.gold, 0.4)} position={[0, 5, -2]} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.2} color={p.gold} position={[3, 1, 3]} scale={2.5} />
        <Lightformer form="rect" intensity={0.6} color={mix(p.band, '#ffffff', 0.5)} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 6, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <group ref={envGroup}>
          <Envelope paper={mix(p.surface, p.gold, 0.12)} liner={p.accent} edge={p.gold} state={envelope}>
            <WaxSeal monogram={view.monogram} color={mix(p.accent, '#ffffff', 0.06)} relief={p.gold} state={seal} fontVar={view.lang === 'ar' ? '--font-aref' : '--font-pinyon'} />
          </Envelope>
        </group>

        <group ref={card}>
          <RoundedBox args={[2.9, 1.9, 0.02]} radius={0.015} smoothness={2} castShadow receiveShadow>
            <meshPhysicalMaterial color={p.surface} roughness={0.75} sheen={0.25} sheenColor="#ffffff" />
          </RoundedBox>
          <group position={[0, 0, 0.02]}>
            <GoldText text={view.groom} lang={view.lang} height={0.42} position={[0, 0.42, 0]} color={p.gold} emissive={p.goldInk} emissiveIntensity={0.25} onReady={textReady} />
            <GoldText text={view.lang === 'ar' ? 'و' : '&'} lang={view.lang} role="serif" height={0.2} position={[0, 0.02, 0]} color={p.gold} onReady={textReady} />
            <GoldText text={view.bride} lang={view.lang} height={0.42} position={[0, -0.4, 0]} color={p.gold} emissive={p.goldInk} emissiveIntensity={0.25} onReady={textReady} />
          </group>
        </group>

        <group ref={arch} position={[0, 0.7, -1.3]}>
          <GoldArch width={4.1} height={5.6} color={p.gold} emissive={p.gold} emissiveIntensity={0.15} materialRef={archMat} />
        </group>
        <LightRays intensity={rays} color={mix('#ffffff', p.gold, 0.5)} count={tier === 'low' ? 3 : 5} />
        <Sparkles count={dustCount} scale={[7, 7, 4]} position={[0, 0.8, 0]} size={2.2} speed={0.25} opacity={0.55} color={p.gold} noise={0.6} />
        <Burst color={mix(p.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}

function rgb(hex: string): [number, number, number] {
  const c = new Color(hex);
  return [c.r * 0.5 + 0.25, c.g * 0.5 + 0.25, c.b * 0.5 + 0.25];
}
