'use client';

import { useMemo, useState } from 'react';
import { INSTAGRAM_URL } from '@/lib/links';
import type { StyleTag } from '@/lib/invite/types';
import { PUBLIC_TEMPLATES } from '@/templates';
import { copy } from './copy';
import { PreviewMedia } from './PreviewMedia';
import { SectionTitle } from './ui';

export function Gallery() {
  const [filter, setFilter] = useState<StyleTag | 'all'>('all');
  const tags = useMemo(() => [...new Set(PUBLIC_TEMPLATES.flatMap((t) => t.styleTags))], []);
  const shown = PUBLIC_TEMPLATES.filter((t) => filter === 'all' || t.styleTags.includes(filter));

  return (
    <section id="designs" aria-labelledby="designs-title" className="bg-ivory px-5 py-24">
      <SectionTitle id="designs-title" title={copy.gallery.title} lead={copy.gallery.lead} />
      <div role="group" aria-label={copy.gallery.filtersLabel} className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
        {(['all', ...tags] as const).map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={filter === tag}
            onClick={() => setFilter(tag)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              filter === tag ? 'border-gold bg-gold text-emerald-deep' : 'border-line bg-paper text-ink hover:border-gold'
            }`}
          >
            {tag === 'all' ? copy.gallery.all : copy.tags[tag]}
          </button>
        ))}
      </div>

      <ul className="mx-auto mt-12 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <li key={t.id} className="group flex flex-col rounded-[2rem] border border-line bg-paper p-4 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald/10">
            <a href={`/i/demo-${t.id}`} aria-label={`${copy.view}: ${t.nameAr}`} className="block">
              <PreviewMedia template={t} className="aspect-[390/600] w-full" />
            </a>
            <div className="flex flex-1 flex-col px-2 pt-5">
              <h3 className="font-serif text-2xl text-ink">{t.nameAr}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-ink-soft">{t.taglineAr}</p>
              <p className="mt-3 flex flex-wrap gap-1.5">
                {t.styleTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-emerald-soft px-2.5 py-0.5 text-xs text-emerald">
                    {copy.tags[tag]}
                  </span>
                ))}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href={`/i/demo-${t.id}`} className="rounded-full bg-emerald px-4 py-2.5 text-center text-sm font-medium text-ivory transition hover:bg-emerald-deep">
                  {copy.view}
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gold px-4 py-2.5 text-center text-sm font-medium text-gold-ink transition hover:bg-gold/10"
                >
                  {copy.orderShort}
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
