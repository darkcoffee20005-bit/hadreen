import type { Lang } from '@/lib/lang';

/** The DOM font variables 3D text draws with (canvas text uses the browser's own shaper). */
export type TextRole = 'display' | 'serif' | 'ui';

const CSS_VAR: Record<Lang, Record<TextRole, [variable: string, fallback: string]>> = {
  ar: {
    display: ['--font-aref', 'serif'],
    serif: ['--font-amiri', 'serif'],
    ui: ['--font-tajawal', 'sans-serif'],
  },
  en: {
    display: ['--font-pinyon', 'cursive'],
    serif: ['--font-cormorant', 'serif'],
    ui: ['--font-jost', 'sans-serif'],
  },
};

export function cssFontVar(lang: Lang, role: TextRole): [string, string] {
  return CSS_VAR[lang][role];
}
