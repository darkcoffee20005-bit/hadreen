import type { ComponentType } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import type { TemplateId } from '@/lib/invite/types';

/** A template's 2D path: its gate (with a CSS opening of OPENING_MS) and its living backdrop. */
export interface FallbackModule {
  Gate2D: ComponentType<{ view: SceneView; opening: boolean }>;
  Backdrop2D: ComponentType<{ view: SceneView }>;
  OPENING_MS: number;
}

/** Lazy, per template: the 2D path never downloads three.js or another template's art. */
export const FALLBACK_LOADERS: Record<TemplateId, () => Promise<FallbackModule>> = {
  'sacred-garden': () => import('./sacred-garden/Fallback2D'),
  'blossom-oud': () => import('./blossom-oud/Fallback2D'),
  'dolce-vita': () => import('./dolce-vita/Fallback2D'),
  'royal-gold': () => import('./royal-gold/Fallback2D'),
  'eternal-romance': () => import('./eternal-romance/Fallback2D'),
  'destination-love': () => import('./destination-love/Fallback2D'),
  'old-money': () => import('./old-money/Fallback2D'),
  'white-house-hall': () => import('./white-house-hall/Fallback2D'),
};
