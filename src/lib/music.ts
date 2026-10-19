/**
 * Music choices. Until licensed tracks are added to /public/music (listed in its manifest.json),
 * each template has a synthesized placeholder generated in the browser (Phase 2 audio kit).
 */
export interface MusicTrack {
  id: string;
  nameAr: string;
  nameEn: string;
  placeholder: boolean;
}

export const PLACEHOLDER_TRACKS: readonly MusicTrack[] = [
  { id: 'harp-nahawand', nameAr: 'هارب على مقام نهاوند (مؤقت)', nameEn: 'Harp, Nahawand (placeholder)', placeholder: true },
  { id: 'oud-hijaz', nameAr: 'عود على مقام حجاز (مؤقت)', nameEn: 'Oud, Hijaz (placeholder)', placeholder: true },
  { id: 'mandolin-major', nameAr: 'ماندولين مشمس (مؤقت)', nameEn: 'Sunny mandolin (placeholder)', placeholder: true },
  { id: 'strings-qanun', nameAr: 'أوتار وقانون (مؤقت)', nameEn: 'Strings and qanun (placeholder)', placeholder: true },
  { id: 'piano-waltz', nameAr: 'فالس بيانو (مؤقت)', nameEn: 'Piano waltz (placeholder)', placeholder: true },
  { id: 'arp-travel', nameAr: 'نغمة سفر (مؤقت)', nameEn: 'Travel arpeggio (placeholder)', placeholder: true },
];

export function isKnownTrack(id: string, licensed: readonly MusicTrack[] = []): boolean {
  return [...PLACEHOLDER_TRACKS, ...licensed].some((t) => t.id === id);
}
