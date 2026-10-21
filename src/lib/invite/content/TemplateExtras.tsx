'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { TemplateId } from '../types';
import type { InviteView } from '../view';

type ExtrasProps = { view: InviteView };

/** Decorative per-template extras after the hero; client-only, loaded for this template only. */
const EXTRAS: Record<TemplateId, ComponentType<ExtrasProps>> = {
  'sacred-garden': dynamic(() => import('@/templates/sacred-garden/Extras'), { ssr: false }),
  'blossom-oud': dynamic(() => import('@/templates/blossom-oud/Extras'), { ssr: false }),
  'dolce-vita': dynamic(() => import('@/templates/dolce-vita/Extras'), { ssr: false }),
  'royal-gold': dynamic(() => import('@/templates/royal-gold/Extras'), { ssr: false }),
  'eternal-romance': dynamic(() => import('@/templates/eternal-romance/Extras'), { ssr: false }),
  'destination-love': dynamic(() => import('@/templates/destination-love/Extras'), { ssr: false }),
  'old-money': dynamic(() => import('@/templates/old-money/Extras'), { ssr: false }),
};

export function TemplateExtras({ view }: ExtrasProps) {
  const Extras = EXTRAS[view.template.id];
  return <Extras view={view} />;
}
