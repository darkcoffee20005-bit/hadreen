'use client';

import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShadowMaterial,
  SphereGeometry,
  Vector3,
  type DirectionalLight,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
} from 'three';
import { audio } from '@/lib/invite/audio/engine';
import { haptics } from '@/lib/invite/interaction/haptics';
import { tilt } from '@/lib/invite/interaction/tilt';
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
import { useIntro } from '@/lib/invite/stage/useIntro';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { ambientShot, cardScale, cardSlideY, COVER_DISTANCE, coverSize, DATE_Y, hangingString, TRACK, WALL_Z } from './layout';
import { ENVELOPE_REST, Envelope, type EnvelopeAnim } from './parts/Envelope';
import { Flowers } from './parts/Flowers';
import { cardMaterial, wallMaterial } from './shaders';
import { FLY, INTRO, introState, smoothstep } from './timeline';

/**
 * الأناقة الكلاسيكية — the couple's own "old money" design, set in motion.
 * Gate: an ivory envelope floats over olive paint laid on with a broad brush; a string of pearls
 * runs along its flap, the couple's monogram is blind-embossed where the flap points, a little
 * white bouquet is tucked at its corner and the date sits beneath it. It drifts with the hand
 * or the phone's tilt, the pearls catching the light.
 * Opening (7 s): the flap lifts and folds back, the pearls swinging on its edges; the card slides
 * up out of the pocket, then flies to the guest — turning upright on a phone — and grows until
 * it is the page. Its double gold rule draws in.
 * Content: the card is the paper under the words; a sprig of white flowers and a few pearls rest
 * in the corners, and a little gold dust hangs in the light.
 * Every visual is a pure function of director.time (timeline.ts): skip, seek and rewind are exact.
 */
const LIGHT_DIR = new Vector3(-0.42, 0.6, 1).normalize();
const HUD_DEPTH = COVER_DISTANCE - 0.28;

