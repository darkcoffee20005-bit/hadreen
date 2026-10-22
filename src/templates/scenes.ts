import type { ComponentType } from 'react';
import type { TemplateId } from '@/lib/invite/types';
import type { SceneProps } from '@/lib/invite/scene-types';

type SceneModule = { default: ComponentType<SceneProps> };

/**
 * Lazy 3D scene per template. Each entry is its own chunk, so a guest only downloads the scene
 * of their invitation.
 */
export const SCENE_LOADERS: Record<TemplateId, () => Promise<SceneModule>> = {
  'sacred-garden': () => import('./sacred-garden/Scene'),
  'blossom-oud': () => import('./blossom-oud/Scene'),
  'dolce-vita': () => import('./dolce-vita/Scene'),
  'royal-gold': () => import('./royal-gold/Scene'),
  'eternal-romance': () => import('./eternal-romance/Scene'),
  'destination-love': () => import('./destination-love/Scene'),
  'old-money': () => import('./old-money/Scene'),
  'white-house-hall': () => import('./white-house-hall/Scene'),
};
