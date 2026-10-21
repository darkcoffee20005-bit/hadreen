import { HEX_RE } from '@/lib/validation/patterns';
import { DOM_TOKENS, type DomPalette, type PaletteTokens, type TemplateMeta } from '@/lib/invite/types';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Foreground/background pairs that carry text. All must reach AA (4.5:1). */
export const TEXT_PAIRS: ReadonlyArray<readonly [keyof DomPalette, keyof DomPalette]> = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['inkSoft', 'bg'],
  ['inkSoft', 'surface'],
  ['goldInk', 'bg'],
  ['goldInk', 'surface'],
  ['onAccent', 'accent'],
  ['onBand', 'band'],
];

export interface ContrastIssue {
  fg: keyof DomPalette;
  bg: keyof DomPalette;
  ratio: number;
}

export function contrastIssues(palette: DomPalette, min = 4.5): ContrastIssue[] {
  return TEXT_PAIRS.flatMap(([fg, bg]) => {
    const ratio = contrastRatio(palette[fg], palette[bg]);
    return ratio < min ? [{ fg, bg, ratio: Math.round(ratio * 100) / 100 }] : [];
  });
}

/** Stored in Wedding.paletteOverrides: a curated variant id plus any individual colours. */
export interface PaletteOverrides extends Partial<DomPalette> {
  variant?: string;
}

export function readOverrides(value: unknown): PaletteOverrides {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const out: PaletteOverrides = {};
  if (typeof raw.variant === 'string') out.variant = raw.variant;
  for (const key of DOM_TOKENS) {
    const v = raw[key];
    if (typeof v === 'string' && HEX_RE.test(v)) out[key] = v;
  }
  return out;
}

export function resolvePalette(meta: TemplateMeta, overrides: unknown): PaletteTokens {
  const o = readOverrides(overrides);
  const variant = meta.paletteVariants.find((v) => v.id === o.variant);
  const { variant: _ignored, ...colours } = o;
  return { ...meta.palette, ...variant?.tokens, ...colours, scene: { ...meta.palette.scene, ...variant?.scene } };
}

/** CSS custom properties consumed by Tailwind's `inv-*` colours (see globals.css). */
export function paletteCssVars(p: DomPalette): Record<`--c-${string}`, string> {
  return {
    '--c-bg': p.bg,
    '--c-surface': p.surface,
    '--c-ink': p.ink,
    '--c-ink-soft': p.inkSoft,
    '--c-accent': p.accent,
    '--c-on-accent': p.onAccent,
    '--c-gold': p.gold,
    '--c-gold-ink': p.goldInk,
    '--c-line': p.line,
    '--c-band': p.band,
    '--c-on-band': p.onBand,
  };
}
