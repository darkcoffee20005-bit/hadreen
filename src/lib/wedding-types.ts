import type { Lang } from '@/lib/lang';
import type { TemplateId } from '@/lib/invite/types';
import type { PaletteOverrides } from '@/lib/palette';
import type { DressCode, ScheduleItem } from '@/lib/validation/wedding';

/** What an invitation page may know about a wedding. Serializable; never contains secrets. */
export interface PublicWedding {
  id: string;
  slug: string;
  template: TemplateId;
  lang: Lang;
  groomName: string;
  brideName: string;
  monogram: string;
  dateTimeUtc: string; // ISO
  verse: string;
  intro: string;
  venueName: string;
  venueArea: string;
  mapsUrl: string;
  dressCode: DressCode;
  notes: string;
  rsvpDeadline: string; // ISO
  schedule: ScheduleItem[];
  musicTrack: string;
  paletteOverrides: PaletteOverrides;
  originCity: string;
  destinationCity: string;
  status: 'draft' | 'live';
  isDemo: boolean;
  openRsvpMaxSeats: number;
}

export interface InviteGuest {
  displayName: string;
  token: string;
  maxSeats: number;
  rsvp: { attending: boolean; seats: number; message: string } | null;
}

export type GuestStatus = 'attending' | 'declined' | 'opened' | 'pending';

export interface DashboardGuest {
  id: string;
  displayName: string;
  group: string;
  maxSeats: number;
  token: string;
  source: 'invited' | 'open';
  status: GuestStatus;
  seats: number;
  message: string;
  respondedAt: string | null;
  lastOpenedAt: string | null;
}

export interface DashboardTotals {
  invitedHouseholds: number;
  confirmedSeats: number;
  attendingHouseholds: number;
  declined: number;
  noReply: number;
  openedNoReply: number;
}
