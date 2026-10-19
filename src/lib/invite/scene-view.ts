import { weddingDateParts } from '@/lib/date/format';
import { DEFAULT_DESTINATION_CITY, findCity } from '@/lib/geo';
import type { SceneView } from './scene-types';
import type { InviteView } from './view';

export function buildSceneView(view: InviteView): SceneView {
  const w = view.wedding;
  return {
    templateId: view.template.id,
    lang: w.lang,
    groom: w.groomName,
    bride: w.brideName,
    monogram: w.monogram,
    guestName: view.guest?.displayName ?? null,
    rsvpAttending: view.guest?.rsvp ? view.guest.rsvp.attending : null,
    dateLine: view.dateLine,
    timeLine: view.timeLine,
    dateParts: weddingDateParts(new Date(w.dateTimeUtc), w.lang),
    venueName: w.venueName,
    palette: view.palette,
    origin: findCity(w.originCity) ?? null,
    destination: findCity(w.destinationCity || DEFAULT_DESTINATION_CITY) ?? null,
  };
}
