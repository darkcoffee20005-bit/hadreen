import type { Viewport } from 'next';
import { dirOf } from '@/lib/lang';
import { SLUG_RE } from '@/lib/validation/patterns';
import { getPublicWedding } from '@/lib/wedding-cache';
import { resolvePalette } from '@/lib/palette';
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
  return { themeColor: palette?.bg ?? '#f8f3e8' };
}

/** Root layout for invitations: <html lang/dir> follows the wedding's language. */
export default async function InviteLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const lang = (await weddingFor(params))?.lang ?? 'ar';
  return (
    <html lang={lang} dir={dirOf(lang)} className={allFontVars}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
