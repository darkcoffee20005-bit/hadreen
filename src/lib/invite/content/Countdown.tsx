'use client';

import { useEffect, useState } from 'react';
import { countdownParts } from '@/lib/date/format';
import { localizeDigits } from '@/lib/date/numerals';
import { inviteDict } from '@/lib/i18n';
import type { Lang } from '@/lib/lang';

/** Static digits for now; Phase 2 turns each digit into a CSS 3D flip. */
export function Countdown({ target, nowIso, lang }: { target: string; nowIso: string; lang: Lang }) {
  const t = inviteDict(lang).countdown;
  // First render uses the server's clock so hydration matches, then ticks on the client.
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = countdownParts(new Date(target), now);
  const cells = [
    { value: parts.days, label: t.days },
    { value: parts.hours, label: t.hours },
    { value: parts.minutes, label: t.minutes },
    { value: parts.seconds, label: t.seconds },
  ];

  return (
    <section aria-labelledby="countdown-title" className="bg-inv-band px-6 py-12 text-inv-on-band">
      <h2 id="countdown-title" className="text-center font-inv-serif text-xl">
        {parts.done ? t.today : t.title}
      </h2>
      {!parts.done && (
        <div className="mx-auto mt-6 grid max-w-md grid-cols-4 gap-3" role="timer" aria-live="off">
          {cells.map((c) => (
            <div key={c.label} className="rounded-2xl border border-current/20 px-1 py-3 text-center">
              <div className="font-inv-serif text-3xl tabular-nums leading-tight sm:text-4xl">
                {localizeDigits(String(c.value).padStart(2, '0'), lang)}
              </div>
              <div className="mt-1 text-xs opacity-80">{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
