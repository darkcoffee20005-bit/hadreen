'use client';

import { useEffect, useRef } from 'react';
import type { TemplateMeta } from '@/lib/invite/types';
import { Poster } from './Poster';
import { PREVIEWS } from './previews.data';

/**
 * A design's recorded opening as a looping, muted video that plays only while on screen (and not
 * at all under reduced motion). Falls back to the poster.
 */
export function PreviewMedia({ template, className = '' }: { template: TemplateMeta; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const has = PREVIEWS.includes(template.id);

  useEffect(() => {
    const el = video.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [has]);

  if (!has) return <Poster template={template} className={className} />;
  return (
    <span className={`relative block overflow-hidden rounded-[1.6rem] border border-gold/50 bg-emerald-deep shadow-2xl shadow-black/30 ${className}`}>
      <video ref={video} muted loop playsInline preload="none" poster={`/previews/${template.id}.jpg`} className="size-full object-cover" aria-hidden="true">
        <source src={`/previews/${template.id}.webm`} type="video/webm" />
        <source src={`/previews/${template.id}.mp4`} type="video/mp4" />
      </video>
    </span>
  );
}
