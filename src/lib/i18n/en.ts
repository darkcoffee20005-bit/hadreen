import type { InviteDict } from './ar';

type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : { [K in keyof T]: Widen<T[K]> };

export const en: Widen<InviteDict> = {
  greetingGuest: (name: string) => `Welcome, ${name}`,
  greetingGeneric: 'Welcome',
  invitationLead: 'We are delighted to invite you to the wedding of',
  and: '&',
  openInvitation: 'Open the invitation',
  skipToContent: 'Skip to the invitation details',
  demoRibbon: 'Demo invitation: names, dates and places are examples',
  draftRibbon: 'Draft: this invitation is not published yet',
  countdown: {
    title: 'Counting down',
    days: 'days',
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',
    today: 'The big day is today!',
  },
  programme: 'Programme',
  venue: {
    title: 'Venue',
    map: 'Open map',
    calendar: 'Add to calendar',
    deviceCalendar: 'Device calendar',
    googleCalendar: 'Google Calendar',
  },
  dressCode: { title: 'Dress code', ladies: 'Ladies', gentlemen: 'Gentlemen' },
  notes: 'Notes',
  rsvp: {
    title: 'RSVP',
    question: 'Will you join us?',
    yes: 'Attending',
    no: 'Regretfully decline',
    seats: 'Guests',
    seatsMax: (max: string) => `up to ${max}`,
    decrease: 'Fewer',
    increase: 'More',
    name: 'Name',
    namePlaceholder: 'e.g. The Hassan family',
    message: 'A note for the couple (optional)',
    submit: 'Send reply',
    update: 'Update reply',
    sending: 'Sending…',
    thanksYes: 'Thank you, we look forward to seeing you!',
    thanksNo: 'Thank you for letting us know.',
    editableUntil: (date: string) => `You can change your reply until ${date}`,
    closed: 'RSVP has closed.',
    personalOnly: 'RSVP is available from your personal link only.',
    current: 'Your reply',
    attendingSeats: (n: string) => `Attending (${n})`,
    declined: 'Declined',
    errors: {
      INVALID_INPUT: 'Please check your details and try again.',
      NAME_REQUIRED: 'Please enter your name.',
      SEATS_MIN: 'Please choose the number of guests.',
      SEATS_MAX: 'That is more guests than this invitation allows.',
      DEADLINE_PASSED: 'RSVP has closed.',
      INVALID_LINK: 'This link is not valid.',
      OPEN_RSVP_CLOSED: 'RSVP is available from your personal link only.',
      RATE_LIMITED: 'Too many attempts, please try again shortly.',
      NETWORK: 'Connection problem, please try again.',
    },
  },
  footer: {
    text: 'An invitation by Hadreen. To order, message us on Instagram',
  },
  notFound: {
    title: 'We couldn’t find this invitation',
    body: 'Please check the link, or ask the hosts to send it again.',
  },
};
