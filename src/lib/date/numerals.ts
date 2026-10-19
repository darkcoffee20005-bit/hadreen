import type { Lang } from '@/lib/lang';

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

/** 2026 → ٢٠٢٦. Every other character is left alone. */
export function toEasternDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => EASTERN[Number(d)]!);
}

/** Eastern Arabic (٠-٩) and Persian (۰-۹) digits → 0-9, for parsing what people type. */
export function toWesternDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Arabic UI uses Eastern Arabic digits; English uses Western digits. */
export function localizeDigits(value: string | number, lang: Lang): string {
  return lang === 'ar' ? toEasternDigits(value) : String(value);
}
