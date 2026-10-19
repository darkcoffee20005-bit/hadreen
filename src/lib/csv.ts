import Papa from 'papaparse';
import { normalizeArabic } from '@/lib/arabic';
import { toWesternDigits } from '@/lib/date/numerals';
import { GUEST_GROUP_MAX, GUEST_NAME_MAX, GUEST_SEATS_MAX } from '@/lib/validation/guest';

export const CSV_MAX_ROWS = 1000;

export type CsvIssueCode = 'EMPTY_NAME' | 'NAME_TOO_LONG' | 'INVALID_SEATS' | 'DUPLICATE' | 'TOO_MANY_ROWS';

export interface CsvGuestRow {
  line: number;
  displayName: string;
  maxSeats: number;
  group: string;
}

export interface CsvIssue {
  line: number;
  code: CsvIssueCode;
  value?: string;
}

export interface CsvParseResult {
  rows: CsvGuestRow[];
  issues: CsvIssue[];
}

// Header names people actually use, in Arabic and English. Compared after normalizeArabic().
const HEADERS = {
  name: ['name', 'displayname', 'display name', 'guest', 'guest name', 'الاسم', 'اسم الضيف', 'الضيف', 'الأسماء', 'اسم العائلة'],
  seats: ['seats', 'maxseats', 'max seats', 'المقاعد', 'عدد المقاعد', 'عدد الأشخاص', 'العدد', 'عدد الحضور'],
  group: ['group', 'المجموعة', 'الفئة', 'القائمة', 'الجهة'],
};

function headerColumns(cells: string[]): { name: number; seats: number; group: number } | null {
  const normalized = cells.map(normalizeArabic);
  const find = (names: string[]) => {
    const wanted = new Set(names.map(normalizeArabic));
    return normalized.findIndex((c) => wanted.has(c));
  };
  const name = find(HEADERS.name);
  return name === -1 ? null : { name, seats: find(HEADERS.seats), group: find(HEADERS.group) };
}

/**
 * Parses a guest list. Accepts a header row in Arabic or English, or no header at all
 * (name, seats, group by position). Eastern Arabic digits are accepted for seats.
 * Names already in `existingNames` (or repeated in the file) are reported as duplicates.
 */
export function parseGuestsCsv(
  text: string,
  options: { defaultSeats: number; existingNames?: Iterable<string> },
): CsvParseResult {
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ''), {
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', '\t', ';', '|', '،'],
  });
  const rows: CsvGuestRow[] = [];
  const issues: CsvIssue[] = [];
  if (data.length === 0) return { rows, issues };

  const header = headerColumns(data[0]!);
  const columns = header ?? { name: 0, seats: 1, group: 2 };
  const seen = new Set([...(options.existingNames ?? [])].map(normalizeArabic));

  for (let i = header ? 1 : 0; i < data.length; i++) {
    const line = i + 1;
    if (rows.length >= CSV_MAX_ROWS) {
      issues.push({ line, code: 'TOO_MANY_ROWS' });
      break;
    }
    const cells = data[i]!;
    const cell = (index: number) => (index >= 0 ? (cells[index] ?? '').trim() : '');

    const displayName = cell(columns.name).replace(/\s+/g, ' ');
    if (!displayName) {
      if (cells.some((c) => c.trim())) issues.push({ line, code: 'EMPTY_NAME' });
      continue;
    }
    if (displayName.length > GUEST_NAME_MAX) {
      issues.push({ line, code: 'NAME_TOO_LONG', value: displayName.slice(0, 40) });
      continue;
    }

    let maxSeats = options.defaultSeats;
    const seatsCell = cell(columns.seats);
    if (seatsCell) {
      const n = Number(toWesternDigits(seatsCell));
      if (!Number.isInteger(n) || n < 1 || n > GUEST_SEATS_MAX) {
        issues.push({ line, code: 'INVALID_SEATS', value: seatsCell });
        continue;
      }
      maxSeats = n;
    }

    const key = normalizeArabic(displayName);
    if (seen.has(key)) {
      issues.push({ line, code: 'DUPLICATE', value: displayName });
      continue;
    }
    seen.add(key);
    rows.push({ line, displayName, maxSeats, group: cell(columns.group).slice(0, GUEST_GROUP_MAX) });
  }
  return { rows, issues };
}

// Cells starting with these characters run as formulas in Excel; guest names come from the public.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? '' : String(value);
  if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with a UTF-8 BOM and CRLF line endings, so Excel shows Arabic correctly. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
