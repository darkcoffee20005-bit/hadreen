export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function dirOf(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
