'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';
import { inviteStore } from '../machine';

/**
 * Scroll choreography for the content page, once the guest reaches it:
 *  - Lenis smooth scrolling for wheels (touch scrolling stays native),
 *  - sections marked data-reveal rise into place,
 *  - the programme's gold line (data-draw-line) draws as you scroll past it.
 * Reduced motion: none of it, everything is simply there.
 */
export function Choreography({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let teardown: (() => void) | null = null;

    const start = () => {
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 36,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>('[data-draw-line]').forEach((line) => {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: { trigger: line.parentElement, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
            },
          );
        });
      });
      ScrollTrigger.refresh();
      teardown = () => {
        ctx.revert();
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    };

    // Start once the content phase begins (the gate covers the page until then).
    if (inviteStore.getState().phase === 'content') start();
    const unsubscribe = inviteStore.subscribe((s, prev) => {
      if (s.phase === 'content' && prev.phase !== 'content' && !teardown) start();
    });
    return () => {
      unsubscribe();
      teardown?.();
    };
  }, [enabled]);
  return null;
}
