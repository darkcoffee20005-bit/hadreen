'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, Color, type HemisphereLight, NormalBlending, Object3D, ShaderMaterial, type SpotLight } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { inviteDict } from '@/lib/i18n';
import { haptics } from '@/lib/invite/interaction/haptics';
import { useTweak } from '@/lib/invite/lab/tweaks';
import { useInvite, useInviteStore } from '@/lib/invite/machine';
import { TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import type { SceneProps } from '@/lib/invite/scene-types';
import { CinematicCamera, useDirector } from '@/lib/invite/stage/CinematicCamera';
import { NEUTRAL_GRADE, type GradeParams } from '@/lib/invite/stage/grade';
import { Grade } from '@/lib/invite/stage/Grade';
import { AssetsReady, ShaderWarmup, useTextsReady } from '@/lib/invite/stage/Readiness';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { ambientShot, g, TRACK } from './camera';
import { HALL_NAME } from './meta';
import { Card, useCardMaps } from './parts/Card';
import { Facade } from './parts/Facade';
import { Hall } from './parts/Hall';
import { INTRO, introState } from './timeline';

/** A full-screen paper-coloured veil (clip-space triangle) drawn over everything but the drawing. */
function useVeil(color: string) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: NormalBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new Color(color) }, uK: { value: 0 } },
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uK; void main(){ gl_FragColor = vec4(uColor, uK); }',
      }),
    [color],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return { geometry, material };
}

/**
 * White House Hall (البيت الأبيض), exclusive to قاعة البيت الأبيض, Mosul. Off-white and black.
 *  S1  an off-white letterpress card on deep black: the hall's façade in fine line, the names,
 *      the date, a black wax seal. The seal lifts; the camera leans into the drawing while the
 *      paper whitens around it, and under that veil we cut to the same drawing over
 *  S2  the real façade at blue hour: the veil clears, the ink lines warm into light and dissolve
 *      into the stone as uplights climb the fluted columns; the black doors swing in on warm light;
 *  S3  up the steps and into the white hall: diagonal black-and-white marble, drapes, and rows of
 *      crystal chandeliers that sparkle as the walk reaches them.
 * Every visual is a pure function of director.time (timeline.ts), so skip/seek/rewind are exact.
 */
