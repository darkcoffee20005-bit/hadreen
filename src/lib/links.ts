/** URL builders. `base` is SITE_URL, passed in so client components never read server env. */

export function inviteUrl(base: string, slug: string, token?: string | null): string {
  const url = `${base}/i/${slug}`;
  return token ? `${url}?g=${token}` : url;
}

export function dashboardUrl(base: string, slug: string, secret: string): string {
  return `${base}/d/${slug}?k=${secret}`;
}

export function calendarIcsPath(slug: string): string {
  return `/i/${slug}/calendar.ics`;
}

/** The couple's own maps link, or a Google Maps search for the venue. */
export function venueMapsUrl(venue: { mapsUrl: string; venueName: string; venueArea: string }): string {
  if (venue.mapsUrl) return venue.mapsUrl;
  const query = [venue.venueName, venue.venueArea].filter(Boolean).join('، ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const INSTAGRAM_HANDLE = '7adre.n';
export const INSTAGRAM_URL = 'https://www.instagram.com/7adre.n/';
