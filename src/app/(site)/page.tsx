import type { Metadata } from 'next';
import { buildSceneView } from '@/lib/invite/scene-view';
import type { SceneView } from '@/lib/invite/scene-types';
import { buildInviteView } from '@/lib/invite/view';
import { getPublicWedding } from '@/lib/wedding-cache';
import { copy } from '@/site/copy';
import { Faq } from '@/site/Faq';
import { FinalCta, SiteFooter } from '@/site/Footer';
import { Gallery } from '@/site/Gallery';
import { Hero } from '@/site/Hero';
import { Included } from '@/site/Included';
import { PhoneDemo } from '@/site/PhoneDemo';
import { Price } from '@/site/Price';
import { SiteHeader } from '@/site/SiteHeader';
import { SiteMotion } from '@/site/SiteMotion';
import { Ticker } from '@/site/Ticker';
import { PUBLIC_TEMPLATES } from '@/templates';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'حاضرين | دعوات زفاف تفاعلية ثلاثية الأبعاد' },
  description: copy.hero.lead,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'ar_IQ', title: 'حاضرين | دعوات زفاف تفاعلية', description: copy.hero.lead },
};

export default async function HomePage() {
  // The demo weddings feed the hero's live thumbnails (example names and dates).
  const demos = await Promise.all(
    PUBLIC_TEMPLATES.map(async (t) => {
      const w = await getPublicWedding(`demo-${t.id}`);
      return w ? buildSceneView(buildInviteView(w, null)) : null;
    }),
  );
  const views = demos.filter((v): v is SceneView => v !== null);

  return (
    <>
      <SiteMotion />
      <SiteHeader />
      <main>
        <Hero views={views} />
        <Ticker />
        <PhoneDemo />
        <Gallery />
        <Included />
        <Price />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
