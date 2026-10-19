'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Color, Euler, Group, Matrix4, Mesh, Quaternion, Sprite, Vector3, type DirectionalLight, type PerspectiveCamera } from 'three';
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
import { useIntro } from '@/lib/invite/stage/useIntro';
import type { PassColors } from './art';
import { passContent, tearPose } from './pass';
import { BoardingPass, type PassHandle } from './parts/BoardingPass';
import { uniforms, useAtmosphere, useClouds, useDots, useGlobe, useGlows, useHalo, useMarker, usePlane, useStars, useTrail, type Palette } from './parts/world';
import { altitudeAt, chaseQuatAt, dirAt, gateFocus, gateQuat, headingAt, makeRoute, planeQuat, positionAt, R, smoothstep } from './route';
import { ambientShot, buildTrack, easeInOutCubic, easeOutBack, easeOutCubic, INTRO, introState, PASS_END, T_LAND } from './timeline';

/**
 * Destination Love (حب بلا حدود): an ivory porcelain globe beaded with gold land on an emerald night.
 *  S1  the globe turns slowly, the origin pin pulsing, the plane parked on it, the corner of a
 *      boarding pass peeking from behind the world;
 *  S2  take-off and a chase camera over the curving globe, the gold trail drawn behind the plane,
 *      clouds streaming past (medium/high);
 *  S3  a top-down descent onto the wedding city as its lights bloom; touchdown on the venue pin,
 *      out of which the boarding pass rises to face the guest.
 * Then the globe settles into dusk behind the content (scroll orbits it) and the pass parks in a
 * corner; «حاضرين» tears its stub off. Every opening visual is a pure function of director.time.
 */
const PLANE_SCALE = 0.16;
const L_GATE = new Vector3(-0.55, 0.42, 0.72).normalize();
const L_CONTENT = new Vector3(-0.42, 0.34, -0.84).normalize();
const CONTENT_TILT = 0.34;
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

const PEEK = { position: new Vector3(1.3, -1.42, -1.15), rotation: new Euler(0.1, -0.3, -0.6) };
const FLAT = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(X, new Vector3(0, 0, -1), Y));
const END_Q = (() => {
  const a = (24 * Math.PI) / 180;
  const n = new Vector3(0, Math.sin(a), Math.cos(a));
  const up = new Vector3(0, Math.cos(a), -Math.sin(a));
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(X, up, n));
})();

function useDestinationPalette(view: SceneProps['view']): Palette {
  const sc = view.palette.scene;
  return useMemo(() => {
    const globe = sc.globe ?? '#F3EBDC';
    const landGold = sc.landGold ?? '#C9A96E';
    const nightLow = sc.nightLow ?? '#184239';
    return {
      nightTop: sc.nightTop ?? '#0F2D29',
      nightLow,
      globe,
      globeShade: shade(mix(globe, landGold, 0.42), 0.9),
      globeNight: mix(nightLow, '#2E5E52', 0.32),
      landGold,
      landDeep: mix(landGold, view.palette.goldInk, 0.3),
      trail: sc.trail ?? '#E8CC8C',
      atmosphere: sc.atmosphere ?? '#FFF1D0',
      pass: sc.pass ?? '#FBF7EF',
      passInk: sc.passInk ?? '#1E2B29',
      passAccent: sc.passAccent ?? view.palette.accent,
      gold: view.palette.gold,
      goldInk: view.palette.goldInk,
      inkSoft: view.palette.inkSoft,
      onAccent: view.palette.onAccent,
      livery: mix(sc.passAccent ?? view.palette.accent, '#2F6F5C', 0.28),
    };
  }, [sc, view.palette.gold, view.palette.goldInk, view.palette.inkSoft, view.palette.onAccent, view.palette.accent]);
}

