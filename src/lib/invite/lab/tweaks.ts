import { createStore, useStore } from 'zustand';
import { useEffect } from 'react';

/**
 * Scene tweakables for the lab. A scene asks for a value with a default —
 *   const keyIntensity = useTweak('key light', 130, { min: 0, max: 400 });
 * — and gets the default everywhere except the lab, where a Leva control appears for it.
 * No Leva code reaches the invitation bundle.
 */
export type TweakValue = number | boolean | string;
export interface TweakSpec {
  value: TweakValue;
  min?: number;
  max?: number;
  step?: number;
}

interface TweakState {
  active: boolean;
  specs: Record<string, TweakSpec>;
  values: Record<string, TweakValue>;
}

export const tweakStore = createStore<TweakState>()(() => ({ active: false, specs: {}, values: {} }));

export function activateTweaks() {
  tweakStore.setState({ active: true });
}

export function setTweak(name: string, value: TweakValue) {
  tweakStore.setState((s) => ({ values: { ...s.values, [name]: value } }));
}

export function useTweak<T extends TweakValue>(name: string, value: T, range?: Omit<TweakSpec, 'value'>): T {
  const active = useStore(tweakStore, (s) => s.active);
  const current = useStore(tweakStore, (s) => s.values[name]);
  const { min, max, step } = range ?? {};
  useEffect(() => {
    if (!active) return;
    tweakStore.setState((s) => (s.specs[name] ? s : { specs: { ...s.specs, [name]: { value, min, max, step } } }));
  }, [active, name, value, min, max, step]);
  return active && current !== undefined && typeof current === typeof value ? (current as T) : value;
}
