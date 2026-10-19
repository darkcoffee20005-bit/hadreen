'use client';

import { button, Leva, useControls } from 'leva';
import type { Schema as LevaSchema } from 'leva/dist/declarations/src/types';
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { inviteStore, useInvite } from '../machine';
import { TIERS, type Tier } from '../quality/tiers';
import { setTweak, tweakStore, type TweakSpec } from './tweaks';

/**
 * The lab: the real invitation with a control panel. Tier, phase controls, the opening on a
 * scrubber, and every value the scene exposes through useTweak(). Loaded only with ?lab=1 where
 * the lab is enabled (never in a guest's bundle).
 */
export default function LabPanel() {
  const tier = useInvite((s) => s.tier);
  const phase = useInvite((s) => s.phase);
  const path = useInvite((s) => s.path);
  const duration = useInvite((s) => s.intro?.duration ?? 8);

  const reload = (params: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    window.location.assign(url);
  };

  const [, setEngine] = useControls(
    'Engine',
    () => ({
      tier: { value: tier, options: TIERS as unknown as Tier[], onChange: (v: Tier) => inviteStore.getState().forceTier(v), transient: false },
      phase: { value: phase, editable: false },
      path: { value: path, editable: false },
      open: button(() => inviteStore.getState().open()),
      skip: button(() => inviteStore.getState().skip()),
      'to content': button(() => inviteStore.getState().jumpToContent()),
      replay: button(() => inviteStore.getState().replay()),
      '3D path': button(() => reload({ force2d: null, lab: '1' })),
      '2D path': button(() => reload({ force2d: '1', lab: '1' })),
    }),
    [],
  );
  useEffect(() => setEngine({ tier, phase, path }), [setEngine, tier, phase, path]);

  useControls(
    'Opening',
    () => ({
      seconds: {
        value: 0,
        min: 0,
        max: Math.max(1, duration),
        step: 0.01,
        onChange: (v: number, _path: string, ctx: { initial: boolean }) => {
          if (!ctx.initial) inviteStore.getState().scrubIntro(v);
        },
      },
    }),
    [duration],
  );

  const specs = useStore(tweakStore, (s) => s.specs);
  const schema = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(specs).map(([name, spec]: [string, TweakSpec]) => [
          name,
          { ...spec, onChange: (v: TweakSpec['value']) => setTweak(name, v), transient: false },
        ]),
      ),
    [specs],
  );
  useControls('Scene', () => schema as unknown as LevaSchema, [schema]);

  return (
    <div dir="ltr" lang="en">
      <Leva collapsed={false} titleBar={{ title: 'Hadreen lab' }} />
    </div>
  );
}
