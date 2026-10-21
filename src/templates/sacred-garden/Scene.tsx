'use client';

import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { LightRays } from '@/lib/invite/kit/LightRays';
import { useTweak } from '@/lib/invite/lab/tweaks';
import { useInvite, useInviteStore } from '@/lib/invite/machine';
import { scaledCount, TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import type { SceneProps } from '@/lib/invite/scene-types';
import { Burst } from '@/lib/invite/stage/Burst';
import { CinematicCamera, useDirector } from '@/lib/invite/stage/CinematicCamera';
import { mixHex } from '@/lib/invite/stage/color';
import { NEUTRAL_GRADE, type GradeParams } from '@/lib/invite/stage/grade';
import { Grade } from '@/lib/invite/stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { ambientShot, BASMALA, buildTrack, ENVELOPE_AT, envelopeSize, swanPlacement, VEIL } from './layout';
import { ENVELOPE_REST, GardenEnvelope, type EnvelopeAnim } from './parts/Envelope';
import { Garden, SwanPair, useGardenAssets, type SwimState } from './parts/Garden';
import { Petals } from './parts/Petals';
import { Pond, SkyDome } from './parts/Pond';
import { skyUniforms, waterUniforms } from './shaders';

/**
 * الحديقة المقدّسة — a nikkah in a pale garden on a soft, hazy morning.
 * Gate: an ivory envelope filling the screen, four flaps folded to a diamond under a burgundy
 * wax seal, blind-embossed flowering sprays catching a gentle raking light.
 * Opening (8 s): the seal glows warm and cracks away, the flaps peel open one after another,
 * light pours out of the envelope and whites out the frame; it clears on a cusped stone arch
 * wrapped in blush and cream roses over a still pale pool, where two swans glide in and meet in
 * a heart; the basmala and the names fade up in gold.
 * Content: the heart under the arch frames the DOM names; scrolling cranes up into the sky.
 */
const SUN_DIR = new Vector3(0.12, 0.42, -1).normalize();

interface Beats {
  veil: number;
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
      paper: sc.paper ?? '#F3EADF',
      blush: sc.blush ?? '#EBC9C3',
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
    [sc.paper, sc.blush, sc.seal, sc.stone, sc.rose, sc.leaf, sc.pond, sc.sun, sc.skyTop, sc.skyLow, p.gold, p.goldInk],
  );

  const sunI = useTweak('sun', 1.7, { min: 0, max: 8, step: 0.05 });
  const fillI = useTweak('fill', 0.8, { min: 0, max: 4, step: 0.05 });
  const hemiI = useTweak('hemisphere', 1.05, { min: 0, max: 3, step: 0.05 });
  const keyI = useTweak('envelope key', 26, { min: 0, max: 200, step: 1 });
  const bloom = useTweak('bloom', 0.55, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.22, { min: 0, max: 1, step: 0.01 });

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.85;
  const env = useMemo(() => envelopeSize(portrait ? 0.5 : 1.6), [portrait]);
  const envColors = useMemo(() => ({ paper: c.paper, blush: c.blush, gold: c.gold, seal: c.seal }), [c.paper, c.blush, c.gold, c.seal]);

  const director = useDirector({
    track: buildTrack(envelopeSize(1.6)),
    parallax: 0.32,
    ambient: (scroll, t) => ambientShot(scroll, store.getState().capture ? 0 : t * 0.08),
  });
  useLayoutEffect(() => {
    director.track = buildTrack(env);
  }, [director, env]);

  const envelope = useRef<EnvelopeAnim>({ ...ENVELOPE_REST });
  const swim = useRef<SwimState>({ swim: 0 });
  const beats = useRef<Beats>({ veil: 0, glow: 0, basmala: 0, names: 0, shimmer: 0 });
  const rays = useRef(0.3);
  const away = useRef(0);
  const envGroup = useRef<Group>(null);
  // Once the envelope has dissolved into the light it is unmounted: its paper and seal textures
  // are freed for the rest of the visit (it comes back if the opening is scrubbed back in the lab).
  const [envGone, setEnvGone] = useState(false);
  const envGoneRef = useRef(false);
  const basmalaMat = useRef<MeshStandardMaterial>(null);
  const nameMats = [useRef<MeshStandardMaterial>(null), useRef<MeshStandardMaterial>(null), useRef<MeshStandardMaterial>(null)];
  const namesGroup = useRef<Group>(null);
  const key = useRef<import('three').SpotLight>(null);
  const veil = useRef<Mesh>(null);
  const veilDir = useMemo(() => new Vector3(), []);
  const veilGeo = useMemo(() => new PlaneGeometry(1, 1), []);
  const veilMat = useMemo(() => new MeshBasicMaterial({ color: '#FFF6E8', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }), []);
  useEffect(
    () => () => {
      veilGeo.dispose();
      veilMat.dispose();
    },
    [veilGeo, veilMat],
  );
  const textReady = useTextsReady(4);

  const assets = useGardenAssets(c, tier);
  const sky = useMemo(
    () =>
      skyUniforms(
        { zenith: mixHex(c.skyTop, '#C9CFD6', 0.35), mid: mixHex(c.skyTop, c.skyLow, 0.3), horizon: mixHex(c.skyLow, '#ffffff', 0.35), sun: mixHex(c.sun, '#ffffff', 0.45) },
        SUN_DIR,
      ),
    [c.skyLow, c.skyTop, c.sun],
  );
  const water = useMemo(() => waterUniforms(sky, mixHex(c.pond, c.skyLow, 0.25)), [sky, c.pond, c.skyLow]);
  const haze = useMemo(() => mixHex(c.skyLow, '#ffffff', 0.25), [c.skyLow]);
  const spotTarget = useMemo(() => new Object3D(), []);
  const petalColors = useMemo(() => [mixHex(c.rose, '#ffffff', 0.55), mixHex(c.rose, '#ffffff', 0.3), c.rose, '#FBF3EA', '#F6E7DA'], [c.rose]);

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.012, 0.006, 0.004],
      gamma: [1.0, 0.99, 0.97],
      gain: [1.0, 0.99, 0.96],
      saturation: 1.0,
      contrast: 1.02,
      shadowTint: toRgb(mixHex(c.rose, c.seal, 0.3), 0.45),
      highlightTint: toRgb(c.sun, 0.55),
      splitAmount: 0.18,
      bloom,
      vignette,
      grain: 0.025,
    }),
    [c.rose, c.seal, c.sun, bloom, vignette],
  );

  useIntro(
    (tl) => {
      const b = beats.current;
      const e = envelope.current;
      tl.to(e, { glow: 1, duration: 0.9, ease: 'power1.in' }, 0)
        .call(
          () => {
            audio.sfx('waxCrack');
            haptics.crack();
          },
          [],
          0.85,
        )
        .to(e, { crack: 1, duration: 1.2, ease: 'power1.in' }, 0.8)
        .call(() => audio.sfx('paper'), [], 1.0)
        .to(e, { top: 1, duration: 0.95, ease: 'power2.inOut' }, 1.0)
        .to(e, { bottom: 1, duration: 0.95, ease: 'power2.inOut' }, 1.15)
        .call(() => audio.sfx('paper', { gain: 0.6, rate: 1.1 }), [], 1.3)
        .to(e, { left: 1, duration: 0.95, ease: 'power2.inOut' }, 1.3)
        .to(e, { right: 1, duration: 0.95, ease: 'power2.inOut' }, 1.4)
        .to(e, { light: 1, duration: 1.1, ease: 'power2.in' }, 1.65)
        .call(() => audio.sfx('whoosh', { gain: 0.6 }), [], VEIL.in)
        .to(b, { veil: 1, duration: VEIL.full - VEIL.in, ease: 'sine.in' }, VEIL.in)
        .to(e, { fade: 1, duration: 0.15, ease: 'none' }, VEIL.full - 0.1)
        .to(b, { veil: 0, duration: VEIL.out - VEIL.full - 0.3, ease: 'sine.out' }, VEIL.full + 0.3)
        .to(b, { glow: 1, duration: 2.2, ease: 'sine.inOut' }, 3.0)
        .call(() => audio.sfx('water', { gain: 0.5 }), [], 3.8)
        .to(swim.current, { swim: 1, duration: 2.8, ease: 'none' }, 3.6)
        .call(() => audio.sfx('water', { gain: 0.4, rate: 0.9 }), [], 4.9)
        .call(() => audio.sfx('chimes', { gain: 0.8 }), [], 6.5)
        .to(b, { basmala: 1, duration: 0.65, ease: 'sine.out' }, 6.5)
        .to(b, { names: 1, duration: 0.6, ease: 'sine.out' }, 7.0)
        .fromTo(b, { shimmer: 0 }, { shimmer: 1, duration: 0.9, ease: 'none' }, 6.95)
        .to(director, { time: 8, duration: 8, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture } = store.getState();
    const t = state.clock.elapsedTime;
    const b = beats.current;
    envelope.current.glint = capture ? 0.5 : (t / 3) % 1;

    const gone = envelope.current.fade >= 0.999;
    if (gone !== envGoneRef.current) {
      envGoneRef.current = gone;
      setEnvGone(gone);
    }
    if (envGroup.current) {
      const g = envGroup.current;
      // A breath of movement while it waits; still under capture.
      g.rotation.set(phase === 'gate' && !capture ? Math.sin(t * 0.6) * 0.01 : 0, phase === 'gate' && !capture ? Math.sin(t * 0.45) * 0.012 : 0, 0);
      g.visible = envelope.current.fade < 0.999;
    }
    if (key.current) key.current.intensity = keyI * (1 - envelope.current.fade);
    if (veil.current) {
      const cam = state.camera;
      veil.current.position.copy(cam.position).add(cam.getWorldDirection(veilDir).multiplyScalar(0.12));
      veil.current.quaternion.copy(cam.quaternion);
      veilMat.opacity = b.veil;
      veil.current.visible = b.veil > 0.002;
    }

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
      <fog attach="fog" args={[haze, 7, 32]} />
      <hemisphereLight args={[mixHex(c.skyTop, '#ffffff', 0.4), mixHex(c.leaf, c.paper, 0.5), hemiI]} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(20).toArray()} intensity={sunI} color={c.sun} />
      <directionalLight position={[-5, 4, 10]} intensity={fillI} color={mixHex(c.skyLow, '#ffffff', 0.45)} />
      <primitive object={spotTarget} position={ENVELOPE_AT} />
      {/* A soft raking key from the upper left: the emboss on the envelope reads in its grazing light. */}
      <spotLight ref={key} position={[-2.2, 3.4, 6.6]} target={spotTarget} angle={0.9} penumbra={1} intensity={keyI} color="#FFF4EA" />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={1.0} color={mixHex(c.sun, '#ffffff', 0.5)} position={[0, 2.5, 10]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} color={mixHex(c.skyTop, '#ffffff', 0.3)} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[16, 16, 1]} />
        <Lightformer form="circle" intensity={3} color={c.sun} position={SUN_DIR.clone().multiplyScalar(12).toArray()} scale={3} />
        <Lightformer form="rect" intensity={0.35} color={mixHex(c.leaf, c.paper, 0.5)} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[16, 16, 1]} />
      </Environment>
      <mesh ref={veil} geometry={veilGeo} material={veilMat} renderOrder={1000} frustumCulled={false} visible={false} />

      <Suspense fallback={null}>
        {!envGone && (
          <group ref={envGroup} position={ENVELOPE_AT}>
            <GardenEnvelope size={env} colors={envColors} monogram={view.monogram} fontVar={fontVar} state={envelope} />
          </group>
        )}

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
          <LightRays intensity={rays} color={mixHex(c.sun, '#ffffff', 0.55)} count={tier === 'low' ? 3 : 5} length={9} spread={2.6} />
        </group>
        <Sparkles count={scaledCount(90, tier)} scale={[6, 4.5, 9]} position={[0, 2, 0.5]} size={2.2} speed={0.2} opacity={0.5} color={mixHex(c.sun, '#ffffff', 0.6)} noise={0.6} />
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
