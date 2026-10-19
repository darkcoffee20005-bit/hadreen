import { ImageResponse } from 'next/og';
import { shapeLine } from '@/lib/og/shape';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'حاضرين: دعوات زفاف تفاعلية';

const EMERALD = '#0b3d2e';
const DEEP = '#072a20';
const GOLD = '#c9a96e';
const IVORY = '#f8f3e8';

/** The site's share card: the brand in Aref Ruqaa over emerald, HarfBuzz-shaped (see lib/og/shape). */
export default async function Image() {
  const [brand, line, handle] = await Promise.all([
    shapeLine('حاضرين', { font: 'ArefRuqaa-700', size: 190, color: GOLD, rtl: true }),
    shapeLine('دعوات زفاف تفاعلية ثلاثية الأبعاد', { font: 'Amiri-400', size: 52, color: IVORY, rtl: true }),
    shapeLine('@7adre.n', { font: 'Tajawal-500', size: 30, color: GOLD, rtl: false }),
  ]);
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
          background: `radial-gradient(80% 90% at 50% 40%, ${EMERALD}, ${DEEP})`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 28, right: 28, bottom: 28, left: 28, border: `2px solid ${GOLD}`, borderRadius: 28, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 40, right: 40, bottom: 40, left: 40, border: `1px solid ${GOLD}`, opacity: 0.5, borderRadius: 20, display: 'flex' }} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={brand.src} width={brand.width} height={brand.height} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0 22px' }}>
          <div style={{ width: 140, height: 1, background: GOLD }} />
          <div style={{ width: 14, height: 14, border: `1.5px solid ${GOLD}`, transform: 'rotate(45deg)' }} />
          <div style={{ width: 140, height: 1, background: GOLD }} />
        </div>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={line.src} width={line.width} height={line.height} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={handle.src} width={handle.width} height={handle.height} style={{ position: 'absolute', bottom: 60, opacity: 0.85 }} />
      </div>
    ),
    { ...size, headers: { 'cache-control': 'public, max-age=86400' } },
  );
}
