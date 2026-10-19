import { createStore, useStore } from 'zustand';

/** Which design the hero is showing; shared by the 3D carousel and the DOM picker. */
interface HeroState {
  active: number;
  count: number;
  /** Last time the visitor dragged, tapped or picked (ms), to pause the auto-advance. */
  touchedAt: number;
  setActive(index: number, byUser?: boolean): void;
  step(direction: 1 | -1, byUser?: boolean): void;
}

export const heroStore = createStore<HeroState>()((set, get) => ({
  active: 0,
  count: 6,
  touchedAt: 0,
  setActive: (index, byUser = true) => {
    const n = get().count;
    set({ active: ((index % n) + n) % n, ...(byUser ? { touchedAt: performance.now() } : {}) });
  },
  step: (direction, byUser = true) => get().setActive(get().active + direction, byUser),
}));

export function useHero<T>(selector: (s: HeroState) => T): T {
  return useStore(heroStore, selector);
}
