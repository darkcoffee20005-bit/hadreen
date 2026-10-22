import type { TemplateMeta } from '@/lib/invite/types';

/** The venue this design belongs to; it also names the hall on the card, the pediment and the footer. */
export const HALL_NAME = 'قاعة البيت الأبيض';
export const HALL_CITY = 'الموصل';

export const whiteHouseHall: TemplateMeta = {
  id: 'white-house-hall',
  nameAr: 'البيت الأبيض',
  nameEn: 'White House Hall',
  inspiredBy: 'White House Hall, Mosul (exclusive)',
  taglineAr: 'بطاقة أوف وايت على أسود، تنفتح على واجهة القاعة بأعمدتها ونجفاتها.',
  taglineEn: 'An off-white card on black that opens onto the hall’s columned façade and its chandeliers.',
  palette: {
    bg: '#F4F1EA',
    surface: '#FBF9F4',
    ink: '#151515',
    inkSoft: '#57534C',
    accent: '#151515',
    onAccent: '#F4F1EA',
    gold: '#B5A27A',
    goldInk: '#2E2B26',
    line: '#D8D3C7',
    band: '#0D0D0D',
    onBand: '#F4F1EA',
    scene: {
      paper: '#F4F1EA',
      ink: '#141414',
      stone: '#ECE7DC',
      night: '#0A1020',
      dusk: '#2B3752',
      warm: '#FFE3BC',
      marble: '#F2EFE8',
      marbleDark: '#1B1B1B',
    },
  },
  paletteVariants: [
    { id: 'classic', nameAr: 'أوف وايت وأسود', nameEn: 'Off-white and black', tokens: {} },
    { id: 'ivory', nameAr: 'عاجي دافئ', nameEn: 'Warm ivory', tokens: { bg: '#F6F0E3', surface: '#FCF8EF', line: '#DED4C0' } },
  ],
  music: { moodAr: 'هادئ وراقي، بيانو ناعم', moodEn: 'Calm and refined, soft piano', bpm: 72, placeholder: 'piano-waltz' },
  intro: { duration: 8 },
  gate: { gesture: 'tap', labelAr: 'اضغطوا على الختم للدخول', labelEn: 'Tap the seal to enter', header: 'none' },
  closingAr: 'بانتظاركم في البيت الأبيض',
  closingEn: 'We look forward to welcoming you',
  og: 'light',
  budgetKB: 1300,
  styleTags: ['classic', 'modern'],
  exclusive: HALL_NAME,
};
