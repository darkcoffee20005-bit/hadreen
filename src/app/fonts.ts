import { Amiri, Aref_Ruqaa, Cormorant_Garamond, Jost, Pinyon_Script, Tajawal } from 'next/font/google';

// Self-hosted at build time by next/font, with size-adjusted fallbacks (no layout shift).
// `subsets` only sets what is preloaded: Arabic. Latin glyphs (handles, English) load on demand.
export const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-aref',
  display: 'swap',
});
export const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });
export const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: false, // English weddings only
});
export const pinyon = Pinyon_Script({ subsets: ['latin'], weight: '400', variable: '--font-pinyon', display: 'swap', preload: false });
export const jost = Jost({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jost', display: 'swap', preload: false });

export const arabicFontVars = `${arefRuqaa.variable} ${amiri.variable} ${tajawal.variable}`;
export const allFontVars = `${arabicFontVars} ${cormorant.variable} ${pinyon.variable} ${jost.variable}`;
