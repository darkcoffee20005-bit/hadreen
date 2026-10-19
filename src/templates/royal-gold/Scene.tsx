'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, CanvasTexture, Color, MeshBasicMaterial, Object3D, PlaneGeometry, type SpotLight } from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { Sky } from '@/lib/invite/kit/Sky';
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
import { canvas } from '@/lib/invite/stage/textures';
import { useIntro } from '@/lib/invite/stage/useIntro';
import { pointedArch } from './geometry';
import { sweepUniforms } from './materials';
import { ArchHall } from './parts/ArchHall';
import { useBlossoms } from './parts/Blossoms';
import { Couple } from './parts/Couple';
import { useFlash, useMotes, useShafts, type Shaft } from './parts/effects';
import { Garden } from './parts/Garden';
import { Lantern } from './parts/Lantern';
import { Pochette } from './parts/Pochette';
import { flapEmboss, piercedTexture, starGobo, WALL } from './textures';
import { ambientShot, G, g, TRACK } from './camera';
import { INTRO, introState } from './timeline';

/** Soft pool of sunlight on the courtyard floor, in the shape of the arch, stretched toward us. */
function archPoolTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 512);
  ctx.filter = 'blur(10px)';
  const pts = pointedArch(WALL.archWidth, WALL.spring, WALL.apex, 24);
  const grad = ctx.createLinearGradient(0, 512, 0, 0);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, '#555');
  ctx.fillStyle = grad;
  ctx.beginPath();
  pts.forEach(([x, y]) => ctx.lineTo(128 + (x / 5.2) * 256, 512 - (y / 7) * 512));
  ctx.closePath();
  ctx.fill();
  const t = new CanvasTexture(c);
  return t;
}

/**
 * Royal Gold (الذهب الملكي): ivory and gold majesty.
 *  S1  an ivory four-flap pochette on emerald velvet, its seal edged in gold leaf;
 *      the seal bursts, the flaps unfold 0.15 s apart, golden light floods out (rays, emissive
 *      spike, white-gold exposure) and, inside the white, we cut to
 *  S2  a pointed arch in a carved-and-gilded ivory wall (zellige alfiz and dado, ablaq voussoirs)
 *      with swinging brass lanterns throwing star light (gobo spots on medium/high), blossoms;
 *  S3  a dolly back onto an 85 mm lens: the pale-gold mosque looms in the haze through the arch
 *      while the couple walks toward it; the names settle in gold on the frieze.
 * Every visual is a pure function of director.time (see timeline.ts), so skip/seek/rewind are exact.
 */
