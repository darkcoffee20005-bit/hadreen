'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { advance, Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { NeutralToneMapping, NoToneMapping } from 'three';
import { publishProbe } from '../capture';
import { inviteStore, useInvite } from '../machine';
import { TIER_SETTINGS } from '../quality/tiers';

/**
 * The one WebGL canvas of an invitation. Rendering is driven by FrameDriver (frameloop "never"):
 * full rate during the gate and the opening and while the guest interacts, a low idle rate
 * while they read, nothing while the tab is hidden.
 */
export function Stage({ children, className }: { children: React.ReactNode; className?: string }) {
  const tier = useInvite((s) => s.tier);
  const capture = useInvite((s) => s.capture);
  const settings = TIER_SETTINGS[tier];

  return (
    <Canvas
      className={className}
      aria-hidden="true"
      dpr={[1, settings.dpr]}
      frameloop="never"
      shadows={settings.shadows ? 'percentage' : false}
      gl={{
        antialias: false, // MSAA/SMAA live in the composer, per tier
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: Boolean(capture),
      }}
      camera={{ fov: 35, near: 0.05, far: 200, position: [0, 0, 6] }}
      onCreated={(state) => {
        const { gl } = state;
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __three?: unknown }).__three = state;
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          inviteStore.getState().fallBackTo2d('context-lost');
        });
      }}
    >
      <FrameDriver />
      <RendererSettings />
      <TierMonitor />
      {children}
    </Canvas>
  );
}

function FrameDriver() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let readyFrames = 0;
    // Count every pass of a frame (scene + post), not just the composer's last quad.
    gl.info.autoReset = false;
    // Touch screens: the page scrolls over the canvas, so while reading it stays at a low rate
    // whatever the guest does (a full-rate scene under a scrolling page is what makes phones lag).
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const { phase, tier, lastInteraction, capture } = inviteStore.getState();
      if (capture === 'video') return; // the recorder renders each frame itself (below)
      // Capture mode: once the moment is published, hold the frame still so a screenshot or a
      // video frame never reads a half-drawn buffer.
      if (capture && window.__hadreen?.ready && ++readyFrames > 3) return;
      const idle = phase === 'content' && (touch || now - lastInteraction > 1500);
      const fps = idle ? (touch ? Math.min(20, TIER_SETTINGS[tier].idleFps) : TIER_SETTINGS[tier].idleFps) : 0;
      if (fps && now - last < 1000 / fps - 2) return;
      last = now;
      gl.info.reset();
      advance(now / 1000); // R3F's clock runs in seconds
    };
    raf = requestAnimationFrame(loop);
    publishProbe({
      frame: (introSeconds, clockSeconds) => {
        const intro = inviteStore.getState().intro;
        if (introSeconds !== null) intro?.seek(introSeconds);
        gl.info.reset();
        advance(clockSeconds);
      },
      renderInfo: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
      }),
    });
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

/** Tone mapping lives in the composer when post-processing runs, otherwise in the renderer. */
function RendererSettings() {
  const gl = useThree((s) => s.gl);
  const tier = useInvite((s) => s.tier);
  useEffect(() => {
    gl.toneMapping = TIER_SETTINGS[tier].post ? NoToneMapping : NeutralToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl, tier]);
  return null;
}

/** Steps the quality tier down (or back up) from measured frame rates while frames run uncapped. */
function TierMonitor() {
  const phase = useInvite((s) => s.phase);
  const capture = useInvite((s) => s.capture);
  if (capture || (phase !== 'gate' && phase !== 'opening')) return null;
  const { shiftTier, lockTier } = inviteStore.getState();
  return (
    <PerformanceMonitor
      ms={250}
      iterations={8}
      flipflops={3}
      onDecline={() => shiftTier(-1)}
      onIncline={() => shiftTier(1)}
      onFallback={() => lockTier()}
    />
  );
}
