import type { Lang } from '@/lib/lang';

/**
 * What the boarding pass says, shared by the 3D pass (canvas texture), the DOM pass card
 * (Extras) and the 2D fallback. Every value comes from the invitation as the guest sees it in the
 * DOM; only the little captions are the pass's own.
 */
export interface PassInput {
  lang: Lang;
  groom: string;
  bride: string;
  monogram: string;
  guestName: string | null;
  dateLine: string;
  timeLine: string;
  venueName: string;
  from: { ar: string; en: string } | null;
  to: { ar: string; en: string } | null;
}

export interface PassField {
  label: string;
  value: string;
}

export interface PassContent {
  rtl: boolean;
  title: string;
  kicker: string;
  fromLabel: string;
  toLabel: string;
  from: string | null;
  to: string;
  passenger: PassField;
  flight: PassField;
  date: PassField;
  time: PassField;
  gate: PassField;
  stubTitle: string;
  monogram: string;
}

const LABELS = {
  ar: {
    title: 'بطاقة صعود',
    kicker: 'دعوة زفاف',
    from: 'من',
    to: 'إلى',
    passenger: 'المسافر',
    flight: 'الرحلة',
    date: 'التاريخ',
    time: 'الوقت',
    gate: 'البوابة',
    guest: 'ضيفنا العزيز',
    and: 'و',
    stub: 'حاضرين',
    home: 'بغداد',
  },
  en: {
    title: 'Boarding pass',
    kicker: 'Wedding invitation',
    from: 'From',
    to: 'To',
    passenger: 'Passenger',
    flight: 'Flight',
    date: 'Date',
    time: 'Time',
    gate: 'Gate',
    guest: 'Our dear guest',
    and: '&',
    stub: 'See you there',
    home: 'Baghdad',
  },
} as const;

export function passContent(input: PassInput): PassContent {
  const l = LABELS[input.lang];
  const city = (c: { ar: string; en: string } | null) => (c ? (input.lang === 'ar' ? c.ar : c.en) : null);
  return {
    rtl: input.lang === 'ar',
    title: l.title,
    kicker: l.kicker,
    fromLabel: l.from,
    toLabel: l.to,
    from: city(input.from),
    to: city(input.to) ?? l.home,
    passenger: { label: l.passenger, value: input.guestName?.trim() || l.guest },
    flight: { label: l.flight, value: `${input.groom} ${l.and} ${input.bride}` },
    date: { label: l.date, value: input.dateLine },
    time: { label: l.time, value: input.timeLine },
    gate: { label: l.gate, value: input.venueName },
    stubTitle: l.stub,
    monogram: input.monogram,
  };
}

/** A decorative barcode from the names: deterministic bar widths (1–4 units), never random per render. */
export function barcode(seed: string, bars = 34): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    out.push(1 + ((h >>> 0) % 4));
  }
  return out;
}

/** Share of the pass taken by the main part; the stub is the rest (left in Arabic, right in English). */
export const MAIN_SHARE = 0.715;
/** Pass proportions (width / height). */
export const PASS_ASPECT = 2.45;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface TearPose {
  /** Rotation of the stub about the perforation (radians, about the pass's vertical axis). */
  hingeY: number;
  hingeZ: number;
  /** Offset and spin of the stub once it lets go (pass-local units). */
  position: [number, number, number];
  rotation: [number, number, number];
  opacity: number;
  visible: boolean;
}

/**
 * The stub tearing off along the perforation, `age` seconds after «حاضرين»: it peels toward the
 * guest about the perforation for a quarter second, lets go, and tumbles down and away.
 * `side` is where the stub sits: -1 left (Arabic), +1 right (English).
 */
export function tearPose(age: number, side: 1 | -1): TearPose {
  if (age < 0) return { hingeY: 0, hingeZ: 0, position: [0, 0, 0], rotation: [0, 0, 0], opacity: 1, visible: true };
  const peel = 1 - Math.pow(1 - clamp01(age / 0.24), 3);
  const k = Math.max(0, age - 0.2);
  return {
    hingeY: -side * 0.55 * peel,
    hingeZ: -side * 0.07 * peel,
    position: [side * 0.24 * k, -0.15 * k - 1.9 * k * k, 0.34 * k],
    rotation: [1.9 * k, side * 0.6 * k, side * 1.25 * k],
    opacity: 1 - sstep(1.0, 1.55, age),
    visible: age < 1.6,
  };
}
