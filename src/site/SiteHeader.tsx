'use client';

import { useEffect, useState } from 'react';
import { copy } from './copy';
import { InstagramButton } from './ui';

/** Transparent over the hero; a solid emerald bar once the page scrolls. */
export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500 ${
        solid ? 'bg-emerald-deep/90 shadow-lg shadow-black/20 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <a href="#top" className="font-display text-3xl leading-none text-gold">
          {copy.brand}
        </a>
        <nav aria-label="أقسام الصفحة" className="hidden md:block">
          <ul className="flex gap-7 text-sm text-ivory/85">
            {copy.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition hover:text-gold">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <InstagramButton label={copy.orderShort} variant="outline" className="!px-4 !py-2 text-sm" />
      </div>
    </header>
  );
}
