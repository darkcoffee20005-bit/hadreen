'use client';

import { useEffect, useState } from 'react';
import { InviteContent } from '@/lib/invite/content/InviteContent';
import { buildInviteView } from '@/lib/invite/view';
import type { InviteGuest, PublicWedding } from '@/lib/wedding-types';

const SAMPLE_GUEST: InviteGuest = { displayName: 'عائلة أبو حسين (مثال)', token: 'preview', maxSeats: 4, rsvp: null };

export function PreviewFrame() {
  const [wedding, setWedding] = useState<PublicWedding | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'hadreen:preview') return;
      setWedding(e.data.wedding as PublicWedding);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'hadreen:preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!wedding) return <p className="p-8 text-center text-ink-soft">جاري تحميل المعاينة…</p>;
  return <InviteContent view={buildInviteView(wedding, SAMPLE_GUEST, { preview: true })} />;
}
