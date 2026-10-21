'use client';

import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
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
import { buildSwan } from './geometry';
import { ambientShot, BASMALA, buildTrack, ENVELOPE_AT, envelopeSize, FLOOR_Y, SUN, swanPlacement, VEIL } from './layout';
import { ENVELOPE_REST, GardenEnvelope, type EnvelopeAnim } from './parts/Envelope';
import { clipAtWater, detailFor, SwanPair, type SwimState } from './parts/Garden';
import { Petals } from './parts/Petals';
import { Pond, SkyDome } from './parts/Pond';
import { Terrace, useTerraceAssets } from './parts/Terrace';
import { useVistaAssets, Vista } from './parts/Vista';
import { skyUniforms, waterUniforms } from './shaders';

/**
 * الحديقة المقدّسة — a sunset terrace over a lake.
 * Gate: an ivory envelope filling the screen, four flaps folded to a diamond under an antique
 * gold seal (a laurel wreath round the monogram), blind-embossed flowering sprays in a raking light.
 * Opening (8 s): the seal warms and cracks in a burst of gold, the flaps peel open one after
 * another, light pours out and whites out the frame; it clears outside a loggia, and the camera
 * glides in through a cusped arch wrapped in roses, sheer curtains stirring, lanterns lit, onto a
 * marble terrace over a lake at sunset: mountains, a village with its first lights, and two swans
 * gliding together into a heart. The basmala and the names fade up in gold over the sky.
 * Content: the same view; scrolling tilts up into the sunset sky.
 */
const SUN_DIR = new Vector3(...SUN.dir).normalize();

interface Beats {
  veil: number;
  glow: number;
  basmala: number;
  names: number;
  shimmer: number;
  lights: number;
  lamps: number;
}