/** Runs its callback after CinematicCamera has placed the camera (mounted after it). */
function AfterCamera({ fn }: { fn: (camera: PerspectiveCamera, delta: number, t: number) => void }) {
  useFrame((state, delta) => fn(state.camera as PerspectiveCamera, delta, state.clock.elapsedTime));
  return null;
}

export default function DestinationLoveScene({ view }: SceneProps) {
  const store = useInviteStore();
  const tier = useInvite((s) => s.tier);
  const settings = TIER_SETTINGS[tier];
  const low = tier === 'low';
  const pal = useDestinationPalette(view);
  const clock = useThree((s) => s.clock);
  const size = useThree((s) => s.size);
  const textReady = useTextsReady(1);

  const keyIntensity = useTweak('key light', 1.5, { min: 0, max: 10, step: 0.05 });
  const hemi = useTweak('hemisphere', 0.6, { min: 0, max: 4, step: 0.05 });
  const bloom = useTweak('bloom', 0.45, { min: 0, max: 3, step: 0.05 });
  const vignette = useTweak('vignette', 0.42, { min: 0, max: 1, step: 0.01 });
  const atmoK = useTweak('atmosphere', 0.5, { min: 0, max: 3, step: 0.05 });

  const route = useMemo(() => makeRoute(view.origin, view.destination), [view.origin, view.destination]);
  const track = useMemo(() => buildTrack(route), [route]);
  const director = useDirector({
    track,
    parallax: 0.1,
    ambient: (scroll, t) => ambientShot(scroll, t, store.getState().capture != null),
  });
  useEffect(() => {
    director.track = track;
  }, [director, track]);

  const grade = useMemo<GradeParams>(
    () => ({
      ...NEUTRAL_GRADE,
      lift: [0.0, 0.012, 0.01],
      gamma: [1.0, 1.0, 0.98],
      gain: [1.02, 1.0, 0.96],
      saturation: 1.02,
      contrast: 1.04,
      shadowTint: [0.4, 0.52, 0.48],
      highlightTint: [0.6, 0.55, 0.45],
      splitAmount: 0.22,
      bloom,
      vignette,
      grain: 0.03,
    }),
    [bloom, vignette],
  );

  const globe = useGlobe(tier, pal);
  const dots = useDots(tier, pal);
  const atmo = useAtmosphere(pal);
  const halo = useHalo(pal);
  const trail = useTrail(route, pal, !low);
  const clouds = useClouds(route, low ? 0 : scaledCount(28, tier), pal);
  const stars = useStars(scaledCount(1100, tier), pal);
  const originMarker = useMarker(pal, pal.trail);
  const destMarker = useMarker(pal, '#FFE6B0');
  const plane = usePlane(pal);
  const glows = useGlows(pal);

  const content = useMemo(
    () =>
      passContent({
        lang: view.lang,
        groom: view.groom,
        bride: view.bride,
        monogram: view.monogram,
        guestName: view.guestName,
        dateLine: view.dateLine,
        timeLine: view.timeLine,
        venueName: view.venueName,
        from: view.origin,
        to: view.destination,
      }),
    [view.lang, view.groom, view.bride, view.monogram, view.guestName, view.dateLine, view.timeLine, view.venueName, view.origin, view.destination],
  );
  const passColors = useMemo<PassColors>(
    () => ({ paper: pal.pass, ink: pal.passInk, inkSoft: pal.inkSoft, accent: pal.passAccent, onAccent: pal.onAccent, gold: pal.landGold, goldInk: pal.goldInk, night: pal.nightTop }),
    [pal],
  );

  const globeGroup = useRef<Group>(null);
  const planeGroup = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const origin = useRef<Mesh>(null);
  const dest = useRef<Mesh>(null);
  const cityGlow = useRef<Sprite>(null);
  const haloSprite = useRef<Sprite>(null);
  const key = useRef<DirectionalLight>(null);
  const pass = useRef<PassHandle>(null);
  const away = useRef(0);
  const sway = useRef(0);
  const tear = useRef({ torn: view.rsvpAttending === true, at: -1 });

  // Markers sit flat on the porcelain at their cities.
  useEffect(() => {
    const place = (m: Mesh | null, v: Vector3, lift: number) => {
      if (!m) return;
      m.position.copy(v).multiplyScalar(R + lift);
      m.quaternion.setFromUnitVectors(Z, v);
    };
    place(origin.current, route.a, 0.006);
    place(dest.current, route.b, 0.006);
    cityGlow.current?.position.copy(route.b).multiplyScalar(R + 0.05);
  }, [route]);

  // The gate's slow turn is handed over smoothly to the opening; «حاضرين» tears the stub.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.phase === 'opening' && prev.phase !== 'opening') sway.current = s.capture ? 0 : 0.22 * Math.sin(clock.elapsedTime * 0.16);
        if (s.rsvp.id !== prev.rsvp.id) {
          if (s.rsvp.attending && !tear.current.torn) {
            tear.current = { torn: true, at: clock.elapsedTime };
            audio.sfx('paper', { gain: 0.85, rate: 1.3 });
            haptics.tick();
          } else if (s.rsvp.attending === false) tear.current = { torn: false, at: -1 };
        }
      }),
    [store, clock],
  );

  useIntro(
    (tl) => {
      tl.call(() => {
        audio.sfx('whoosh', { gain: 0.5, rate: 0.55 });
        haptics.tap();
      }, [], 0.2)
        .call(() => audio.sfx('plane', { gain: 0.85 }), [], 0.75)
        .call(() => audio.sfx('plane', { gain: 0.6, rate: 0.93 }), [], 3.2)
        .call(() => audio.sfx('whoosh', { gain: 0.7, rate: 0.48 }), [], 5.9)
        .call(() => {
          audio.sfx('tick', { gain: 0.6 });
          haptics.tap();
        }, [], T_LAND - 0.05)
        .call(() => audio.sfx('chimes', { gain: 0.32, rate: 1.25 }), [], 7.7)
        .call(() => {
          audio.sfx('paper', { gain: 0.7 });
          haptics.success();
        }, [], 7.9)
        .to(director, { time: INTRO, duration: INTRO, ease: 'none' }, 0);
    },
    [director],
  );

  const tmp = useMemo(
    () => ({
      q: new Quaternion(),
      qa: new Quaternion(),
      qb: new Quaternion(),
      qc: new Quaternion(),
      light: new Vector3(),
      v: new Vector3(),
      w: new Vector3(),
      h: new Vector3(),
      cam: new Vector3(),
      tilt: new Quaternion().setFromAxisAngle(X, CONTENT_TILT),
      idle: new Quaternion(),
      endQ: chaseQuatAt(route, 1),
    }),
    [route],
  );

  useFrame((state, delta) => {
    const g = globeGroup.current;
    if (!g) return;
    const { phase, capture } = store.getState();
    const still = capture != null;
    const t = state.clock.elapsedTime;
    const ti = director.time;
    const st = introState(ti, route.virtual);
    const now = still ? 3 + ti : t;
    const gateLike = phase === 'boot' || phase === 'loading' || phase === 'gate';
    const after = phase === 'handoff' || phase === 'content';
    away.current = still ? (after ? 1 : 0) : away.current + ((after ? 1 : 0) - away.current) * Math.min(1, delta * 1.5);
    const aw = easeInOutCubic(away.current);

    // Globe orientation: the gate's north-up turn → the chase frame → (content) a tilt toward us.
    let yaw = 0;
    if (gateLike && !still) yaw = 0.22 * Math.sin(t * 0.16);
    else if (phase === 'opening') yaw = sway.current * (1 - smoothstep(0, 1.4, ti));
    gateQuat(gateFocus(route), yaw, tmp.qa);
    chaseQuatAt(route, st.sFrame, tmp.qb);
    tmp.q.slerpQuaternions(tmp.qa, tmp.qb, st.gateToChase);
    if (aw > 0) {
      tmp.qc.multiplyQuaternions(tmp.tilt, tmp.endQ);
      if (!still) tmp.qc.premultiply(tmp.idle.setFromAxisAngle(Y, Math.sin(t * 0.05) * 0.06));
      tmp.q.slerp(tmp.qc, aw);
    }
    g.quaternion.copy(tmp.q);

    // One sun for everything; it swings behind the globe for the dusk behind the content.
    tmp.light.copy(L_GATE).lerp(L_CONTENT, aw).normalize();
    for (const m of [globe.material, dots.material, atmo.material]) (uniforms(m).uLight!.value as Vector3).copy(tmp.light);
    if (key.current) key.current.position.copy(tmp.light).multiplyScalar(12);

    // Plane, its shadow on the porcelain, and the trail.
    const pg = planeGroup.current;
    if (pg) {
      positionAt(route, st.s, pg.position);
      planeQuat(route, st.s, pg.quaternion);
      const bank = Math.sin(st.s * Math.PI * 2) * 0.06 * smoothstep(0.05, 0.2, st.s) * (1 - smoothstep(0.8, 0.95, st.s));
      pg.rotateZ(bank);
      pg.scale.setScalar(PLANE_SCALE * Math.max(0.001, st.planeScale));
      pg.visible = st.planeScale > 0.001;
    }
    if (shadow.current) {
      dirAt(route, st.s, tmp.v);
      shadow.current.position.copy(tmp.v).multiplyScalar(R + 0.005);
      shadow.current.quaternion.setFromUnitVectors(Z, tmp.v);
      headingAt(route, st.s, tmp.h);
      const alt = altitudeAt(route, st.s);
      shadow.current.scale.set(0.11 + alt * 0.4, 0.13 + alt * 0.5, 1);
      (glows.shadow as { opacity: number }).opacity = 0.32 * (1 - smoothstep(0.0, 0.14, alt)) * (route.virtual ? 0 : 1);
    }
    const tu = uniforms(trail.material);
    tu.uHead!.value = st.trail;
    tu.uOpacity!.value = st.trailOpacity;
    tu.uTime!.value = now;
    tu.uPixel!.value = (2 * Math.tan(((state.camera as PerspectiveCamera).fov * Math.PI) / 360)) / Math.max(1, size.height);

    // Pins, city lights, clouds, stars.
    const ou = uniforms(originMarker.material);
    ou.uTime!.value = now;
    ou.uPulse!.value = st.originPulse;
    ou.uOpacity!.value = 0.55 + 0.45 * st.originPulse;
    const du = uniforms(destMarker.material);
    du.uTime!.value = now * 0.8;
    du.uPulse!.value = st.cityGlow;
    du.uGlow!.value = st.cityGlow * 0.7 + st.flash;
    du.uOpacity!.value = 0.5 + 0.5 * st.cityGlow;
    tmp.w.copy(route.b).applyQuaternion(tmp.q);
    const facing = smoothstep(-0.05, 0.25, tmp.cam.copy(state.camera.position).sub(tmp.v.copy(tmp.w).multiplyScalar(R)).normalize().dot(tmp.w));
    const dot = uniforms(dots.material);
    (dot.uCityPos!.value as Vector3).copy(tmp.w).multiplyScalar(R);
    dot.uCityK!.value = st.cityGlow * (0.75 + 0.6 * st.flash);
    dot.uTime!.value = now;
    dot.uSize!.value = (dot.uSpacing!.value as number) * (0.44 + 0.38 * smoothstep(2.6, 9, state.camera.position.length()));
    dot.uTwinkle!.value = still ? 0 : 1;
    if (cityGlow.current) {
      const breath = still ? 1 : 1 + Math.sin(t * 1.3) * 0.06 * aw;
      cityGlow.current.scale.setScalar((0.32 + 0.42 * st.cityGlow + 0.9 * st.flash) * breath);
      glows.city.opacity = Math.min(1, (st.cityGlow * 0.75 + st.flash * 0.8) * facing);
    }
    if (clouds.material) uniforms(clouds.material).uK!.value = st.clouds;
    const su = uniforms(stars.material);
    su.uTime!.value = now;
    su.uTw!.value = still ? 0 : 1;
    su.uPx!.value = state.gl.getPixelRatio();
    uniforms(atmo.material).uK!.value = atmoK;
    if (haloSprite.current) {
      const d = state.camera.position.length();
      haloSprite.current.material.opacity = 0.6 * smoothstep(5, 9, d);
    }
  });

  // The pass: peeking at the gate, rising at the landing, parked in a corner behind the content.
  const passPose = useMemo(() => ({ pos: new Vector3(), quat: new Quaternion(), park: new Vector3(), parkQ: new Quaternion(), e: new Euler(), q: new Quaternion() }), []);
  const afterCamera = (camera: PerspectiveCamera, _delta: number, t: number) => {
    const h = pass.current;
    if (!h?.root) return;
    const { phase, capture } = store.getState();
    const still = capture != null;
    const ti = director.time;
    const st = introState(ti, route.virtual);
    const gateLike = phase === 'boot' || phase === 'loading' || phase === 'gate';
    const root = h.root;
    const P = passPose;
    let visible = true;
    let scale = 1;
    if (gateLike || (st.peek > 0.001 && st.rise === 0)) {
      const tuck = 1 - st.peek;
      const bob = gateLike && !still ? Math.sin(t * 0.9) * 0.022 : 0;
      P.pos.copy(PEEK.position).add(P.park.set(-0.35 * tuck, -0.25 * tuck + bob, -1.3 * tuck));
      P.e.copy(PEEK.rotation);
      if (gateLike && !still) P.e.z += Math.sin(t * 0.7) * 0.012;
      P.quat.setFromEuler(P.e);
      visible = st.peek > 0.01;
    } else if (st.rise > 0) {
      const e = easeOutCubic(st.rise);
      P.pos.set(0, R + 0.03, -0.08).lerp(P.park.set(...PASS_END), e);
      P.pos.y += Math.sin(Math.PI * e) * 0.08;
      P.quat.slerpQuaternions(FLAT, END_Q, easeInOutCubic(st.rise));
      P.quat.multiply(P.q.setFromAxisAngle(Z, (1 - e) * 0.85));
      scale = 0.05 + 0.95 * easeOutBack(st.rise);
      const aw = easeInOutCubic(away.current);
      if (aw > 0) {
        camera.updateMatrixWorld();
        const d = 3.4;
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * d;
        const halfW = halfH * camera.aspect;
        const portrait = camera.aspect < 0.9;
        const ps = portrait ? 0.4 : 0.62;
        P.park.set(portrait ? -halfW + 0.12 : -halfW + 0.62, portrait ? halfH - 0.12 : halfH * 0.36, -d).applyMatrix4(camera.matrixWorld);
        P.parkQ.copy(camera.quaternion).multiply(P.q.setFromEuler(P.e.set(-0.12, 0.5, portrait ? -0.62 : 0.2)));
        if (!still) P.parkQ.multiply(P.q.setFromAxisAngle(X, Math.sin(t * 0.6) * 0.04));
        P.pos.lerp(P.park, aw);
        P.quat.slerp(P.parkQ, aw);
        scale += (ps - scale) * aw;
      }
    } else visible = false;
    root.visible = visible;
    root.position.copy(P.pos);
    root.quaternion.copy(P.quat);
    root.scale.setScalar(scale);

    // The stub: whole, tearing, or already gone.
    const tr = tear.current;
    if (!tr.torn) {
      h.stub.visible = true;
      h.hinge.rotation.set(0, 0, 0);
      h.stub.position.set(0, 0, 0);
      h.stub.rotation.set(0, 0, 0);
      h.stubMats.forEach((m) => (m.opacity = 1));
    } else {
      const tp = tearPose(tr.at < 0 ? 99 : t - tr.at, h.side);
      h.stub.visible = tp.visible;
      h.hinge.rotation.set(0, tp.hingeY, tp.hingeZ);
      h.stub.position.set(...tp.position);
      h.stub.rotation.set(...tp.rotation);
      h.stubMats.forEach((m) => (m.opacity = tp.opacity));
    }
  };

  const skyColors = useMemo(
    () => ({ top: shade(pal.nightTop, 0.92), horizon: pal.nightLow, bottom: shade(pal.nightTop, 0.8), glow: mix(pal.nightLow, pal.atmosphere, 0.35) }),
    [pal],
  );
  const lightColor = useMemo(() => new Color(mix('#ffffff', pal.atmosphere, 0.5)), [pal.atmosphere]);

  return (
    <>
      <Sky top={skyColors.top} horizon={skyColors.horizon} bottom={skyColors.bottom} glow={skyColors.glow} glowDir={[-0.4, 0.3, -1]} glowStrength={0.18} />
      <points geometry={stars.geometry} material={stars.material} frustumCulled={false} renderOrder={-5} />
      <hemisphereLight args={[mix(pal.globe, pal.atmosphere, 0.5), shade(pal.nightLow, 1.2), hemi]} />
      <directionalLight ref={key} position={[-6, 5, 8]} intensity={keyIntensity} color={lightColor} />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={2.4} color={mix('#ffffff', pal.atmosphere, 0.5)} position={[-3, 6, 4]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color={pal.landGold} position={[5, 1, 3]} rotation-y={-Math.PI / 2} scale={[5, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} color={mix(pal.nightLow, '#ffffff', 0.35)} position={[-5, -2, -2]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} />
        <Lightformer form="ring" intensity={1.6} color={pal.atmosphere} position={[0, 3, 6]} scale={2} />
      </Environment>

      <Suspense fallback={null}>
        {low ? (
          <sprite ref={haloSprite} material={halo.material} scale={(R * 2) / 0.84} renderOrder={-1} />
        ) : (
          <mesh geometry={atmo.geometry!} material={atmo.material} renderOrder={6} />
        )}
        <group ref={globeGroup}>
          <mesh geometry={globe.geometry} material={globe.material} />
          <mesh geometry={dots.geometry} material={dots.material} frustumCulled={false} renderOrder={1} />
          <mesh ref={origin} geometry={originMarker.geometry} material={originMarker.material} scale={0.42} renderOrder={2} visible={!route.virtual} />
          <mesh ref={dest} geometry={destMarker.geometry} material={destMarker.material} scale={0.5} renderOrder={2} />
          <mesh ref={shadow} geometry={glows.shadowGeo} material={glows.shadow} renderOrder={2} />
          <mesh geometry={trail.geometry} material={trail.material} frustumCulled={false} renderOrder={3} />
          <group ref={planeGroup}>
            <mesh geometry={plane.body} material={plane.paint} />
            <mesh geometry={plane.trim} material={plane.gold} />
          </group>
          {clouds.geometry && <mesh geometry={clouds.geometry} material={clouds.material!} frustumCulled={false} renderOrder={5} />}
          <sprite ref={cityGlow} material={glows.city} renderOrder={7} />
        </group>
        <BoardingPass ref={pass} content={content} lang={view.lang} colors={passColors} onReady={textReady} />
        <Burst color={mix(pal.landGold, '#ffffff', 0.35)} />
        <AssetsReady />
      </Suspense>

      <CinematicCamera director={director} />
      <AfterCamera fn={afterCamera} />
      <Grade grade={grade} />
      <ShaderWarmup />
    </>
  );
}
