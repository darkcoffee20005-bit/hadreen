import { createStore, useStore } from 'zustand';
import type { CaptureMoment } from './capture';
import type { Reason2D } from './capability';
import { stepTier, type Tier } from './quality/tiers';

/**
 * The invitation's state machine.
 *
 *   boot → loading → gate → opening → handoff → content
 *
 * `path` is decided once by the capability check ('3d' or '2d') and can drop from 3D to 2D at
 * any phase (chunk failure, lost WebGL context); the phase carries on unchanged.
 */
export type Phase = 'boot' | 'loading' | 'gate' | 'opening' | 'handoff' | 'content';
export type Path = 'pending' | '3d' | '2d';

/** Loading milestones and their weight in the progress ring. Progress is never faked. */
export const MILESTONES = { chunk: 0.25, fonts: 0.15, assets: 0.4, shaders: 0.1, audio: 0.1 } as const;
export type Milestone = keyof typeof MILESTONES;

export interface IntroController {
  /** Seconds. */
  duration: number;
  play(onComplete: () => void): void;
  /** Jump to the end; play()'s onComplete still fires once. */
  skip(): void;
  /** Capture mode: hold the opening at a given second. */
  seek(seconds: number): void;
}

export interface InviteState {
  path: Path;
  reason2d: Reason2D | null;
  tier: Tier;
  tierLocked: boolean;
  phase: Phase;
  progress: Record<Milestone, number>;
  intro: IntroController | null;
  capture: CaptureMoment | null;
  /** 0..1 scroll position of the content page, for scroll-driven ambient scenes. */
  scroll: number;
  /** Last time the guest scrolled or moved the pointer (ms), for the idle frame cap. */
  lastInteraction: number;
  /** Incremented to fire the RSVP particle burst; origin in viewport fractions. */
  burst: { id: number; x: number; y: number };
  /** Incremented each time the guest's answer is saved, so scenes can react (tear a stub…). */
  rsvp: { id: number; attending: boolean | null };
}

export interface InviteActions {
  choosePath(path: '3d' | '2d', tier: Tier, reason?: Reason2D | null): void;
  fallBackTo2d(reason: Reason2D): void;
  shiftTier(direction: -1 | 1): void;
  lockTier(): void;
  /** Lab: pin a tier (the performance monitor stops changing it). */
  forceTier(tier: Tier): void;
  setProgress(milestone: Milestone, value: number): void;
  completeLoading(): void;
  registerIntro(intro: IntroController | null): void;
  open(): void;
  skip(): void;
  finishOpening(): void;
  finishHandoff(): void;
  /** Straight to the content (keyboard "skip to details"), from any phase. */
  jumpToContent(): void;
  /** Lab: hold the opening at `seconds` (from the gate or mid-opening). */
  scrubIntro(seconds: number): void;
  /** Lab: back to the closed gate, scene rewound. */
  replay(): void;
  setCapture(moment: CaptureMoment | null): void;
  setScroll(value: number): void;
  touch(): void;
  fireBurst(x: number, y: number): void;
  announceRsvp(attending: boolean): void;
  reset(): void;
}

const initial: InviteState = {
  path: 'pending',
  reason2d: null,
  tier: 'medium',
  tierLocked: false,
  phase: 'boot',
  progress: { chunk: 0, fonts: 0, assets: 0, shaders: 0, audio: 0 },
  intro: null,
  capture: null,
  scroll: 0,
  lastInteraction: 0,
  burst: { id: 0, x: 0.5, y: 0.5 },
  rsvp: { id: 0, attending: null },
};

export function totalProgress(progress: Record<Milestone, number>): number {
  return (Object.keys(MILESTONES) as Milestone[]).reduce(
    (sum, key) => sum + MILESTONES[key] * Math.min(1, Math.max(0, progress[key])),
    0,
  );
}

export function createInviteStore() {
  return createStore<InviteState & InviteActions>()((set, get) => ({
    ...initial,

    choosePath: (path, tier, reason = null) =>
      set({ path, tier, reason2d: reason, phase: path === '3d' ? 'loading' : 'gate' }),

    fallBackTo2d: (reason) => {
      const { path, phase } = get();
      if (path === '2d') return;
      let next: Phase = phase;
      if (phase === 'boot' || phase === 'loading') next = 'gate';
      // Mid-opening there is nothing to resume in 2D: go straight to the content.
      else if (phase === 'opening' || phase === 'handoff') next = 'content';
      set({ path: '2d', reason2d: reason, phase: next });
    },

    shiftTier: (direction) => {
      const { tier, tierLocked } = get();
      if (!tierLocked) set({ tier: stepTier(tier, direction) });
    },
    lockTier: () => set({ tierLocked: true }),
    forceTier: (tier) => set({ tier, tierLocked: true }),

    setProgress: (milestone, value) => set((s) => ({ progress: { ...s.progress, [milestone]: Math.max(s.progress[milestone], value) } })),

    completeLoading: () => {
      if (get().phase === 'loading') set({ phase: 'gate' });
    },

    registerIntro: (intro) => set({ intro }),

    open: () => {
      const { phase, path, intro } = get();
      if (phase !== 'gate') return;
      if (path === '3d' && intro) {
        set({ phase: 'opening' });
        intro.play(() => get().finishOpening());
      } else {
        set({ phase: 'opening' }); // the 2D gate plays its own short CSS opening
      }
    },

    skip: () => {
      const { phase, intro } = get();
      if (phase !== 'opening') return;
      if (intro) intro.skip();
      else get().finishOpening();
    },

    finishOpening: () => {
      if (get().phase === 'opening') set({ phase: 'handoff' });
    },

    finishHandoff: () => {
      if (get().phase === 'handoff') set({ phase: 'content' });
    },

    jumpToContent: () => {
      const { phase, intro } = get();
      if (phase === 'opening' && intro) intro.skip();
      set({ phase: 'content' });
    },

    scrubIntro: (seconds) => {
      const { phase, intro } = get();
      if (!intro || (phase !== 'gate' && phase !== 'opening')) return;
      intro.seek(Math.min(intro.duration, Math.max(0, seconds)));
      if (phase === 'gate') set({ phase: 'opening' });
    },

    replay: () => {
      const { intro, path } = get();
      if (path !== '3d' || !intro) return;
      intro.seek(0);
      set({ phase: 'gate', scroll: 0 });
    },

    setCapture: (capture) => set({ capture }),
    setScroll: (scroll) => set({ scroll }),
    touch: () => set({ lastInteraction: performance.now() }),
    fireBurst: (x, y) => set((s) => ({ burst: { id: s.burst.id + 1, x, y } })),
    announceRsvp: (attending) => set((s) => ({ rsvp: { id: s.rsvp.id + 1, attending } })),
    reset: () => set({ ...initial }),
  }));
}

export type InviteStore = ReturnType<typeof createInviteStore>;

/** One invitation per page, so one store per page. */
export const inviteStore = createInviteStore();

export function useInvite<T>(selector: (state: InviteState & InviteActions) => T): T {
  return useStore(inviteStore, selector);
}