export default function RoyalGoldScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const sc = view.palette.scene;
  const pal = useMemo(
    () => ({
      ivory: sc.ivory ?? '#F8F3E8',
      ivoryWarm: sc.ivoryWarm ?? '#EFE3CC',
      gold: sc.gold ?? view.palette.gold,
      goldDeep: sc.goldDeep ?? '#9F7B3C',
      goldPale: sc.goldPale ?? '#E8D6A6',
      brass: sc.brass ?? '#B38B4D',
      blossom: sc.blossom ?? '#FFFDF7',
      skyTop: sc.skyTop ?? '#F3E3BC',
      skyLow: sc.skyLow ?? '#FBF4E2',
      emerald: sc.emerald ?? view.palette.accent,
    }),
    [sc, view.palette.gold, view.palette.accent],
  );
  const haze = useMemo(() => mix(pal.skyLow, pal.skyTop, 0.35), [pal]);
  const textReady = useTextsReady(1);
  const clock = useThree((s) => s.clock);

  const keyIntensity = useTweak('pochette key', 24, { min: 0, max: 500, step: 1 });
  const hemi = useTweak('hemisphere', 0.9, { min: 0, max: 4, step: 0.05 });
  const fill = useTweak('fill light', 0.95, { min: 0, max: 5, step: 0.05 });
  const back = useTweak('sun (back)', 2.2, { min: 0, max: 8, step: 0.05 });
  const goboIntensity = useTweak('lantern gobo', 5.5, { min: 0, max: 60, step: 0.5 });
  const bloom = useTweak('bloom', 0.7, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.3, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.18,
    ambient: (scroll, t) => ambientShot(scroll, t, store.getState().capture != null),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.012, 0.008, 0.0],
      gamma: [1.0, 0.99, 0.96],
      gain: [1.02, 1.0, 0.95],
      saturation: 0.97,
      contrast: 1.04,
      shadowTint: [0.44, 0.5, 0.46],
      highlightTint: [0.6, 0.55, 0.45],
      splitAmount: 0.22,
      bloom,
      vignette,
      grain: 0.03,
    }),
    [bloom, vignette],
  );

  const sweep = useMemo(() => sweepUniforms(mix(pal.goldPale, '#ffffff', 0.4)), [pal.goldPale]);
  const maps = useMemo(() => {
    if (typeof document === 'undefined') return { emboss: null, pierced: null, gobo: null, pool: null };
    return { emboss: flapEmboss(), pierced: piercedTexture(), // An accent light over the ambient/key light, so its dark parts can go low without black holes.
      gobo: starGobo(512, 0.2), pool: archPoolTexture() };
  }, []);
  useEffect(() => () => Object.values(maps).forEach((m) => m?.dispose()), [maps]);

  const gateKey = useRef<SpotLight>(null);
  const gateTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(...G);
    return o;
  }, []);
  const away = useRef(0);
  const kickAt = useRef(-1);

  // A guest's "we'll be there" sends a gust through the hall: the lanterns swing again.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.rsvp.id !== prev.rsvp.id && s.rsvp.attending) kickAt.current = clock.elapsedTime;
      }),
    [store, clock],
  );

  const shafts = useMemo<Shaft[]>(() => {
    const all: Shaft[] = [
      { from: [0.1, 6.4, -5], to: [0.5, 0, 7.5], width: 1.5 },
      { from: [-1.3, 5.6, -5], to: [-2.6, 0, 6], width: 0.9 },
      { from: [1.4, 5.8, -5], to: [2.9, 0, 6.5], width: 0.95 },
      { from: [-0.6, 6.2, -5], to: [-1.0, 0, 8.5], width: 0.6 },
      { from: [0.8, 6.0, -5], to: [1.5, 0, 9], width: 0.55 },
      { from: [-1.8, 4.6, -5], to: [-3.4, 0, 4], width: 0.5 },
    ];
    return low ? all.slice(0, 3) : all;
  }, [low]);
  const shaftMesh = useShafts(mix(pal.goldPale, '#fff2d0', 0.5), shafts);
  const motes = useMotes(mix(pal.goldPale, '#ffffff', 0.3), scaledCount(180, tier), { min: [-3.2, 0.2, -4], size: [6.4, 7, 12] }, 34);
  const gateMotes = useMotes(mix(pal.gold, '#ffffff', 0.35), scaledCount(70, tier), { min: g(-3.2, -2.6, 0.2), size: [6.4, 5.2, 2.6] }, 22);
  const blossoms = useBlossoms(scaledCount(200, tier), pal.blossom, mix(pal.goldPale, pal.gold, 0.4), { min: [-7, 0, -1.5], size: [14, 10, 11.5] });
  const flash = useFlash(mix('#fff7e6', pal.goldPale, 0.35));
  const pool = useMemo(
    () => ({
      geometry: new PlaneGeometry(5.2, 10),
      material: new MeshBasicMaterial({ color: new Color(mix(pal.goldPale, '#fff1d0', 0.4)), alphaMap: maps.pool, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.3 }),
    }),
    [pal.goldPale, maps.pool],
  );
  useEffect(
    () => () => {
      pool.geometry.dispose();
      pool.material.dispose();
    },
    [pool],
  );

  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('waxCrack');
        haptics.crack();
      }, [], 0.02)
        .call(() => audio.sfx('chimes', { gain: 0.35, rate: 1.6 }), [], 0.1)
        .call(() => audio.sfx('paper', { gain: 0.55, rate: 1.15 }), [], 0.44)
        .call(() => audio.sfx('paper', { gain: 0.5, rate: 1.0 }), [], 0.59)
        .call(() => audio.sfx('paper', { gain: 0.5, rate: 1.25 }), [], 0.74)
        .call(() => audio.sfx('paper', { gain: 0.45, rate: 0.92 }), [], 0.89)
        .call(() => audio.sfx('whoosh', { gain: 0.9, rate: 0.6 }), [], 1.55)
        .call(() => haptics.tap(), [], 2.45)
        .call(() => audio.sfx('chimes', { gain: 0.7 }), [], 2.65)
        .call(() => audio.sfx('chimes', { gain: 0.4, rate: 0.85 }), [], 3.5)
        .call(() => audio.sfx('whoosh', { gain: 0.35, rate: 0.5 }), [], 4.8)
        .call(() => {
          audio.sfx('chimes', { gain: 0.45, rate: 1.2 });
          haptics.success();
        }, [], 7.2)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  useFrame((state, delta) => {
    const { phase, capture } = store.getState();
    const s = introState(director.time);
    const t = state.clock.elapsedTime;
    const now = capture ? 4 + director.time : t;

    // After the hand-off the gold names lift away and leave the stage to the DOM hero.
    const target = phase === 'handoff' || phase === 'content' ? 1 : 0;
    away.current = capture ? target : away.current + (target - away.current) * Math.min(1, delta * 1.5);

    sweep.uSweep.value = G[1] + (((capture ? 0.58 : (t * 0.28) % 1) * 7.5) - 3.75);
    if (gateKey.current) gateKey.current.intensity = s.gate ? keyIntensity * (1 + s.glow * 0.15) : 0;
    flash.material.uniforms.uK!.value = s.flash;
    shaftMesh.material.uniforms.uK!.value = s.gate ? 0 : s.shafts * (1 - 0.45 * away.current);
    shaftMesh.material.uniforms.uTime!.value = now;
    motes.material.uniforms.uTime!.value = now;
    gateMotes.material.uniforms.uTime!.value = now;
    gateMotes.material.uniforms.uK!.value = s.gate ? 1 - s.rays : 0;
    (blossoms.material as { uniforms: Record<string, { value: number }> }).uniforms.uTime!.value = now;
    pool.material.opacity = s.gate ? 0 : 0.07 + 0.1 * s.shafts;
  });

  const lanternSwing = (phase: number, amp: number) => ({ amp, period: 2.9 + phase * 0.25, decay: 3.2, sway: 0.035, phase });
  const goboOn = settings.shadows && !low;

  return (
    <>
      <Sky top={shade(pal.skyTop, 0.93)} horizon={shade(pal.skyLow, 0.96)} bottom={pal.ivoryWarm} glow="#FFF1D2" glowDir={[0, 0.16, -1]} glowStrength={0.55} />
      <hemisphereLight args={[mix(pal.ivory, pal.gold, 0.18), mix(pal.ivoryWarm, pal.goldDeep, 0.5), hemi]} />
      <directionalLight position={[5, 10, 14]} intensity={fill} color={mix('#ffffff', pal.gold, 0.25)} />
      {!low && <directionalLight position={[0, 9, -40]} intensity={back} color={mix(pal.gold, '#ffffff', 0.3)} />}
      <primitive object={gateTarget} />
      <spotLight
        ref={gateKey}
        position={g(2.4, 3.2, 6.2)}
        target={gateTarget}
        angle={0.42}
        penumbra={0.8}
        decay={2}
        intensity={keyIntensity}
        color={mix('#ffffff', pal.gold, 0.14)}
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
      />
      <Environment resolution={settings.envResolution} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={shade(mix(pal.goldDeep, pal.ivoryWarm, 0.35), 0.55)} side={BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={2.6} color={mix('#ffffff', pal.goldPale, 0.4)} position={[0, 6, -5]} scale={[12, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.3} color={pal.gold} position={[-7, 2, 3]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="ring" intensity={1.8} color={pal.goldPale} position={[4, 3, 6]} scale={2.5} />
        <Lightformer form="rect" intensity={0.8} color={pal.ivory} position={[0, -4, 4]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <group position={G}>
          <Pochette
            palette={pal}
            monogram={view.monogram}
            fontVar={view.lang === 'ar' ? '--font-aref' : '--font-pinyon'}
            director={director}
            sweep={sweep}
            dustCount={scaledCount(160, tier)}
            flapNormal={maps.emboss}
          />
          <points geometry={gateMotes.geometry} material={gateMotes.material} position={[-G[0], -G[1], -G[2]]} frustumCulled={false} />
        </group>

        <ArchHall
          palette={pal}
          lowTier={low}
          texScale={low ? 56 : 104}
          director={director}
          names={`${view.groom} ${view.lang === 'ar' ? 'و' : '&'} ${view.bride}`}
          lang={view.lang}
          onTextReady={textReady}
          away={away}
          goldText={{ color: pal.goldDeep, emissive: view.palette.goldInk }}
        />
        {[-1, 1].map((side) => (
          <Lantern
            key={`in${side}`}
            pivot={[side * 3.05, 10.4, 1.05]}
            drop={4.8}
            scale={1.3}
            swing={lanternSwing(side < 0 ? 0 : 0.9, side < 0 ? 0.2 : -0.17)}
            brass={pal.brass}
            light="#FFC56E"
            director={director}
            pierced={maps.pierced}
            kickAt={kickAt}
            glow={low ? 0.55 : 1}
            gobo={goboOn ? { map: maps.gobo, intensity: goboIntensity, target: [-side * 0.1, -0.45, -2.0], shadowSize: 512 } : null}
          />
        ))}
        {[-1, 1].map((side) => (
          <Lantern
            key={`out${side}`}
            pivot={[side * 5.9, 10.6, 1.3]}
            drop={3.0}
            scale={1.0}
            swing={lanternSwing(side < 0 ? 1.7 : 2.4, side < 0 ? 0.15 : -0.13)}
            brass={pal.brass}
            light="#FFC56E"
            director={director}
            pierced={maps.pierced}
            kickAt={kickAt}
            glow={low ? 0.55 : 1}
          />
        ))}
        <mesh geometry={pool.geometry} material={pool.material} rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.01, 4.6]} />
        <Garden palette={pal} haze={haze} cypressColor={mix(pal.emerald, '#3F6B4E', 0.45)} />
        <Couple director={director} suit={mix('#20201E', pal.emerald, 0.3)} gown={mix(pal.blossom, pal.ivoryWarm, 0.45)} haze={haze} silhouette={low} />
        <primitive object={blossoms} />
        <points geometry={motes.geometry} material={motes.material} frustumCulled={false} />
        <mesh geometry={shaftMesh.geometry} material={shaftMesh.material} frustumCulled={false} renderOrder={3} />
        <Burst color={mix(pal.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <mesh geometry={flash.geometry} material={flash.material} frustumCulled={false} renderOrder={999} />
      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}
