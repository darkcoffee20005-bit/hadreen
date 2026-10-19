import type { Lang } from '@/lib/lang';

/** WebGL font subsets (built by `pnpm static`) and the matching DOM font variables. */
export type TextRole = 'display' | 'serif' | 'ui';

const WEBGL: Record<Lang, Record<TextRole, string>> = {
  ar: {
    display: '/fonts/webgl/ArefRuqaa-700.woff',
    serif: '/fonts/webgl/Amiri-400.woff',
    ui: '/fonts/webgl/Tajawal-500.woff',
  },
  en: {
    display: '/fonts/webgl/PinyonScript-400.woff',
    serif: '/fonts/webgl/CormorantGaramond-500.woff',
    ui: '/fonts/webgl/CormorantGaramond-500.woff',
  },
};

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

export function webglFont(lang: Lang, role: TextRole): string {
  return WEBGL[lang][role];
}

export function cssFontVar(lang: Lang, role: TextRole): [string, string] {
  return CSS_VAR[lang][role];
}
