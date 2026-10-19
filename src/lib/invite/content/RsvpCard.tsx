'use client';

import { useEffect, useId, useState } from 'react';
import { localizeDigits } from '@/lib/date/numerals';
import { inviteDict } from '@/lib/i18n';
import type { Lang } from '@/lib/lang';
import { RSVP_MESSAGE_MAX, RSVP_NAME_MAX, type RsvpErrorCode } from '@/lib/validation/rsvp';
import type { InviteGuest } from '@/lib/wedding-types';

interface Props {
  slug: string;
  lang: Lang;
  guest: InviteGuest | null;
  openRsvpMaxSeats: number;
  closed: boolean;
  deadlineLine: string;
  /** Admin preview: the form renders but never submits. */
  preview?: boolean;
}

type Saved = { attending: boolean; seats: number; message: string };

function browserKey(slug: string): string {
  const storageKey = `hadreen:key:${slug}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(storageKey, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export function RsvpCard({ slug, lang, guest, openRsvpMaxSeats, closed, deadlineLine, preview = false }: Props) {
  const t = inviteDict(lang).rsvp;
  const ids = useId();
  const digits = (n: number) => localizeDigits(n, lang);

  const [token, setToken] = useState(guest?.token ?? null);
  const maxSeats = guest?.maxSeats ?? openRsvpMaxSeats;
  const [saved, setSaved] = useState<Saved | null>(guest?.rsvp ?? null);
  const [attending, setAttending] = useState<boolean | null>(guest?.rsvp?.attending ?? null);
  const [seats, setSeats] = useState(Math.max(1, guest?.rsvp?.attending ? guest.rsvp.seats : maxSeats));
  const [message, setMessage] = useState(guest?.rsvp?.message ?? '');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);

  useEffect(() => {
    if (!guest) setClientKey(browserKey(slug));
  }, [guest, slug]);

  const personalOnly = !token && openRsvpMaxSeats < 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || attending === null) return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...(token ? { token } : { clientKey, name }),
          attending,
          seats: attending ? seats : 0,
          message,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: RsvpErrorCode; token?: string; rsvp?: Saved };
      if (!res.ok || !data.ok || !data.rsvp) {
        setError(t.errors[data.error ?? 'INVALID_INPUT'] ?? t.errors.INVALID_INPUT);
        setStatus('idle');
        return;
      }
      setSaved(data.rsvp);
      setStatus('done');
      if (!token && data.token) {
        // Generic link: from now on this browser edits the same answer through its own link.
        setToken(data.token);
        window.history.replaceState(null, '', `?g=${data.token}`);
      }
    } catch {
      setError(t.errors.NETWORK);
      setStatus('idle');
    }
  }

  const summary = saved && (
    <p className="rounded-2xl bg-inv-bg px-4 py-3 text-center text-inv-ink">
      <span className="text-inv-ink-soft">{t.current}: </span>
      <strong>{saved.attending ? t.attendingSeats(digits(saved.seats)) : t.declined}</strong>
    </p>
  );

  return (
    <div className="gold-frame rounded-[2rem] border border-inv-line bg-inv-surface px-6 py-10 sm:px-10">
      <div className="relative">
        {closed ? (
          <div className="space-y-4 text-center">
            <p className="text-inv-ink">{t.closed}</p>
            {summary}
          </div>
        ) : personalOnly ? (
          <p className="text-center text-inv-ink">{t.personalOnly}</p>
        ) : (
          <form onSubmit={submit} className="space-y-6" noValidate>
            <fieldset>
              <legend className="mb-3 w-full text-center font-inv-serif text-xl text-inv-ink">{t.question}</legend>
              <div role="radiogroup" aria-label={t.question} className="grid grid-cols-2 gap-2 rounded-full bg-inv-bg p-1.5">
                {[
                  { value: true, label: t.yes },
                  { value: false, label: t.no },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={attending === option.value}
                    onClick={() => setAttending(option.value)}
                    className={`rounded-full px-4 py-3 text-base font-medium transition-all duration-300 ${
                      attending === option.value
                        ? 'bg-inv-accent text-inv-on-accent shadow-md'
                        : 'text-inv-ink hover:bg-inv-surface'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {!token && (
              <div>
                <label htmlFor={`${ids}-name`} className="mb-2 block text-sm text-inv-ink-soft">
                  {t.name}
                </label>
                <input
                  id={`${ids}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={RSVP_NAME_MAX}
                  required
                  autoComplete="name"
                  placeholder={t.namePlaceholder}
                  className="w-full rounded-2xl border border-inv-line bg-inv-bg px-4 py-3 text-inv-ink placeholder:text-inv-ink-soft/70 focus:border-inv-gold focus:outline-none"
                />
              </div>
            )}

            {attending && (
              <div>
                <span id={`${ids}-seats`} className="mb-2 block text-sm text-inv-ink-soft">
                  {t.seats} <span className="text-xs">({t.seatsMax(digits(maxSeats))})</span>
                </span>
                <div className="flex items-center justify-center gap-6" role="group" aria-labelledby={`${ids}-seats`}>
                  <button
                    type="button"
                    aria-label={t.decrease}
                    disabled={seats <= 1}
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="size-12 rounded-full border border-inv-line text-2xl text-inv-ink disabled:opacity-30"
                  >
                    −
                  </button>
                  <output aria-live="polite" className="min-w-12 text-center font-inv-serif text-4xl text-inv-ink">
                    {digits(seats)}
                  </output>
                  <button
                    type="button"
                    aria-label={t.increase}
                    disabled={seats >= maxSeats}
                    onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                    className="size-12 rounded-full border border-inv-line text-2xl text-inv-ink disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor={`${ids}-message`} className="mb-2 block text-sm text-inv-ink-soft">
                {t.message}
              </label>
              <textarea
                id={`${ids}-message`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={RSVP_MESSAGE_MAX}
                rows={3}
                className="w-full resize-none rounded-2xl border border-inv-line bg-inv-bg px-4 py-3 text-inv-ink focus:border-inv-gold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={attending === null || status === 'sending' || (!token && name.trim().length < 2)}
              className="w-full rounded-full bg-inv-accent px-6 py-4 text-lg font-medium text-inv-on-accent transition disabled:opacity-40"
            >
              {status === 'sending' ? t.sending : saved ? t.update : t.submit}
            </button>

            <div aria-live="polite" className="min-h-6 text-center">
              {error && <p className="text-sm font-medium text-inv-accent">{error}</p>}
              {status === 'done' && saved && (
                <p className="font-inv-serif text-xl text-inv-gold-ink">{saved.attending ? t.thanksYes : t.thanksNo}</p>
              )}
            </div>
            {summary}
            <p className="text-center text-xs text-inv-ink-soft">{t.editableUntil(deadlineLine)}</p>
          </form>
        )}
      </div>
    </div>
  );
}
