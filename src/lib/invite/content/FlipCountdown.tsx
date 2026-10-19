'use client';

import { useEffect, useRef, useState } from 'react';
import { countdownParts } from '@/lib/date/format';
import { localizeDigits } from '@/lib/date/numerals';
import { inviteDict } from '@/lib/i18n';
import type { Lang } from '@/lib/lang';

/**
 * Flip-clock countdown: each digit is a split-flap card that flips (CSS 3D) when it changes.
 * Screen readers get one quiet summary instead of a ticking clock.
 */
function FlipDigit({ digit }: { digit: string }) {
  const [shown, setShown] = useState({ current: digit, previous: digit, flips: 0 });
  const latest = useRef(digit);
  useEffect(() => {
    if (digit === latest.current) return;
    setShown((s) => ({ current: digit, previous: latest.current, flips: s.flips + 1 }));
    latest.current = digit;
  }, [digit]);
  const { current, previous, flips } = shown;
  return (
    <span className="flip" data-digit={current}>
      <span className="flip-half flip-top">
        <span>{current}</span>
      </span>
      <span className="flip-half flip-bottom">
        <span>{flips ? previous : current}</span>
      </span>
      {flips > 0 && (
        <span key={flips} className="flip-leaves" aria-hidden="true">
          <span className="flip-half flip-top flip-leaf-top">
            <span>{previous}</span>
          </span>
          <span className="flip-half flip-bottom flip-leaf-bottom">
            <span>{current}</span>
          </span>
        </span>
      )}
    </span>
  );
}

export function FlipCountdown({ target, nowIso, lang }: { target: string; nowIso: string; lang: Lang }) {
  const t = inviteDict(lang).countdown;
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = countdownParts(new Date(target), now);
  const cells = [
    { value: parts.days, label: t.days, width: parts.days > 99 ? 3 : 2 },
    { value: parts.hours, label: t.hours, width: 2 },
    { value: parts.minutes, label: t.minutes, width: 2 },
    { value: parts.seconds, label: t.seconds, width: 2 },
  ];
  const summary = `${t.title}: ${cells.map((c) => `${localizeDigits(c.value, lang)} ${c.label}`).join('، ')}`;

  return (
    <section aria-labelledby="countdown-title" className="px-4 py-6" data-reveal>
      <div className="mx-auto max-w-xl rounded-[2rem] border border-inv-gold/40 bg-inv-band px-4 py-10 text-inv-on-band shadow-2xl shadow-black/20">
        <h2 id="countdown-title" className="text-center font-inv-serif text-xl">
          {parts.done ? t.today : t.title}
        </h2>
        {!parts.done && (
          <>
            <p className="sr-only">{summary}</p>
            <div className="mt-6 flex justify-center gap-2.5 sm:gap-4" aria-hidden="true">
              {cells.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    {localizeDigits(String(c.value).padStart(c.width, '0'), lang)
                      .split('')
                      .map((d, i) => (
                        <FlipDigit key={i} digit={d} />
                      ))}
                  </div>
                  <span className="text-xs opacity-80">{c.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
