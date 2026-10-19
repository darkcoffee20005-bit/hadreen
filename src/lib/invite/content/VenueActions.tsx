'use client';

import { track } from '@/lib/invite/beacon';

export function VenueActions({
  maps,
  ics,
  google,
  labels,
}: {
  maps: string;
  ics: string;
  google: string;
  labels: { map: string; calendar: string; deviceCalendar: string; googleCalendar: string };
}) {
  return (
    <div className="mt-6 space-y-3">
      <a
        href={maps}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('map')}
        className="block rounded-full bg-inv-accent px-6 py-3 text-center font-medium text-inv-on-accent transition hover:opacity-90"
      >
        {labels.map}
      </a>
      <div role="group" aria-label={labels.calendar} className="grid grid-cols-2 gap-3">
        <a
          href={ics}
          download
          onClick={() => track('calendar')}
          className="rounded-full border border-inv-line px-4 py-3 text-center text-sm text-inv-ink transition hover:border-inv-gold"
        >
          {labels.deviceCalendar}
        </a>
        <a
          href={google}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('calendar')}
          className="rounded-full border border-inv-line px-4 py-3 text-center text-sm text-inv-ink transition hover:border-inv-gold"
        >
          {labels.googleCalendar}
        </a>
      </div>
    </div>
  );
}