export default function SacredGardenScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const p = view.palette;
  const sc = p.scene;
  const c = useMemo(
    () => ({
      paper: sc.paper ?? '#F6EFE5',
      blush: sc.blush ?? '#EED3CB',
      seal: sc.seal ?? '#B4853A',
      sealRelief: sc.sealRelief ?? '#F6E2AA',
      sealFinish: sc.sealFinish ?? 'gold',
      stone: sc.stone ?? '#F0E6D7',
      marble: sc.marble ?? '#F2E9DD',
      rose: sc.rose ?? '#E8B1AC',
      leaf: sc.leaf ?? '#8DA37C',
      pond: sc.pond ?? '#C9BFCF',
      sun: sc.sun ?? '#FFD9A0',
      skyTop: sc.skyTop ?? '#B7C2DE',
      skyMid: sc.skyMid ?? '#F2C4C3',
      skyLow: sc.skyLow ?? '#FBD8AA',
      mtnNear: sc.mtnNear ?? '#A898AE',
      mtnMid: sc.mtnMid ?? '#C2AFC0',
      mtnFar: sc.mtnFar ?? '#D8C5CC',
      village: sc.village ?? '#EED0BA',
      roof: sc.roof ?? '#CC957F',
      tree: sc.tree ?? '#7F8E80',
      gold: p.gold,
      goldInk: p.goldInk,
    }),
    [sc, p.gold, p.goldInk],
  );

  const keyLightI = useTweak('key', 1.25, { min: 0, max: 8, step: 0.05 });
  const rimI = useTweak('sun rim', 1.5, { min: 0, max: 8, step: 0.05 });
  const hemiI = useTweak('hemisphere', 0.55, { min: 0, max: 3, step: 0.05 });
  const keyI = useTweak('envelope key', 26, { min: 0, max: 200, step: 1 });
  const bloom = useTweak('bloom', 0.3, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.3, { min: 0, max: 1, step: 0.01 });

  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    // The mountains and the sky sit far out.
    camera.near = 0.08;
    camera.far = 900;
    camera.updateProjectionMatrix();
  }, [camera]);

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.85;
  const env = useMemo(() => envelopeSize(portrait ? 0.5 : 1.6), [portrait]);
  const envColors = useMemo(
    () => ({ paper: c.paper, blush: c.blush, gold: c.gold, seal: c.seal, sealRelief: c.sealRelief, sealFinish: c.sealFinish }),
    [c.paper, c.blush, c.gold, c.seal, c.sealRelief, c.sealFinish],
  );

  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const director = useDirector({
    track: buildTrack(envelopeSize(1.6)),
    parallax: 0.32,
    ambient: (scroll, t) => ambientShot(scroll, store.getState().capture ? 0 : t * 0.08, portraitRef.current),
  });
  useLayoutEffect(() => {
    director.track = buildTrack(env);
  }, [director, env]);

  const envelope = useRef<EnvelopeAnim>({ ...ENVELOPE_REST });
  const swim = useRef<SwimState>({ swim: 0 });
  const beats = useRef<Beats>({ veil: 0, glow: 0, basmala: 0, names: 0, shimmer: 0, lights: 0, lamps: 0 });
  const lightsOn = useRef(0);
  const lampGlow = useRef(0);
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
  const veilMat = useMemo(() => new MeshBasicMaterial({ color: '#FFF4E4', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }), []);
  useEffect(
    () => () => {
      veilGeo.dispose();
      veilMat.dispose();
    },
    [veilGeo, veilMat],
  );
  const textReady = useTextsReady(4);

  const terrace = useTerraceAssets(c, tier);
  const vistaColors = useMemo(
    () => ({ haze: mixHex(c.skyLow, c.skyMid, 0.35), near: c.mtnNear, mid: c.mtnMid, far: c.mtnFar, wall: c.village, roof: c.roof, tree: c.tree }),
    [c.skyLow, c.skyMid, c.mtnNear, c.mtnMid, c.mtnFar, c.village, c.roof, c.tree],
  );
  const vista = useVistaAssets(vistaColors, tier);
  const swans = useMemo(() => {
    const rich = tier !== 'low';
    const make = (keep: 'above' | 'below') =>
      clipAtWater(
        rich
          ? new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.6, sheenColor: '#fff1e2', sheenRoughness: 0.45, side: DoubleSide })
          : new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: DoubleSide }),
        keep,
      );
    return { geometry: buildSwan(detailFor(tier)), material: make('above'), mirror: make('below') };
  }, [tier]);
  useEffect(
    () => () => {
      swans.geometry.dispose();
      swans.material.dispose();
      swans.mirror.dispose();
    },
    [swans],
  );

  const sky = useMemo(() => skyUniforms({ zenith: c.skyTop, mid: c.skyMid, horizon: c.skyLow, sun: c.sun }, SUN_DIR), [c.skyTop, c.skyMid, c.skyLow, c.sun]);
  const water = useMemo(() => waterUniforms(sky, mixHex(c.pond, c.skyMid, 0.3)), [sky, c.pond, c.skyMid]);
  const spotTarget = useMemo(() => new Object3D(), []);
  const petalColors = useMemo(() => [mixHex(c.rose, '#ffffff', 0.55), mixHex(c.rose, '#ffffff', 0.3), c.rose, '#FBF3EA', '#F6E7DA'], [c.rose]);

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0, -0.004, -0.002],
      gamma: [0.98, 0.98, 0.97],
      gain: [1.0, 0.98, 0.95],
      saturation: 1.1,
      contrast: 1.1,
      shadowTint: toRgb(mixHex(c.mtnNear, c.rose, 0.4), 0.45),
      highlightTint: toRgb(c.sun, 0.6),
      splitAmount: 0.2,
      bloom,
      vignette,
      grain: 0.025,
    }),
    [c.mtnNear, c.rose, c.sun, bloom, vignette],
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
            // A puff of gold dust as the seal gives.
            if (!store.getState().capture) store.getState().fireBurst(0.5, 0.5);
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
        .to(b, { lamps: 1, duration: 1.6, ease: 'sine.out' }, 3.4)
        .to(b, { lights: 1, duration: 2.4, ease: 'sine.inOut' }, 4.2)
        .call(() => audio.sfx('water', { gain: 0.45 }), [], 3.8)
        .to(swim.current, { swim: 1, duration: 3.0, ease: 'none' }, 3.4)
        .call(() => audio.sfx('water', { gain: 0.35, rate: 0.9 }), [], 5.0)
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
    // The card on wide screens sits nearer the key: soften it so the emboss stays a whisper.
    if (key.current) key.current.intensity = keyI * (portraitRef.current ? 1 : 0.5) * (1 - envelope.current.fade);
    if (veil.current) {
      const cam = state.camera;
      veil.current.position.copy(cam.position).add(cam.getWorldDirection(veilDir).multiplyScalar(0.12));
      veil.current.quaternion.copy(cam.quaternion);
      veilMat.opacity = b.veil;
      veil.current.visible = b.veil > 0.002;
    }
    lightsOn.current = b.lights;
    lampGlow.current = b.lamps;

    const target = phase === 'handoff' || phase === 'content' ? 1 : 0;
    away.current = capture ? target : away.current + (target - away.current) * Math.min(1, delta * 1.3);
    const keep = 1 - away.current;
    const low = tier === 'low';
    if (basmalaMat.current) {
      basmalaMat.current.opacity = b.basmala * keep;
      basmalaMat.current.visible = b.basmala * keep > 0.002;
      basmalaMat.current.emissiveIntensity = (low ? 0.75 : 0.55) + 0.4 * (1 - b.basmala);
    }
    const shimmer = Math.sin(Math.PI * b.shimmer);
    nameMats.forEach((m) => {
      if (!m.current) return;
      m.current.opacity = b.names * keep;
      m.current.visible = b.names * keep > 0.002;
      m.current.emissiveIntensity = (low ? 0.8 : 0.6) + shimmer * 0.9;
    });
    if (namesGroup.current) namesGroup.current.position.y = (1 - b.names) * -0.08 + away.current * 0.3;

    // Lake: time, the sun's glitter path and the swans' wakes.
    water.uTime.value = capture ? 4 : t;
    water.uSunStrength.value = 0.25 + 0.75 * b.glow;
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
  const NZ = 0.6;

  return (
    <>
      <SkyDome uniforms={sky} />
      <hemisphereLight args={[mixHex(c.skyTop, '#ffffff', 0.45), mixHex(c.marble, c.rose, 0.3), hemiI]} />
      {/* A warm key from over the guest's shoulder lights the terrace; the sun rims it from beyond the lake. */}
      <directionalLight position={[-6, 12, 16]} intensity={keyLightI} color="#FFE7D0" />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(40).toArray()} intensity={rimI} color={c.sun} />
      <primitive object={spotTarget} position={ENVELOPE_AT} />
      {/* A soft raking key from the upper left: the emboss on the envelope reads in its grazing light. */}
      <spotLight ref={key} position={[ENVELOPE_AT[0] - 2.2, ENVELOPE_AT[1] + 2.2, ENVELOPE_AT[2] + 3.2]} target={spotTarget} angle={0.9} penumbra={1} intensity={keyI} color="#FFF4EA" />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={0.55} color={mixHex(c.sun, '#ffffff', 0.4)} position={[0, 3, 12]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={0.4} color={mixHex(c.skyTop, c.skyMid, 0.5)} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="circle" intensity={3} color={c.sun} position={SUN_DIR.clone().multiplyScalar(14).toArray()} scale={4} />
        <Lightformer form="rect" intensity={0.6} color={c.skyMid} position={[0, 1, -14]} scale={[30, 4, 1]} />
        <Lightformer form="rect" intensity={0.15} color={mixHex(c.marble, c.rose, 0.4)} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[16, 16, 1]} />
      </Environment>
      <mesh ref={veil} geometry={veilGeo} material={veilMat} renderOrder={1000} frustumCulled={false} visible={false} />

      <Suspense fallback={null}>
        {!envGone && (
          <group ref={envGroup} position={ENVELOPE_AT}>
            <GardenEnvelope size={env} colors={envColors} monogram={view.monogram} fontVar={fontVar} state={envelope} relief={portrait ? 0.9 : 0.16} />
          </group>
        )}

        <Vista assets={vista} lights={lightsOn} />
        <SwanPair geometry={swans.geometry} material={swans.material} state={swim} />
        {realReflection === 0 && (
          <group scale={[1, -1, 1]}>
            <Vista assets={vista} lights={lightsOn} mirrored />
            <SwanPair geometry={swans.geometry} material={swans.mirror} state={swim} mirrored />
          </group>
        )}
        <Pond uniforms={water} reflection={realReflection} />
        <Terrace assets={terrace} colors={c} tier={tier} glow={lampGlow} />
        <Petals air={scaledCount(110, tier)} floating={scaledCount(150, tier)} colors={petalColors} />

        <GoldText text={BASMALA} lang="ar" role="serif" height={0.56} position={[0, FLOOR_Y + 6.6, NZ]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.32} opacity={0} materialRef={basmalaMat} onReady={textReady} />
        <group ref={namesGroup}>
          <GoldText text={view.groom} lang={view.lang} height={1.0} position={[0, FLOOR_Y + 5.75, NZ]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.36} opacity={0} materialRef={nameMats[0]} onReady={textReady} />
          <GoldText text={ar ? 'و' : '&'} lang={view.lang} role="serif" height={0.4} position={[0, FLOOR_Y + 5.0, NZ]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.36} opacity={0} materialRef={nameMats[1]} onReady={textReady} />
          <GoldText text={view.bride} lang={view.lang} height={1.0} position={[0, FLOOR_Y + 4.3, NZ]} color={c.gold} emissive={c.goldInk} emissiveIntensity={0.36} opacity={0} materialRef={nameMats[2]} onReady={textReady} />
        </group>

        {tier !== 'low' && (
          <Sparkles count={scaledCount(70, tier)} scale={[5.5, 3.5, 5]} position={[0, FLOOR_Y + 2, 1.5]} size={3.2} speed={0.25} opacity={0.7} color={mixHex(c.sun, '#FFB766', 0.4)} noise={0.8} />
        )}
        <Burst color={mixHex(c.gold, '#FFE7A8', 0.45)} />
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
