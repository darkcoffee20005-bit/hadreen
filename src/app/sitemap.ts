import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { TEMPLATES } from '@/templates';

/** The site and the six demo invitations (personal invitations are never listed). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    ...TEMPLATES.map((t) => ({ url: `${base}/i/demo-${t.id}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
