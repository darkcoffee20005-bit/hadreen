import type { Viewport } from 'next';
import { dirOf } from '@/lib/lang';
import { SLUG_RE } from '@/lib/validation/patterns';
import { getPublicWedding } from '@/lib/wedding-cache';
import { paletteCssVars, resolvePalette } from '@/lib/palette';
import { getTemplate } from '@/templates';
import { allFontVars } from '../../../fonts';
import '../../../globals.css';

type Params = Promise<{ slug: string }>;

async function weddingFor(params: Params) {
  const { slug } = await params;
  return SLUG_RE.test(slug) ? getPublicWedding(slug) : null;
}

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const w = await weddingFor(params);
  const palette = w ? resolvePalette(getTemplate(w.template), w.paletteOverrides) : null;
  return { themeColor: palette?.band ?? '#0b3d2e' };
}

/** Root layout for invitations: <html lang/dir> follows the wedding's language. */
export default async function InviteLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const wedding = await weddingFor(params);
  const lang = wedding?.lang ?? 'ar';
  const palette = wedding ? resolvePalette(getTemplate(wedding.template), wedding.paletteOverrides) : null;
  return (
    <html lang={lang} dir={dirOf(lang)} className={allFontVars}>
      <body className="antialiased" style={palette ? { ...(paletteCssVars(palette) as React.CSSProperties), background: palette.band } : undefined}>
        {children}
      </body>
    </html>
  );
}
