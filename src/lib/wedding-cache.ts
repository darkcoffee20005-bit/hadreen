import 'server-only';
import { unstable_cache } from 'next/cache';
import { loadPublicWedding, withLiveDates } from '@/lib/weddings';
import type { PublicWedding } from '@/lib/wedding-types';

export const weddingTag = (slug: string) => `wedding:${slug}`;

/**
 * Wedding details change rarely, so they're cached per slug (admin saves call revalidateTag).
 * This keeps a Neon cold start off the path of guests opening their invitation.
 */
export async function getPublicWedding(slug: string): Promise<PublicWedding | null> {
  const cached = unstable_cache(() => loadPublicWedding(slug), ['public-wedding', slug], {
    tags: [weddingTag(slug)],
    revalidate: 3600,
  });
  const wedding = await cached();
  return wedding ? withLiveDates(wedding) : null;
}