export default function OldMoneyScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const p = view.palette;
  const sc = p.scene;
  // The wall's paint follows the palette's band, so the variants recolour it.
  const c = useMemo(() => {
    const band = p.band;
    return {
      paint: mixHex(band, sc.paintLight ?? '#A9B08C', 0.42),
      paintDark: shadeHex(band, 0.82),
      paintLight: mixHex(band, '#E9E6CF', 0.42),
      cream: '#EFE7D2',
      paper: sc.paper ?? '#F4EEE3',
      liner: sc.liner ?? '#E6E1CF',
      pearl: sc.pearl ?? '#F3EDE4',
      petal: sc.petal ?? '#FBFAF6',
      leaf: sc.leaf ?? '#5C7448',
      relief: sc.relief ?? '#CDBB97',
      gold: p.gold,
      goldInk: p.goldInk,
    };
  }, [p.band, p.gold, p.goldInk, sc]);

  const keyI = useTweak('key', 1.9, { min: 0, max: 8, step: 0.05 });
  const fillI = useTweak('fill', 0.7, { min: 0, max: 4, step: 0.05 });
  const hemiI = useTweak('hemisphere', 0.75, { min: 0, max: 3, step: 0.05 });
  const shadowO = useTweak('shadow', 0.24, { min: 0, max: 1, step: 0.01 });
  const bloom = useTweak('bloom', 0.45, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.28, { min: 0, max: 1, step: 0.01 });

  const director = useDirector({
    track: TRACK,
    parallax: 0.22,
    ambient: (scroll, t) => ambientShot(scroll, store.getState().capture ? 0 : t),
  });

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.01, 0.01, 0.004],
      gamma: [1.0, 1.0, 0.98],
      gain: [1.0, 1.0, 0.99],
      saturation: 0.96,
      contrast: 1.03,
      shadowTint: [0.46, 0.5, 0.42],
      highlightTint: [0.56, 0.53, 0.47],
      splitAmount: 0.16,
      bloom,
      vignette,
      grain: 0.03,
    }),
    [bloom, vignette],
  );

  useIntro(
    (tl) => {
      tl.call(() => haptics.tap(), [], 0.02)
        .call(() => audio.sfx('chimes', { gain: 0.3, rate: 1.7 }), [], 0.08)
        .call(() => audio.sfx('paper', { gain: 0.6, rate: 1.05 }), [], 0.3)
        .call(() => audio.sfx('chimes', { gain: 0.25, rate: 2.1 }), [], 0.75)
        .call(() => audio.sfx('paper', { gain: 0.5, rate: 0.85 }), [], 1.25)
        .call(() => audio.sfx('whoosh', { gain: 0.55, rate: 0.7 }), [], FLY.start + 0.25)
        .call(() => {
          audio.sfx('chimes', { gain: 0.45, rate: 1.1 });
          haptics.success();
        }, [], FLY.end)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  // ─── objects driven every frame ───
  const envState = useRef<EnvelopeAnim>({ ...ENVELOPE_REST });
  const awayGroup = useRef<Group>(null);
  const holdGroup = useRef<Group>(null);
  const card = useRef<Mesh>(null);
  const wall = useRef<Mesh>(null);
  const catcher = useRef<Mesh>(null);
  const key = useRef<DirectionalLight>(null);
  const hud = useRef<Group>(null);
  const hudFlowers = useRef<Group>(null);
  const hudPearls = useRef<InstancedMesh>(null);
  const dateMat = useRef<MeshStandardMaterial>(null);
  const [envGone, setEnvGone] = useState(false);
  const envGoneRef = useRef(false);
  const textReady = useTextsReady(2);

  const wallMat = useMemo(() => wallMaterial({ dark: c.paintDark, base: c.paint, light: c.paintLight, cream: c.cream, gold: c.gold }), [c.paintDark, c.paint, c.paintLight, c.cream, c.gold]);
  const cardMat = useMemo(() => cardMaterial({ paper: c.paper, gold: mixHex(c.gold, c.goldInk, 0.25) }), [c.paper, c.gold, c.goldInk]);
  const plane = useMemo(() => new PlaneGeometry(1, 1), []);
  const shadowMat = useMemo(() => new ShadowMaterial({ color: new Color(shadeHex(c.paintDark, 0.45)), opacity: 0.3 }), [c.paintDark]);
  const hudPearlKit = useMemo(() => {
    const g = new SphereGeometry(1, 14, 10);
    const m = new MeshPhysicalMaterial({ color: c.pearl, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.6, iridescenceIOR: 1.35, sheen: 0.35, sheenColor: '#ffffff' });
    return { g, m };
  }, [c.pearl]);
  useEffect(
    () => () => {
      wallMat.dispose();
      cardMat.dispose();
      plane.dispose();
      shadowMat.dispose();
      hudPearlKit.g.dispose();
      hudPearlKit.m.dispose();
    },
    [wallMat, cardMat, plane, shadowMat, hudPearlKit],
  );

  const tmp = useMemo(
    () => ({
      start: new Matrix4(),
      local: new Matrix4(),
      sp: new Vector3(),
      sq: new Quaternion(),
      ss: new Vector3(),
      ep: new Vector3(),
      eq: new Quaternion(),
      turn: new Quaternion(),
      wob: new Quaternion(),
      e: new Euler(),
      v: new Vector3(),
      m: new Matrix4(),
      one: new Vector3(1, 1, 1),
    }),
    [],
  );
  const shadowTarget = useMemo(() => new Object3D(), []);
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);

  // Two passes a frame. First (priority −1, before the parts' own frame callbacks): the opening's
  // state for the envelope. Then (priority 0, after the camera has moved): everything placed
  // relative to the camera — the flying card and the corner details.
  const frame = useRef({ t: 0, s: introState(0), clockT: 0, still: false });
  useFrame((state) => {
    const { phase, capture } = store.getState();
    const clockT = state.clock.elapsedTime;
    const t = phase === 'boot' || phase === 'loading' || phase === 'gate' ? 0 : phase === 'opening' ? director.time : INTRO;
    const s = introState(t);
    const still = Boolean(capture);
    frame.current = { t, s, clockT, still };

    // Envelope: floating and leaning with the hand while it waits.
    const e = envState.current;
    e.flap = s.flap;
    e.swing = s.swing;
    e.time = still ? 0 : clockT;
    e.glint = phase === 'gate' ? (still ? -1 : ((clockT / 3.2) % 1.4) - 0.2) : t < 1.4 ? s.glint : -1;
    const hold = holdGroup.current;
    if (hold) {
      const f = still ? 0 : s.float;
      hold.position.set(0, Math.sin(clockT * 0.8) * 0.045 * f, 0);
      hold.rotation.set(tilt.y * 0.12 * f + Math.sin(clockT * 0.55) * 0.02 * f, tilt.x * 0.16 * f + Math.sin(clockT * 0.43) * 0.025 * f, Math.sin(clockT * 0.37) * 0.012 * f);
      hold.updateMatrix();
    }
    if (awayGroup.current) {
      awayGroup.current.position.set(0, -4.6 * s.away, -0.4 * s.away);
      awayGroup.current.rotation.set(0.35 * s.away, 0, -0.06 * s.away);
    }
    const gone = s.away >= 0.999;
    if (gone !== envGoneRef.current) {
      envGoneRef.current = gone;
      setEnvGone(gone);
    }
    if (dateMat.current) {
      dateMat.current.opacity = s.date;
      dateMat.current.visible = s.date > 0.002;
    }
  }, -1);

  useFrame(() => {
    const { phase, scroll } = store.getState();
    const { t, s, clockT, still } = frame.current;
    const aspect = size.width / Math.max(1, size.height);
    const upright = aspect < 1;
    const hold = holdGroup.current;
    const gone = s.away >= 0.999;

    // The card: inside the envelope (following it) → flying → covering the screen.
    const cover = coverSize(camera.fov, aspect);
    const [sx, sy] = cardScale(s.fly, cover, upright);
    const cm = card.current;
    if (cm) {
      tmp.local.compose(tmp.v.set(0, cardSlideY(s.slide), 0), tmp.eq.identity(), tmp.ss.set(1, 1, 1));
      tmp.start.multiplyMatrices(hold ? hold.matrix : tmp.m.identity(), tmp.local);
      tmp.start.decompose(tmp.sp, tmp.sq, tmp.v);
      if (s.fly > 0) {
        camera.updateMatrixWorld();
        tmp.ep.set(0, 0, -COVER_DISTANCE).applyMatrix4(camera.matrixWorld);
        tmp.turn.setFromAxisAngle(tmp.v.set(0, 0, 1), upright ? -Math.PI / 2 : 0);
        tmp.eq.copy(camera.quaternion).multiply(tmp.turn);
        const f = s.fly;
        tmp.sp.lerp(tmp.ep, f);
        tmp.sp.y += Math.sin(Math.PI * f) * 0.35;
        tmp.sq.slerp(tmp.eq, f);
        // A little lift and turn in the hand as it comes.
        tmp.wob.setFromEuler(tmp.e.set(-0.32 * Math.sin(Math.PI * f), 0.18 * Math.sin(Math.PI * f), 0));
        tmp.sq.multiply(tmp.wob);
      }
      cm.position.copy(tmp.sp);
      cm.quaternion.copy(tmp.sq);
      cm.scale.set(sx, sy, 1);
      cm.visible = s.slide > 0 || s.fly > 0;
    }
    cardMat.uniforms.uSize.value.set(sx, sy);
    const borderAway = phase === 'content' || phase === 'handoff' ? 1 - smoothstep(0.0, 0.05, scroll) : 1;
    cardMat.uniforms.uBorder.value = s.border * borderAway;
    cardMat.uniforms.uLight.value.set(still ? 0 : tilt.x, still ? 0 : -tilt.y);

    // The wall: hidden once the card covers the view (it saves the fill on phones).
    const covered = s.fly >= 0.999;
    const camZ = camera.position.z - WALL_Z;
    const halfH = camZ * Math.tan((camera.fov * Math.PI) / 360);
    wallMat.uniforms.uTime.value = still ? 0 : clockT;
    wallMat.uniforms.uView.value.set(camera.position.x, camera.position.y, halfH * aspect, halfH);
    if (wall.current) wall.current.visible = !covered;
    if (catcher.current) catcher.current.visible = !covered && !low;
    shadowMat.opacity = shadowO * (1 - s.away);
    if (key.current) key.current.shadow.autoUpdate = !gone;

    // Corner details over the page, locked to the camera.
    const h = hud.current;
    if (h) {
      h.position.copy(camera.position);
      h.quaternion.copy(camera.quaternion);
      const reveal = phase === 'content' || phase === 'handoff' ? 1 : smoothstep(FLY.end - 0.3, INTRO, t);
      h.visible = reveal > 0.001;
      const hh = HUD_DEPTH * Math.tan((camera.fov * Math.PI) / 360);
      const hw = hh * aspect;
      const k = Math.min(1, hw / 0.42); // narrower screens get a smaller sprig
      if (hudFlowers.current) {
        const sway = still ? 0 : clockT;
        // Bottom-right (mirrored), clear of the sound button in the other corner.
        hudFlowers.current.position.set(hw - 0.1 * k + (1 - reveal) * 0.35, -hh + 0.1 * k - (1 - reveal) * 0.2, -HUD_DEPTH);
        const sc = 0.42 * k + 0.06;
        hudFlowers.current.scale.set(-sc, sc, sc);
        hudFlowers.current.rotation.set(Math.sin(sway * 0.6) * 0.04 + tilt.y * 0.05, tilt.x * 0.08, 0.35 + Math.sin(sway * 0.45) * 0.03);
      }
      const pearlsMesh = hudPearls.current;
      if (pearlsMesh) {
        const sway = still ? 0 : Math.sin(clockT * 0.7) * 0.012;
        // A short drape across the corner: the same length on a phone and a wide screen.
        const from = -hw + Math.min(hw * 0.62, 0.36);
        const pts = hangingString([from, hh + 0.03], [-hw - 0.03, hh - Math.min(hh * 0.68, 0.36)], 0.07 + sway, pearlsMesh.count);
        const r = 0.0078 * (0.65 + 0.35 * k);
        pts.forEach(([x, y], i) => {
          tmp.m.makeScale(r, r, r);
          tmp.m.setPosition(x - (1 - reveal) * 0.25, y + (1 - reveal) * 0.25, -HUD_DEPTH + 0.02);
          pearlsMesh.setMatrixAt(i, tmp.m);
        });
        pearlsMesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  const ar = view.lang === 'ar';
  const fontVar = ar ? '--font-aref' : '--font-pinyon';
  const envColors = useMemo(() => ({ paper: c.paper, liner: c.liner, pearl: c.pearl, relief: c.relief, petal: c.petal, leaf: c.leaf }), [c.paper, c.liner, c.pearl, c.relief, c.petal, c.leaf]);
  const lightPos = useMemo(() => LIGHT_DIR.clone().multiplyScalar(9).toArray(), []);

  return (
    <>
      <color attach="background" args={[c.paintDark]} />
      <hemisphereLight args={[mixHex(c.cream, '#ffffff', 0.4), c.paintDark, hemiI]} />
      <primitive object={shadowTarget} position={[0, 0, 0]} />
      <directionalLight
        ref={key}
        position={lightPos}
        target={shadowTarget}
        intensity={keyI}
        color="#FFF6E6"
        castShadow={settings.shadows}
        shadow-mapSize={[settings.shadowMapSize, settings.shadowMapSize]}
        shadow-camera-left={-3.4}
        shadow-camera-right={3.4}
        shadow-camera-top={3.4}
        shadow-camera-bottom={-3.4}
        shadow-camera-near={2}
        shadow-camera-far={16}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
        shadow-radius={9}
      />
      <directionalLight position={[3, -1.5, 5]} intensity={fillI} color={mixHex(c.paintLight, '#ffffff', 0.5)} />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={1.4} color="#FFF5E6" position={[-3, 4, 6]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color={c.paintLight} position={[4, 0, 4]} scale={[4, 8, 1]} />
        <Lightformer form="rect" intensity={0.5} color={c.cream} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="circle" intensity={2.5} color="#ffffff" position={[-1.5, 2.5, 7]} scale={1.2} />
        <Lightformer form="rect" intensity={0.25} color={c.paintDark} position={[0, -6, 2]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>

      {/* The painted wall and the shadow the floating envelope casts on it. */}
      <mesh ref={wall} geometry={plane} material={wallMat} position={[0, 0, WALL_Z]} scale={[40, 30, 1]} />
      <mesh ref={catcher} geometry={plane} material={shadowMat} position={[0, 0, WALL_Z + 0.01]} scale={[14, 12, 1]} receiveShadow />

      <Suspense fallback={null}>
        <group ref={awayGroup}>
          {!envGone && (
            <group ref={holdGroup} matrixAutoUpdate={false}>
              <Envelope colors={envColors} monogram={view.monogram} fontVar={fontVar} state={envState} onReady={textReady} />
            </group>
          )}
          <GoldText text={view.dateLine} lang={view.lang} role="serif" height={0.19} position={[0, DATE_Y, 0.05]} color="#FFFFFF" emissive="#FBF6EA" emissiveIntensity={low ? 1 : 0.85} materialRef={dateMat} onReady={textReady} />
        </group>
        <mesh ref={card} geometry={plane} material={cardMat} visible={false} frustumCulled={false} />

        <group ref={hud} visible={false}>
          <group ref={hudFlowers}>
            <Flowers blooms={HUD_BLOOMS} leaves={HUD_LEAVES} petal={c.petal} leaf={c.leaf} />
          </group>
          <instancedMesh ref={hudPearls} args={[hudPearlKit.g, hudPearlKit.m, 24]} frustumCulled={false} />
          <Sparkles count={scaledCount(36, tier)} scale={[1.2, 1.4, 0.4]} position={[0, 0, -HUD_DEPTH + 0.15]} size={1.6} speed={0.15} opacity={0.55} color={mixHex(c.gold, '#ffffff', 0.45)} noise={0.4} />
        </group>

        <Sparkles count={scaledCount(60, tier)} scale={[5, 4, 1.4]} position={[0, 0.2, 0.2]} size={2.4} speed={0.18} opacity={0.6} color={mixHex(c.gold, '#ffffff', 0.4)} noise={0.5} />
        <Burst color={mixHex(c.gold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}

/** The sprig in the page's lower corner: one open flower, a bud, leaves reaching out. */
const HUD_BLOOMS = [
  { x: 0.05, y: 0.05, z: 0.04, spin: 0.6, size: 1, tilt: 0.2 },
  { x: 0.3, y: 0.24, z: 0.02, spin: 1.9, size: 0.7, tilt: 0.8, bud: true },
];
const HUD_LEAVES = [
  { x: 0, y: 0, z: -0.01, angle: Math.PI * 1.15, length: 0.34, roll: 0.3 },
  { x: 0.02, y: -0.02, z: -0.012, angle: Math.PI * 1.55, length: 0.3, roll: -0.3 },
  { x: 0.16, y: 0.12, z: -0.01, angle: Math.PI * 0.2, length: 0.26, roll: 0.3 },
  { x: 0.08, y: 0.06, z: -0.012, angle: Math.PI * 0.62, length: 0.24, roll: -0.25 },
];
