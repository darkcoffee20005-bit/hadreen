'use client';

import { useEffect, useState } from 'react';
import { diagnostics } from '../capability';
import { dlog } from '../debug-log';
import { inviteStore, MILESTONES, useInvite, type Milestone } from '../machine';

/**
 * ?debug=1: what the invitation decided on this device and why, plus live frame rate. Meant for a
 * screenshot from a guest's phone when the 3D opening misbehaves.
 */
export default function DebugOverlay() {
  const path = useInvite((s) => s.path);
  const phase = useInvite((s) => s.phase);
  const tier = useInvite((s) => s.tier);
  const reason = useInvite((s) => s.reason2d);
  const progress = useInvite((s) => s.progress);
  const [fps, setFps] = useState(0);
  const [since] = useState(() => performance.now());
  const [phaseTimes, setPhaseTimes] = useState<string[]>([]);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    dlog(`gpu ${diagnostics.renderer} tier ${diagnostics.gpuTier} mobile ${diagnostics.isMobile} dpr ${window.devicePixelRatio} ${window.innerWidth}x${window.innerHeight}`);
  }, []);
  useEffect(() => {
    dlog(`path ${path} tier ${tier} reason ${reason ?? '-'}`);
  }, [path, tier, reason]);
  useEffect(() => {
    dlog(`progress ${(Object.keys(MILESTONES) as Milestone[]).map((k) => `${k}=${Math.round(progress[k] * 100)}`).join(' ')}`);
  }, [progress]);
  useEffect(() => {
    dlog(`phase ${phase}`);
    setPhaseTimes((t) => [...t, `${phase} ${((performance.now() - since) / 1000).toFixed(1)}s`]);
  }, [phase, since]);

  const lines = [
    `path ${path} · tier ${tier}${inviteStore.getState().tierLocked ? ' (locked)' : ''}`,
    `reason ${reason ?? '-'}`,
    `gpu ${diagnostics.renderer || '?'} · tier ${diagnostics.gpuTier ?? 'null'} · ${diagnostics.ms}ms`,
    `mobile ${diagnostics.isMobile} · reduced-motion ${diagnostics.reducedMotion} · dpr ${window.devicePixelRatio}`,
    `load ${(Object.keys(MILESTONES) as Milestone[]).map((k) => `${k} ${Math.round(progress[k] * 100)}`).join(' · ')}`,
    `fps ${fps}`,
    phaseTimes.join(' → '),
  ];

  return (
    <pre dir="ltr" className="pointer-events-none fixed left-2 top-2 z-[100] max-w-[calc(100vw-1rem)] whitespace-pre-wrap rounded bg-black/75 p-2 text-[10px] leading-snug text-lime-300">
      {lines.join('\n')}
    </pre>
  );
}