export default function WhiteHouseHallScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const sc = view.palette.scene;
  const pal = useMemo(
    () => ({
      paper: sc.paper ?? '#F4F1EA',
      ink: sc.ink ?? '#141414',
      stone: sc.stone ?? '#ECE7DC',
      night: sc.night ?? '#0A1020',
      dusk: sc.dusk ?? '#2B3752',
      warm: sc.warm ?? '#FFE3BC',
      marble: sc.marble ?? '#F2EFE8',
      marbleDark: sc.marbleDark ?? '#1B1B1B',
    }),
    [sc],
  );
  const t = inviteDict(view.lang);
  const textReady = useTextsReady(1);
  const isAr = view.lang === 'ar';

  const bloom = useTweak('bloom', 0.85, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.32, { min: 0, max: 1, step: 0.01 });
  const keyIntensity = useTweak('card key', 32, { min: 0, max: 300, step: 1 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.14,
    ambient: (scroll, seconds) => ambientShot(scroll, seconds, store.getState().capture != null),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.004, 0.004, 0.008],
      gamma: [1.0, 1.0, 1.0],
      gain: [1.0, 0.995, 0.98],
      saturation: 0.9,
      contrast: 1.06,
      shadowTint: [0.38, 0.42, 0.55],
      highlightTint: [0.58, 0.54, 0.48],
      splitAmount: 0.16,
      bloom,
      vignette,
      grain: 0.035,
    }),
    [bloom, vignette],
  );

  // The card's textures (fonts in) — the drawing texture is shared with the façade.
  const k = low ? 200 : tier === 'medium' ? 260 : 330;
  const maps = useCardMaps(
    {
      greeting: view.guestName ? t.greetingGuest(view.guestName) : t.greetingGeneric,
      lead: t.invitationLead,
      names: `${view.groom} ${t.and} ${view.bride}`,
      date: view.dateLine,
      displayVar: isAr ? '--font-aref' : '--font-pinyon',
      serifVar: isAr ? '--font-amiri' : '--font-cormorant',
    },
    k,
    low ? 900 : tier === 'medium' ? 1200 : 1600,
    pal.paper,
    pal.ink,
    HALL_NAME,
    textReady,
  );

  const veil = useVeil(pal.paper);
  const hemi = useRef<HemisphereLight>(null);
  const cardKey = useRef<SpotLight>(null);
  const cardTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(...g(0, 0, 0));
    return o;
  }, []);

  useOpening(director);

  useFrame(() => {
    const s = introState(director.time);
    veil.material.uniforms.uK!.value = s.veil;
    if (hemi.current) hemi.current.intensity = s.gate ? 0.35 : 0.62;
    if (cardKey.current) cardKey.current.intensity = s.gate ? keyIntensity : 0;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#93a6d2', '#3b352e', 1.15]} />
      <directionalLight position={[-9, 14, 24]} intensity={0.45} color="#c3cde8" />
      <primitive object={cardTarget} />
      <spotLight ref={cardKey} position={g(-2.6, 3.4, 5.5)} target={cardTarget} angle={0.55} penumbra={0.9} decay={1.6} intensity={keyIntensity} color="#fff8ec" />
      <pointLight position={g(2.5, -1.5, 3.5)} intensity={3} color="#e9edf6" distance={12} decay={1.6} />
      <Environment resolution={settings.envResolution} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color="#2b2a29" side={BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={3} color="#fff4e4" position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#fff1dc" position={[3, 4, 4]} scale={2} />
        <Lightformer form="ring" intensity={2.2} color="#fff1dc" position={[-3, 4, -4]} scale={2} />
        <Lightformer form="rect" intensity={0.9} color="#c9d3ea" position={[-8, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <Card maps={maps} monogram={view.monogram} fontVar={isAr ? '--font-aref' : '--font-pinyon'} director={director} ink={pal.ink} paper={pal.paper} />
        <Facade
          palette={pal}
          director={director}
          drawing={maps?.drawing ?? null}
          hall={HALL_NAME}
          spots={low ? 0 : tier === 'medium' ? 4 : 5}
          lampLights={tier === 'high'}
          detail={low ? 0.6 : 1}
          fontVar="--font-amiri"
        />
        <Hall director={director} crystalScale={low ? 0.35 : tier === 'medium' ? 0.55 : 1} lights={low ? 1 : tier === 'medium' ? 2 : 3} marble={{ light: pal.marble, dark: pal.marbleDark }} />
        <AssetsReady />
      </Suspense>

      <mesh geometry={veil.geometry} material={veil.material} frustumCulled={false} renderOrder={900} />
      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}

/** The opening's GSAP timeline: tweens director.time and plays the foley. */
function useOpening(director: { time: number }) {
  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('waxCrack', { gain: 0.7, rate: 0.85 });
        haptics.crack();
      }, [], 0.05)
        .call(() => audio.sfx('paper', { gain: 0.35, rate: 0.9 }), [], 0.6)
        .call(() => audio.sfx('whoosh', { gain: 0.5, rate: 0.55 }), [], 1.5)
        .call(() => audio.sfx('chimes', { gain: 0.35, rate: 0.8 }), [], 3.0)
        .call(() => audio.sfx('cloth', { gain: 0.35, rate: 0.7 }), [], 4.15)
        .call(() => haptics.tap(), [], 4.2)
        .call(() => audio.sfx('chimes', { gain: 0.55, rate: 1.15 }), [], 5.6)
        .call(() => {
          audio.sfx('chimes', { gain: 0.4, rate: 1.35 });
          haptics.success();
        }, [], 7.3)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );
}
