export const DEFAULT_EVENT_HOURS = 4;

export interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
  stamp?: Date;
}

/** 2026-12-10T17:00:00.000Z → 20261210T170000Z */
export function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/** Folds a content line at 75 octets (RFC 5545 §3.1) without splitting a UTF-8 character. */
export function foldIcsLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > 75) {
      out.push(current);
      current = ` ${ch}`;
      bytes = 1 + size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  out.push(current);
  return out.join('\r\n');
}

export function buildIcs(event: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hadreen//Invitation//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(event.stamp ?? new Date())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null);
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
