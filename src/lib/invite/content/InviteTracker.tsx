'use client';

import { useEffect } from 'react';
import { initBeacon, trackOpenedOnce } from '@/lib/invite/beacon';

export function InviteTracker({ slug, token }: { slug: string; token: string | null }) {
  useEffect(() => {
    initBeacon(slug, token);
    trackOpenedOnce(slug);
  }, [slug, token]);
  return null;
}
