/**
 * Picks a small line icon for a programme item from its title (Arabic or English). The icons
 * themselves are drawn in content.css; unknown titles get a heart.
 */
export type ProgrammeIcon = 'welcome' | 'rings' | 'music' | 'dinner' | 'cake' | 'toast' | 'heart';

const RULES: [ProgrammeIcon, RegExp][] = [
  ['rings', /عقد|قران|قرآن|ملكة|ملچة|خطوب|نكاح|ceremony|nikkah|vows|ring/i],
  ['cake', /كيك|كعك|تورت|حلويات|cake|dessert/i],
  ['dinner', /عشاء|غداء|عزيمة|بوفيه|طعام|dinner|lunch|buffet|meal/i],
  ['toast', /عصائر|عصير|ضيافة|مشروبات|كوكتيل|toast|drinks|cocktail|refresh/i],
  ['music', /زف|دبك|رقص|دخول|سهرة|حفلة|موسيقى|dance|party|entrance|music|zaffa/i],
  ['welcome', /استقبال|وصول|ترحيب|welcome|arrival|reception|guests/i],
];

/** Strips Arabic diacritics and tatweel so «الزفّة» and «الزفة» match alike. */
export function normalizeTitle(title: string): string {
  return title.replace(/[ً-ٰٟـ]/g, '').trim();
}

export function iconFor(title: string): ProgrammeIcon {
  const t = normalizeTitle(title);
  for (const [icon, re] of RULES) if (re.test(t)) return icon;
  return 'heart';
}
