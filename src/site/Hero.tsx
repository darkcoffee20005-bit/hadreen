import { preload } from 'react-dom';
import type { SceneView } from '@/lib/invite/scene-types';
import { PUBLIC_TEMPLATES } from '@/templates';
import { PREVIEWS } from './previews.data';
import { copy } from './copy';
import { HeroInteractive } from './HeroInteractive';

/**
 * The hero: the headline is plain server-rendered DOM (the LCP), the carousel of live designs
 * mounts behind it once the page is idle.
 */
export function Hero({ views }: { views: SceneView[] }) {
  // The front poster is the page's largest paint: fetch it with the HTML, not after the scripts.
  if (PREVIEWS.includes(PUBLIC_TEMPLATES[0]!.id)) preload(`/previews/${PUBLIC_TEMPLATES[0]!.id}.jpg`, { as: 'image', fetchPriority: 'high' });
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate min-h-svh overflow-hidden bg-emerald-deep text-ivory">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_50%_45%,#0e4a38_0%,#072a20_55%,#041a13_100%)]" />
      <HeroInteractive views={views}>
        <p className="text-sm tracking-wide text-gold">{copy.hero.eyebrow}</p>
        <h1 id="hero-title" className="mt-3 text-balance font-display text-[clamp(2.6rem,8.5vw,4.6rem)] leading-display text-ivory [text-shadow:0_4px_30px_rgba(0,0,0,0.45)]">
          {copy.hero.title}
        </h1>
        <p className="mt-4 max-w-md font-serif text-lg leading-loose text-ivory/85 max-lg:mx-auto">{copy.hero.lead}</p>
      </HeroInteractive>
    </section>
  );
}
