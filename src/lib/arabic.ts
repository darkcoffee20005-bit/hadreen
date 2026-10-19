import { toWesternDigits } from '@/lib/date/numerals';

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Folds the spelling variants people mix when typing Arabic names, so search and duplicate
 * checks treat "أحمد", "احمد" and "أحْمَد" as the same word.
 */
export function normalizeArabic(input: string): string {
  return toWesternDigits(input.normalize('NFKC'))
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = normalizeArabic(query);
  return q === '' || normalizeArabic(text).includes(q);
}
