'use client';

import { useEffect, useRef, useState } from 'react';
import { TEMPLATES } from '@/templates';
import { copy } from './copy';
import { PreviewMedia } from './PreviewMedia';
import { SectionTitle } from './ui';

const SCREEN_W = 390;
const SCREEN_H = 844;

/**
 * A phone that tilts with the pointer, running a real demo invitation in an iframe. On phones
 * and touch screens (where a second WebGL page would be too heavy) it plays the recorded preview.
 */
export function PhoneDemo() {
  const [index, setIndex] = useState(3); // Royal Gold first: the brand's emerald and gold
  const [live, setLive] = useState(false);
  const [inView, setInView] = useState(false);
  const section = useRef<HTMLElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);
  const template = TEMPLATES[index]!;

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    setLive(desktop);
    const fit = () => setScale(Math.min(0.78, (Math.min(window.innerWidth - 64, 340) / SCREEN_W)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Load the live demo only once the section comes near (it's a whole invitation).
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setInView(true), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = phone.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / r.width;
    const y = (e.clientY - (r.top + r.height / 2)) / r.height;
    el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
  };
  const onPointerLeave = () => {
    phone.current?.style.setProperty('--ry', '-8deg');
    phone.current?.style.setProperty('--rx', '3deg');
  };

  return (
    <section
      id="try"
      ref={section}
      aria-labelledby="try-title"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative overflow-hidden bg-[radial-gradient(80%_60%_at_70%_40%,#fffaf0,#f3ead9)] px-5 py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_auto]">
        <div>
          <SectionTitle id="try-title" title={copy.phone.title} lead={copy.phone.lead} />
          <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2" aria-label={copy.hero.pick}>
            {TEMPLATES.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    i === index ? 'border-emerald bg-emerald text-ivory' : 'border-line bg-paper text-ink hover:border-gold'
                  }`}
                >
                  {t.nameAr}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center">
            <a href={`/i/demo-${template.id}`} className="font-medium text-gold-ink underline-offset-4 hover:underline">
              {copy.phone.open} ←
            </a>
          </p>
          <p className="mt-3 text-center text-xs text-ink-soft">{copy.phone.note}</p>
        </div>

        <div className="flex justify-center" data-reveal>
          <div
            ref={phone}
            className="site-phone relative rounded-[3.2rem] bg-[#0d0f0e] p-3 shadow-[0_50px_80px_-30px_rgba(11,61,46,0.55),0_0_0_1.5px_#c9a96e,inset_0_0_0_2px_#2a2d2b]"
            style={{ ['--ry' as string]: '-8deg', ['--rx' as string]: '3deg', width: SCREEN_W * scale + 24 }}
          >
            <div className="relative overflow-hidden rounded-[2.5rem] bg-emerald-deep" style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}>
              {live && inView ? (
                <iframe
                  key={template.id}
                  title={`دعوة تجريبية: ${template.nameAr}`}
                  src={`/i/demo-${template.id}`}
                  loading="lazy"
                  className="absolute left-0 top-0 origin-top-left border-0"
                  style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}
                  allow="accelerometer; gyroscope; autoplay"
                />
              ) : (
                <PreviewMedia template={template} className="size-full rounded-none border-0" />
              )}
            </div>
            <span aria-hidden="true" className="absolute left-1/2 top-5 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          </div>
        </div>
      </div>
    </section>
  );
}
