export const TEMPLATE_IDS = [
  'sacred-garden',
  'blossom-oud',
  'dolce-vita',
  'royal-gold',
  'eternal-romance',
  'destination-love',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Colours the DOM content uses. Every text/background pair is AA-checked in tests. */
export interface DomPalette {
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  accent: string;
  onAccent: string;
  gold: string; // decorative only
  goldInk: string; // gold that is safe for text on bg/surface
  line: string;
  band: string; // contrasting section background
  onBand: string;
}

export const DOM_TOKENS = [
  'bg',
  'surface',
  'ink',
  'inkSoft',
  'accent',
  'onAccent',
  'gold',
  'goldInk',
  'line',
  'band',
  'onBand',
] as const satisfies readonly (keyof DomPalette)[];

export interface PaletteTokens extends DomPalette {
  /** Template-specific colours for the 3D scene (Phase 3). */
  scene: Record<string, string>;
}

export interface PaletteVariant {
  id: string;
  nameAr: string;
  nameEn: string;
  tokens: Partial<DomPalette>;
  /** Scene colours this variant changes (merged over the template's). */
  scene?: Record<string, string>;
}

export type GateGesture = 'tap' | 'hold' | 'scratch';

export interface TemplateMeta {
  id: TemplateId;
  nameAr: string;
  nameEn: string;
  /** Webgency theme this template draws on. Internal reference only, never shown to guests. */
  inspiredBy: string;
  taglineAr: string;
  taglineEn: string;
  palette: PaletteTokens;
  paletteVariants: PaletteVariant[];
  music: { moodAr: string; moodEn: string; bpm: number; placeholder: string };
  intro: { duration: number };
  gate: {
    gesture: GateGesture;
    labelAr: string;
    labelEn: string;
    /** What the gate overlay shows above the scene: names and date (default), names only, or nothing visible. */
    header?: 'full' | 'names' | 'none';
  };
  closingAr: string;
  closingEn: string;
  /** Share-card style: light uses bg/ink, dark uses band/onBand. */
  og: 'light' | 'dark';
  budgetKB: number;
  styleTags: StyleTag[];
}

export type StyleTag = 'classic' | 'romantic' | 'nature' | 'royal' | 'travel' | 'modern' | 'oriental';
