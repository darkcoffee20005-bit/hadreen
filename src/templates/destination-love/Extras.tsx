'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DESTINATION_CITY, findCity } from '@/lib/geo';
import { useInvite } from '@/lib/invite/machine';
import type { InviteView } from '@/lib/invite/view';
import { passContent } from './pass';
import { PassCard } from './PassCard';

/**
 * The boarding pass as the content's hero card, right after the names. Decorative (aria-hidden):
 * every line on it is already in the content. «حاضرين» tears its stub off along the perforation;
 * if the guest answers further down the page, the tear plays when the pass is next in view.
 */
export default function Extras({ view }: { view: InviteView }) {
  const w = view.wedding;
  const content = useMemo(
    () =>
      passContent({
        lang: w.lang,
        groom: w.groomName,
        bride: w.brideName,
        monogram: w.monogram,
        guestName: view.guest?.displayName ?? null,
        dateLine: view.dateLine,
        timeLine: view.timeLine,
        venueName: w.venueName,
        from: findCity(w.originCity) ?? null,
        to: findCity(w.destinationCity || DEFAULT_DESTINATION_CITY) ?? null,
      }),
    [w, view.guest, view.dateLine, view.timeLine],
  );
  const [state, setState] = useState<'whole' | 'armed' | 'tearing' | 'torn'>(view.guest?.rsvp?.attending ? 'torn' : 'whole');
  const rsvp = useInvite((s) => s.rsvp);
  const root = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    if (rsvp.id === 0) return;
    if (rsvp.attending) setState((s) => (s === 'whole' ? (visible.current ? 'tearing' : 'armed') : s));
    else setState('whole');
  }, [rsvp]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = Boolean(e?.isIntersecting);
      if (visible.current) setState((s) => (s === 'armed' ? 'tearing' : s));
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="dl-hero-pass px-4 pb-4 pt-2" aria-hidden="true">
      <div className="mx-auto max-w-xl">
        <PassCard c={content} state={state === 'armed' ? 'whole' : state} />
      </div>
    </div>
  );
}
