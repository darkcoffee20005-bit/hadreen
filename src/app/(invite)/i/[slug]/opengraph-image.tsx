import { ImageResponse } from 'next/og';
import { formatWeddingDate } from '@/lib/date/format';
import { shapeLine } from '@/lib/og/shape';
import { resolvePalette } from '@/lib/palette';
import { SLUG_RE } from '@/lib/validation/patterns';
import { getPublicWedding } from '@/lib/wedding-cache';
import { getTemplate } from '@/templates';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'دعوة زفاف';

/** Share card in the template's palette. All text is HarfBuzz-shaped SVG (see lib/og/shape). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = SLUG_RE.test(slug) ? await getPublicWedding(slug) : null;
  const template = getTemplate(w?.template ?? 'royal-gold');
  const p = resolvePalette(template, w?.paletteOverrides);
  const dark = template.og === 'dark';
  const bg = dark ? p.band : p.bg;
  const fg = dark ? p.onBand : p.ink;
  const names = dark ? p.gold : p.goldInk;
  const ar = (w?.lang ?? 'ar') === 'ar';

  const [nameLine, dateLine, brand] = await Promise.all([
    shapeLine(w ? (ar ? `${w.groomName} و${w.brideName}` : `${w.groomName} & ${w.brideName}`) : 'حاضرين', {
      font: ar ? 'ArefRuqaa-700' : 'PinyonScript-400',
      size: 132,
      color: names,
      rtl: ar,
    }),
    shapeLine(w ? formatWeddingDate(new Date(w.dateTimeUtc), w.lang) : 'دعوات زفاف تفاعلية', {
      font: ar ? 'Amiri-400' : 'CormorantGaramond-500',
      size: 46,
      color: fg,
      rtl: ar,
    }),
    shapeLine(ar ? 'دعوة من حاضرين' : 'An invitation by Hadreen', {
      font: ar ? 'Tajawal-500' : 'CormorantGaramond-500',
      size: 26,
      color: fg,
      rtl: ar,
    }),
  ]);

  const fit = (line: { width: number; height: number }, max: number) => {
    const k = Math.min(1, max / line.width);
    return { width: Math.round(line.width * k), height: Math.round(line.height * k) };
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 28, right: 28, bottom: 28, left: 28, border: `2px solid ${p.gold}`, borderRadius: 28, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 40, right: 40, bottom: 40, left: 40, border: `1px solid ${p.gold}`, opacity: 0.55, borderRadius: 20, display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 120, height: 1, background: p.gold }} />
          <div style={{ width: 14, height: 14, border: `1.5px solid ${p.gold}`, transform: 'rotate(45deg)' }} />
          <div style={{ width: 120, height: 1, background: p.gold }} />
        </div>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={nameLine.src} {...fit(nameLine, 1000)} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={dateLine.src} {...fit(dateLine, 980)} style={{ marginTop: 12 }} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={brand.src} {...fit(brand, 600)} style={{ position: 'absolute', bottom: 58, opacity: 0.75 }} />
      </div>
    ),
    { ...size, headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
