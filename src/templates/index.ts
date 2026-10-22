import { TEMPLATE_IDS, type StyleTag, type TemplateId, type TemplateMeta } from '@/lib/invite/types';
import { blossomOud } from './blossom-oud/meta';
import { destinationLove } from './destination-love/meta';
import { dolceVita } from './dolce-vita/meta';
import { eternalRomance } from './eternal-romance/meta';
import { royalGold } from './royal-gold/meta';
import { sacredGarden } from './sacred-garden/meta';
import { whiteHouseHall } from './white-house-hall/meta';

/** Metadata only. 3D scenes are dynamic imports (Phase 2+), so this stays light. */
export const TEMPLATES: readonly TemplateMeta[] = [
  sacredGarden,
  blossomOud,
  dolceVita,
  royalGold,
  eternalRomance,
  destinationLove,
  whiteHouseHall,
];

/** The designs the public site shows: everything except venue-exclusive ones. */
export const PUBLIC_TEMPLATES: readonly TemplateMeta[] = TEMPLATES.filter((t) => !t.exclusive);

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? sacredGarden;
}

export const STYLE_TAGS: Record<StyleTag, { ar: string; en: string }> = {
  classic: { ar: 'كلاسيكي', en: 'Classic' },
  romantic: { ar: 'رومانسي', en: 'Romantic' },
  nature: { ar: 'طبيعة', en: 'Nature' },
  royal: { ar: 'ملكي', en: 'Royal' },
  travel: { ar: 'سفر', en: 'Travel' },
  modern: { ar: 'عصري', en: 'Modern' },
  oriental: { ar: 'شرقي', en: 'Oriental' },
};
