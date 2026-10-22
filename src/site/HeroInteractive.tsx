'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { detectCapability } from '@/lib/invite/capability';
import type { Tier } from '@/lib/invite/quality/tiers';
import type { SceneView } from '@/lib/invite/scene-types';
import { TEMPLATES } from '@/templates';
import { copy } from './copy';
import { heroStore, useHero } from './hero-store';
import { PosterFan } from './PosterFan';
import { InstagramButton } from './ui';

const HeroStage = dynamic(() => import('./HeroStage'), { ssr: false });

const AUTO_MS = 6500;
const IDLE_AFTER_TOUCH_MS = 10_000;

/**
 * The hero's interactive half: the design picker and calls to action (DOM, keyboard friendly) and
 * the carousel behind them — live 3D thumbnails where the device can, painted posters otherwise.
 */
export function HeroInteractive({ views, children }: { views: SceneView[]; children: React.ReactNode }) {
  const active = useHero((s) => s.active);
  // Posters paint first (server-rendered, the page's largest image); live 3D cards fade in over
  // them once the device has been checked.
  const [stage, setStage] = useState<{ mode: 'posters' | '3d'; tier: Tier }>({ mode: 'posters', tier: 'low' });
  const [postersShown, setPostersShown] = useState(true);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLDivElement>(null);
  const template = TEMPLATES[active]!;

  // Decide once the page is idle: the headline paints first, the 3D comes after.
  useEffect(() => {
    heroStore.setState({ count: TEMPLATES.length });
    let cancelled = false;
    const run = () =>
      detectCapability(window.location.search).then((cap) => {
        // Seven live scenes at once are a desktop luxury: phones and tablets keep the posters
        // (each design still opens in full 3D on its own page).
        const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
        if (cancelled || cap.path !== '3d' || !desktop || cap.tier === 'low') return;
        setStage({ mode: '3d', tier: cap.tier });
        window.setTimeout(() => !cancelled && setPostersShown(false), 2200);
      });
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400));
    const id = idle(() => void run());
    return () => {
      cancelled = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
    };
  }, []);

  // Render only while the hero is on screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Gentle auto-advance, paused after the visitor touches anything, off under reduced motion.
  useEffect(() => {
    if (!visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const s = heroStore.getState();
      if (!document.hidden && performance.now() - s.touchedAt > IDLE_AFTER_TOUCH_MS) s.step(1, false);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [visible]);

  // Phones: text, then the carousel in its own band, then the picker. Desktop: the carousel
  // fills the hero behind a text column on the right.
  return (
    <div ref={section} className="relative min-h-svh">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 pb-8 pt-24 max-lg:relative lg:justify-center lg:pt-16">
        <div className="relative z-10 text-center lg:w-[44%] lg:text-start">{children}</div>

        <div className="max-lg:relative max-lg:-mx-5 max-lg:h-[min(52svh,460px)] lg:absolute lg:inset-0 lg:-z-10">
          {postersShown && (
            <div className={`absolute inset-0 transition-opacity duration-1000 ${stage.mode === '3d' ? 'opacity-0' : 'opacity-100'}`}>
              <PosterFan />
            </div>
          )}
          {stage.mode === '3d' && <HeroStage views={views} tier={stage.tier} visible={visible} />}
        </div>

        <div className="relative z-10 text-center lg:mt-10 lg:w-[44%] lg:text-start">
          <p className="text-xs text-ivory/60">{copy.hero.pick}</p>
          <div aria-live="polite" className="mt-1">
            <p className="font-serif text-2xl text-gold">{template.nameAr}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ivory/75 lg:mx-0">{template.taglineAr}</p>
          </div>
          <ul className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start" aria-label={copy.hero.pick}>
            {TEMPLATES.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={i === active}
                  onClick={() => heroStore.getState().setActive(i)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    i === active ? 'border-gold bg-gold text-emerald-deep' : 'border-ivory/25 text-ivory/80 hover:border-gold/70 hover:text-ivory'
                  }`}
                >
                  {t.nameAr}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href={`/i/demo-${template.id}`}
              className="inline-flex items-center justify-center rounded-full bg-ivory px-6 py-3 font-medium text-emerald-deep shadow-[0_10px_30px_-12px_rgba(248,243,232,0.6)] transition hover:bg-white"
            >
              {copy.view}
            </a>
            <InstagramButton variant="outline" />
          </div>
          {stage.mode === '3d' && <p className="mt-4 hidden text-xs text-ivory/50 lg:block">{copy.hero.dragHint}</p>}
        </div>
      </div>
    </div>
  );
}
