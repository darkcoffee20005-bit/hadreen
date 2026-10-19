/** Programme moments the royal-gold wire frieze recognises, and their gold line-art (72 × 64). */
export type IconKey = 'rings' | 'zaffa' | 'dinner' | 'cake' | 'welcome';

const MATCH: [RegExp, IconKey][] = [
  [/زف|zaff|procession/i, 'zaffa'],
  [/عشاء|عشا|dinner|supper|banquet/i, 'dinner'],
  [/كيك|كعك|cake/i, 'cake'],
  [/عقد|خاتم|محبس|دبل|ملكة|كتب الكتاب|ring|vow|ceremony/i, 'rings'],
  [/استقبال|welcome|reception|arrival|guests/i, 'welcome'],
];

export function iconFor(title: string): IconKey | null {
  for (const [re, key] of MATCH) if (re.test(title)) return key;
  return null;
}

export const ICONS: Record<IconKey, string[]> = {
  rings: ['M22 40a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', 'M34 40a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', 'M40 14l5 6l-5 6l-5 -6z', 'M35 20h10'],
  zaffa: ['M18 26a14 5 0 1 0 28 0a14 5 0 1 0 -28 0', 'M18 26v20a14 5 0 0 0 28 0v-20', 'M18 30l7 14l7 -14l7 14l7 -14', 'M44 12l10 -6', 'M48 18l12 -4'],
  dinner: ['M22 34a14 14 0 1 0 28 0a14 14 0 1 0 -28 0', 'M27 34a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M12 18v10q0 4 3 5v19', 'M10 18v8M14 18v8', 'M60 18q-5 6 -3 16l2 1v17'],
  cake: ['M18 54h36', 'M21 54v-12h30v12', 'M25 42v-10h22v10', 'M29 32v-8h14v8', 'M36 24v-7', 'M36 17q-3 -4 0 -7q3 3 0 7', 'M21 47q5 3 10 0t10 0t10 0'],
  welcome: ['M20 56v-24q0 -14 16 -24q16 10 16 24v24', 'M26 56v-22q0 -9 10 -16q10 7 10 16v22', 'M36 18v38', 'M33 38h-2M41 38h-2', 'M14 56h44'],
};

