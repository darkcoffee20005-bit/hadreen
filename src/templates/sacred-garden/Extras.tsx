'use client';

import type { InviteView } from '@/lib/invite/view';
import { BASMALA } from './layout';
import { SwanHeart } from './SwanHeart';

/**
 * The basmala the 3D opening shows in gold, here as a small arch-topped paper plaque between the
 * hero and the verse (its traditional place), with the swans' heart above it.
 */
export default function Extras(_props: { view: InviteView }) {
  return (
    <div className="px-4 pb-2 pt-4">
      <div className="sg-plaque mx-auto max-w-[17rem] px-8 pb-6 pt-9 text-center" lang="ar" dir="rtl">
        <SwanHeart className="mx-auto h-9 w-12 text-inv-gold" stroke="currentColor" />
        <p className="mt-2 font-inv-serif text-xl leading-loose text-inv-gold-ink">{BASMALA}</p>
      </div>
    </div>
  );
}
