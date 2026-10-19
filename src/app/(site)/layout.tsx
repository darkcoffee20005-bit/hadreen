import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/env';
import { arabicFontVars } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'حاضرين | دعوات زفاف تفاعلية', template: '%s | حاضرين' },
  description: 'دعوات زفاف رقمية تفاعلية ثلاثية الأبعاد، بالعربي، وبرابط خاص لكل عائلة.',
};

export const viewport: Viewport = { themeColor: '#0b3d2e' };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabicFontVars}>
      <body className="bg-ivory text-ink antialiased">{children}</body>
    </html>
  );
}
