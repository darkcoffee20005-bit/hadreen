'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ui } from '@/components/ui';
import { unlockDashboardAction } from './actions';

const ERRORS = {
  WRONG: 'الرمز غير صحيح.',
  LIMITED: 'محاولات كثيرة، جرّبوا بعد عشر دقائق.',
  UNAUTHORIZED: 'افتحوا اللوحة من الرابط الكامل اللي وصلكم.',
} as const;

export function PinGate({ slug, names }: { slug: string; names: string }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await unlockDashboardAction(slug, pin);
      if (res.ok) router.refresh();
      else {
        setError(ERRORS[res.error]);
        setPin('');
      }
    });
  };

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-5xl leading-display text-gold-ink">حاضرين</p>
        <h1 className="mt-3 text-xl font-medium">لوحة {names}</h1>
        <p className="mt-2 text-ink-soft">اكتبوا رمز اللوحة (٦ أرقام) اللي وصلكم ويا الرابط.</p>
        <form onSubmit={submit} className={`${ui.card} mt-8 space-y-4 p-6 text-start`}>
          <div>
            <label htmlFor="pin" className={ui.label}>
              رمز اللوحة
            </label>
            <input
              id="pin"
              name="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9٠-٩]{6}"
              maxLength={6}
              required
              dir="ltr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`${ui.input} text-center text-2xl tracking-[0.5em]`}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className={`${ui.primary} w-full`}>
            {pending ? 'جاري الفتح…' : 'فتح اللوحة'}
          </button>
          <p className="text-xs text-ink-soft">تنطلبون الرمز مرة وحدة بكل جهاز.</p>
        </form>
      </div>
    </main>
  );
}
