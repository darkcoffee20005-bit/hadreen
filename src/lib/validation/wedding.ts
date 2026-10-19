import { z } from 'zod';
import { parseLocalDateTime } from '@/lib/date/tz';
import { TEMPLATE_IDS } from '@/lib/invite/types';
import { HEX_RE, SLUG_RE, TIME_RE } from './patterns';

const text = (max: number) => z.string().trim().max(max);
const hex = z.string().regex(HEX_RE);

/** `<input type="datetime-local">` value, read as Baghdad wall-clock time. */
const localDateTime = z.string().transform((value, ctx) => {
  const date = parseLocalDateTime(value);
  if (!date) {
    ctx.addIssue({ code: 'custom', message: 'INVALID_DATE' });
    return z.NEVER;
  }
  return date;
});

const httpUrlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), { message: 'INVALID_URL' });

export const scheduleItemSchema = z.object({
  time: z.string().regex(TIME_RE),
  title: z.string().trim().min(1).max(60),
  subtitle: text(120),
});
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

export const dressCodeSchema = z.object({
  label: text(60),
  swatches: z.array(hex).max(6),
  ladies: text(200),
  gentlemen: text(200),
});
export type DressCode = z.infer<typeof dressCodeSchema>;

export const EMPTY_DRESS_CODE: DressCode = { label: '', swatches: [], ladies: '', gentlemen: '' };

export const paletteOverridesSchema = z.object({
  variant: z.string().max(40).optional(),
  bg: hex.optional(),
  surface: hex.optional(),
  ink: hex.optional(),
  inkSoft: hex.optional(),
  accent: hex.optional(),
  onAccent: hex.optional(),
  gold: hex.optional(),
  goldInk: hex.optional(),
  line: hex.optional(),
  band: hex.optional(),
  onBand: hex.optional(),
});

export const weddingInputSchema = z
  .object({
    slug: z.string().trim().toLowerCase().regex(SLUG_RE),
    template: z.enum(TEMPLATE_IDS),
    lang: z.enum(['ar', 'en']),
    groomName: z.string().trim().min(1).max(40),
    brideName: z.string().trim().min(1).max(40),
    monogram: text(12),
    dateLocal: localDateTime,
    verse: text(400),
    intro: text(600),
    venueName: z.string().trim().min(1).max(80),
    venueArea: text(80),
    mapsUrl: httpUrlOrEmpty,
    dressCode: dressCodeSchema,
    notes: text(400),
    rsvpDeadlineLocal: localDateTime,
    schedule: z.array(scheduleItemSchema).max(12),
    musicTrack: z.string().trim().min(1).max(60),
    paletteOverrides: paletteOverridesSchema,
    originCity: text(60),
    destinationCity: text(60),
    status: z.enum(['draft', 'live']),
    openRsvpMaxSeats: z.number().int().min(0).max(10),
  })
  .superRefine((v, ctx) => {
    if (v.rsvpDeadlineLocal.getTime() > v.dateLocal.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['rsvpDeadlineLocal'], message: 'DEADLINE_AFTER_WEDDING' });
    }
  });

/** What the admin editor sends (dates as datetime-local strings). */
export type WeddingFormInput = z.input<typeof weddingInputSchema>;
export type WeddingInput = z.output<typeof weddingInputSchema>;

/** Reads stored JSON defensively: bad rows are dropped instead of breaking the page. */
export function readSchedule(value: unknown): ScheduleItem[] {
  const parsed = z.array(z.unknown()).safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.flatMap((item) => {
    const r = scheduleItemSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

export function readDressCode(value: unknown): DressCode {
  const r = dressCodeSchema.safeParse({ ...EMPTY_DRESS_CODE, ...(value as object) });
  return r.success ? r.data : EMPTY_DRESS_CODE;
}
