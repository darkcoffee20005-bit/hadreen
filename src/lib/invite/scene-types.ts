import type { WeddingDateParts } from '@/lib/date/format';
import type { City } from '@/lib/geo';
import type { Lang } from '@/lib/lang';
import type { PaletteTokens, TemplateId } from './types';

/** What a 3D scene (or its 2D fallback) may show. Built once from the InviteView. */
export interface SceneView {
  templateId: TemplateId;
  lang: Lang;
  groom: string;
  bride: string;
  monogram: string;
  guestName: string | null;
  /** The guest's saved answer when they open their personal link again (null: none yet). */
  rsvpAttending: boolean | null;
  dateLine: string;
  timeLine: string;
  dateParts: WeddingDateParts;
  venueName: string;
  palette: PaletteTokens;
  origin: City | null;
  destination: City | null;
}

export interface SceneProps {
  view: SceneView;
}
