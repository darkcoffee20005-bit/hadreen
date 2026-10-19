'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { BackSide, Color, Object3D, PlaneGeometry, ShaderMaterial, type DirectionalLight, type Group, type Mesh, type MeshStandardMaterial, type PointLight, type SpotLight } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { useTweak } from '@/lib/invite/lab/tweaks';
import { useInvite, useInviteStore } from '@/lib/invite/machine';
import { TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import type { SceneProps } from '@/lib/invite/scene-types';
import { Burst } from '@/lib/invite/stage/Burst';
import { CinematicCamera, useDirector } from '@/lib/invite/stage/CinematicCamera';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { NEUTRAL_GRADE, type GradeParams } from '@/lib/invite/stage/grade';
import { Grade } from '@/lib/invite/stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { ambientShot, CHANDELIER, CURTAIN_Z, GATE_Z, TRACK } from './camera';
import { CRYSTALS, FRONDS, LANTERNS, MIST, PALMS } from './layout';
import { Avenue, useAvenue } from './parts/Avenue';
import { Chandelier, useChandelier } from './parts/Chandelier';
import { Curtains, useCurtains } from './parts/Curtains';
import { DuskSky, useDuskSky } from './parts/DuskSky';
import { GateWorld, type GateState } from './parts/GateWorld';
import { Palace, usePalace } from './parts/Palace';
import { Passage } from './parts/Passage';
import { breathAt, CUT, flicker, INTRO, introState, lanternOn, smoothstep, swingAt } from './timeline';

type V3 = [number, number, number];
const SPOT_GATE: { pos: V3; aim: V3 } = { pos: [-2.4, 4.4, GATE_Z + 6.8], aim: [0.1, -0.1, GATE_Z] };
const SPOT_HALL: { pos: V3; aim: V3 } = { pos: [0, 11.8, 9.5], aim: [0, 4.4, CURTAIN_Z] };

/**
 * Blossom & Oud (ورد وعود): a blush envelope opens into a rose-satin evening.
 *  Gate  a blush envelope with a rounded flap edged in rose-gold foil, a pressed rose sprig and
 *        an oud-brown seal, on plum damask; a shimmer runs along the foil.
 *  S1    a bloom of light into a horseshoe arch where rose-satin curtains breathe, then part,
 *        their folds gathering to gold tiebacks;
 *  S2    a crystal chandelier in the vault, seen from below on a slow orbit;
 *  S3    through the arch, a palm avenue in pink mist, lanterns lighting in turn, to a palace
 *        gate with the couple's names in gold above it. Scrolling the content walks the avenue.
 * Every visual is a pure function of director.time (timeline.ts), so skip/seek/rewind are exact.
 */
export default function BlossomOudScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const sc = view.palette.scene;
  const pal = useMemo(() => {
    const satin = sc.satin ?? '#E7B9BC';
    const satinDeep = sc.satinDeep ?? '#B86A7A';
    const gold = sc.tieback ?? view.palette.gold;
    const oud = sc.oudWood ?? '#5A3A2E';
    const plum = sc.duskTop ?? '#3A2638';
    return {
      satin,
      satinDeep,
      gold,
      crystal: sc.crystal ?? '#FFF4EE',
      mist: sc.mist ?? '#F4C6CD',
      palm: sc.palm ?? '#46624F',
      palace: sc.palace ?? '#EBDCCB',
      duskTop: plum,
      duskLow: sc.duskLow ?? '#E6A9A6',
      oud,
      plum,
      lamp: '#FFCF94',
      roseGold: mix(gold, satinDeep, 0.38),
    };
  }, [sc, view.palette.gold]);
  const names = `${view.groom} ${view.lang === 'ar' ? 'و' : '&'} ${view.bride}`;
  const textReady = useTextsReady(2);

  const keyK = useTweak('dusk key', 1.5, { min: 0, max: 6, step: 0.05 });
  const spotK = useTweak('spot', 240, { min: 0, max: 1500, step: 5 });
  const chK = useTweak('chandelier light', 16, { min: 0, max: 200, step: 1 });
  const hemi = useTweak('hemisphere', 0.75, { min: 0, max: 3, step: 0.05 });
  const envK = useTweak('environment', 0.65, { min: 0, max: 3, step: 0.05 });
  const bloom = useTweak('bloom', 0.7, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.42, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.18,
    ambient: (scroll, t) => ambientShot(scroll, t, store.getState().capture != null),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.012, 0.0, 0.012],
      gamma: [1.0, 0.99, 0.99],
      gain: [1.02, 0.99, 0.98],
      saturation: 1.04,
      contrast: 1.03,
      shadowTint: [0.56, 0.44, 0.54],
      highlightTint: [0.6, 0.53, 0.48],
      splitAmount: 0.22,
      bloom,
      vignette,
      grain: 0.03,
    }),
    [bloom, vignette],
  );

  const gatePal = useMemo(
    () => ({
      paper: mix(pal.satin, '#fff6f2', 0.55),
      liner: mix(pal.satinDeep, pal.satin, 0.35),
      foil: mix(pal.gold, '#E9A99A', 0.45),
      seal: mix(pal.oud, '#7a4a38', 0.25),
      sealRelief: mix(pal.gold, '#f0d6a6', 0.2),
      plum: mix(pal.plum, pal.satinDeep, 0.28),
      plumDeep: shade(pal.plum, 0.55),
      rose: mix(pal.satin, pal.satinDeep, 0.35),
      roseDeep: shade(pal.satinDeep, 0.7),
      leaf: mix(pal.palm, '#8a9c78', 0.3),
    }),
    [pal],
  );
  const sky = useDuskSky(pal.duskTop, pal.duskLow, mix(pal.mist, pal.duskLow, 0.4), '#ffd2a8');
  const curtains = useCurtains(pal.satin, shade(pal.satinDeep, 0.75), pal.gold, low);
  const chandelier = useChandelier(CRYSTALS[tier], tier === 'high', low, pal.crystal, pal.gold, pal.lamp);
  const avenue = useAvenue(
    { palm: pal.palm, palace: pal.palace, satin: pal.satin, satinDeep: pal.satinDeep, mist: pal.mist, plum: pal.plum, oud: pal.oud, gold: pal.gold, lamp: pal.lamp },
    { palms: PALMS[tier], fronds: FRONDS[tier], lanterns: LANTERNS[tier], mist: MIST[tier] },
    low,
  );
  const palace = usePalace({ palace: pal.palace, satinDeep: pal.satinDeep, gold: pal.gold, plum: pal.plum, oud: pal.oud, lamp: pal.lamp }, low);
  const passagePal = useMemo(() => ({ palace: pal.palace, satinDeep: pal.satinDeep, gold: pal.gold, plum: pal.plum, palm: pal.palm, satin: pal.satin }), [pal]);

  const gate = useRef<GateState>({ seal: 0, flap: 0, slide: 0, glow: 0, shimmer: 0.4, sway: 0 });
  const gateGroup = useRef<Group>(null);
  const hall = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const spot = useRef<SpotLight>(null);
  const key = useRef<DirectionalLight>(null);
  const chLight = useRef<PointLight>(null);
  const namesMat = useRef<MeshStandardMaterial>(null);
  const flash = useRef<Mesh>(null);
  const spotTarget = useMemo(() => new Object3D(), []);
  // The bloom of light: a full-screen quad in clip space (no camera maths), warm at the centre.
  const flashMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uK: { value: 0 }, uCol: { value: new Color('#ffeadf') }, uHot: { value: new Color('#fffaf2') } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
        fragmentShader: `uniform float uK; uniform vec3 uCol, uHot; varying vec2 vUv;
          void main(){ float r = length((vUv - 0.5) * vec2(1.0, 1.6)); float a = clamp(uK * (1.25 - r * 0.6), 0.0, 1.0);
            gl_FragColor = vec4(mix(uCol, uHot, 1.0 - smoothstep(0.0, 0.6, r)), a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const flashGeo = useMemo(() => new PlaneGeometry(1, 1), []);
  useEffect(
    () => () => {
      flashMat.dispose();
      flashGeo.dispose();
    },
    [flashMat, flashGeo],
  );
  const away = useRef(0);
  const kickAt = useRef(-1);
  const lanternState = useRef({ t: 0, content: false, now: 0, flare: 0 });
  const lanternLight = useRef<(i: number) => number>((i) => {
    const s = lanternState.current;
    const l = avenue.lanterns[i]!;
    const n = Math.max(1, avenue.lanterns.length / 2);
    const on = s.content ? 1 : l.order < 0 ? smoothstep(CUT, CUT + 0.4, s.t) : lanternOn(l.order, n, s.t);
    return on * flicker(s.now, l.seed) * (1 + s.flare * 0.8);
  });

  // A guest's "we'll be there": the lanterns flare and the palace doors glow brighter.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.rsvp.id !== prev.rsvp.id && s.rsvp.attending) kickAt.current = performance.now() / 1000;
      }),
    [store],
  );

  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('waxCrack', { gain: 0.8 });
        haptics.crack();
      }, [], 0.02)
        .call(() => audio.sfx('paper', { gain: 0.9 }), [], 0.15)
        .call(() => audio.sfx('paper', { gain: 0.5, rate: 0.8 }), [], 0.6)
        .call(() => audio.sfx('whoosh', { gain: 0.35, rate: 0.7 }), [], 0.85)
        .call(() => audio.sfx('cloth', { gain: 0.45, rate: 0.9 }), [], 1.3)
        .call(() => audio.sfx('cloth', { gain: 0.8, rate: 0.75 }), [], 1.65)
        .call(() => audio.sfx('cloth', { gain: 0.5, rate: 0.65 }), [], 2.5)
        .call(() => audio.sfx('chimes', { gain: 0.5, rate: 1.4 }), [], 2.7)
        .call(() => audio.sfx('chimes', { gain: 0.3, rate: 1.8 }), [], 3.9)
        .call(() => audio.sfx('chimes', { gain: 0.25, rate: 2.1 }), [], 4.5)
        .call(() => audio.sfx('chimes', { gain: 0.2, rate: 1.6 }), [], 5.1)
        .call(() => audio.sfx('whoosh', { gain: 0.4, rate: 0.6 }), [], 5.55)
        .call(() => {
          audio.sfx('chimes', { gain: 0.55, rate: 0.7 });
          haptics.success();
        }, [], 7.6)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture, scroll, progress } = store.getState();
    const content = phase === 'handoff' || phase === 'content';
    const gating = phase === 'boot' || phase === 'loading' || phase === 'gate';
    // At the gate the camera holds the first shot whatever the timeline's position (it may have
    // been seeked for warm-up), so the scene does too; after the hand-off it holds the last beat.
    const t = gating ? 0 : content ? INTRO : director.time;
    const s = introState(t);
    const clock = state.clock.elapsedTime;
    const now = capture ? 3 + t : clock;
    away.current = capture ? (content ? 1 : 0) : away.current + ((content ? 1 : 0) - away.current) * Math.min(1, delta * 1.5);
    const since = kickAt.current >= 0 && !capture ? performance.now() / 1000 - kickAt.current : Infinity;
    const flare = Number.isFinite(since) ? Math.exp(-since * 0.9) : 0;
    const warmed = progress.shaders >= 1;
    const inGate = s.gate && !content;

    // Worlds: everything stays visible until the shaders are compiled, then only what's on screen.
    if (gateGroup.current) gateGroup.current.visible = inGate || !warmed;
    if (hall.current) hall.current.visible = !inGate || !warmed;

    // Gate.
    const g = gate.current;
    g.seal = s.seal;
    g.flap = s.flap;
    g.slide = s.slide;
    g.glow = s.glow;
    g.shimmer = capture ? 0.42 : gating ? (clock * 0.28) % 1.6 : 0.42 + t;
    g.sway = gating && !capture ? Math.sin(clock * 0.7) * 0.012 : 0;

    // Bloom of light (and the cut inside it).
    if (flash.current) {
      flash.current.visible = s.flash > 0.002 && !content;
      flashMat.uniforms.uK!.value = s.flash;
    }

    // Curtains.
    const cu = curtains.uniforms;
    cu.uOpen.value = s.open;
    cu.uBreath.value = capture ? 0 : breathAt(s.open);
    cu.uTime.value = now;

    // Chandelier: a slow pendulum, its candles and crystals.
    const [sz, sx] = swingAt(now, capture ? 0 : 1);
    if (pivot.current) pivot.current.rotation.set(sx, 0, sz);
    if (chandelier.sprites) {
      const vh = state.gl.domElement.height;
      chandelier.sprites.sparkle.uniforms.uTime!.value = now;
      chandelier.sprites.sparkle.uniforms.uViewH!.value = vh;
      chandelier.sprites.sparkle.uniforms.uK!.value = 0.5 + 0.8 * s.chandelier;
      chandelier.sprites.halo.uniforms.uTime!.value = now;
      chandelier.sprites.halo.uniforms.uViewH!.value = vh;
      chandelier.sprites.halo.uniforms.uK!.value = 0.6 + 0.4 * s.chandelier;
    }
    if (chLight.current) chLight.current.intensity = chK * s.chandelier * (0.92 + 0.08 * flicker(now, 3));

    // Sky and avenue.
    sky.uniforms.uTime!.value = now;
    avenue.wind.uTime.value = now;
    avenue.wind.uWind.value = capture ? 0 : 1;
    if (avenue.mats.halo) {
      avenue.mats.halo.uniforms.uTime!.value = now;
      avenue.mats.halo.uniforms.uViewH!.value = state.gl.domElement.height;
    }
    avenue.mats.mist.forEach((m) => {
      m.uniforms.uTime!.value = now;
    });
    lanternState.current = { t, content, now, flare };
    palace.mats.door.uniforms.uK!.value = 0.55 + 0.45 * smoothstep(5.6, 7.6, t) + flare * 0.8;
    palace.mats.windows.uniforms.uK!.value = 0.4 + 0.6 * smoothstep(6.0, 8.0, t) + flare * 0.5;

    // The names over the gate: for the opening's last beat, and again on arriving at the gate.
    if (namesMat.current) namesMat.current.opacity = Math.max(s.names * (1 - away.current), away.current * smoothstep(0.78, 0.96, scroll));

    // Light: the spot moves from the envelope to the curtains at the cut, then fades in the avenue.
    const sp = s.gate ? SPOT_GATE : SPOT_HALL;
    spotTarget.position.set(...sp.aim);
    spotTarget.updateMatrixWorld();
    if (spot.current) {
      spot.current.position.set(...sp.pos);
      spot.current.intensity = (s.gate ? spotK * 0.32 : spotK) * (1 - smoothstep(4.6, 6.0, t)) * (1 - away.current);
      spot.current.angle = s.gate ? 0.42 : 0.5;
    }
    if (key.current) {
      key.current.intensity = keyK * (s.gate ? 0.45 : 1);
      key.current.color.set(s.gate ? '#ffe6dc' : '#ffc6a8');
    }
    if (spot.current) spot.current.color.set(s.gate ? '#fff6f2' : '#fff0e6');
   }, -1);

  return (
    <>
      <DuskSky material={sky} />
      <fog attach="fog" args={[mix(pal.duskLow, pal.mist, 0.35), 24, 175]} />
      <hemisphereLight args={[mix(pal.duskLow, '#ffffff', 0.25), shade(pal.plum, 0.9), hemi]} />
      <directionalLight ref={key} position={[9, 7.5, 24]} intensity={keyK} color="#ffc6a8" />
      <primitive object={spotTarget} />
      <spotLight ref={spot} position={SPOT_HALL.pos} target={spotTarget} angle={0.5} penumbra={0.75} decay={2} intensity={spotK} color="#fff0e6" />
      <pointLight ref={chLight} position={[CHANDELIER[0], CHANDELIER[1] + 0.1, CHANDELIER[2]]} color="#ffe2cc" intensity={chK} decay={2} distance={16} />
      <Environment resolution={settings.envResolution} frames={1} environmentIntensity={envK}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={shade(mix(pal.plum, pal.duskLow, 0.45), 0.8)} side={BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={3.2} color="#fff2e6" position={[0, 8, 2]} rotation-x={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={3} color={pal.lamp} position={[3, 2, 6]} scale={1.4} />
        <Lightformer form="ring" intensity={2.4} color="#ffffff" position={[-4, 3, 5]} scale={0.8} />
        <Lightformer form="rect" intensity={1.4} color={pal.duskLow} position={[0, 1, -12]} scale={[16, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} color={pal.satin} position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <group ref={gateGroup}>
          <GateWorld pal={gatePal} state={gate} monogram={view.monogram} lang={view.lang} onReady={textReady} />
        </group>
        <group ref={hall}>
          <Passage pal={passagePal} low={low} />
          <Curtains c={curtains} />
          <Chandelier c={chandelier} pivot={pivot} />
          <Avenue a={avenue} lanternLight={lanternLight} />
          <Palace p={palace} names={names} lang={view.lang} gold={pal.gold} namesMat={namesMat} onReady={textReady} />
        </group>
        <mesh ref={flash} geometry={flashGeo} material={flashMat} renderOrder={1000} frustumCulled={false} visible={false} />
        <Burst color={mix(pal.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}
