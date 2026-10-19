import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { customAlphabet } from 'nanoid';
import { PrismaClient } from '../src/generated/prisma/client';
import { TOKEN_ALPHABET } from '../src/lib/validation/patterns';

const token = customAlphabet(TOKEN_ALPHABET, 10);
const secret = customAlphabet(TOKEN_ALPHABET, 24);

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.E2E_DATABASE_URL! }),
});

let counter = 0;

/** A live wedding with one invited guest, unique per call. */
export async function createWeddingWithGuest(overrides: { openRsvpMaxSeats?: number } = {}) {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${counter}`;
  const date = new Date(Date.now() + 40 * 86_400_000);
  const wedding = await prisma.wedding.create({
    data: {
      slug: `e2e-${suffix}`,
      template: 'royal-gold',
      groomName: 'أحمد',
      brideName: 'سارة',
      monogram: 'أ & س',
      dateTimeUtc: date,
      venueName: 'قاعة الاختبار',
      venueArea: 'بغداد',
      rsvpDeadline: new Date(date.getTime() - 7 * 86_400_000),
      musicTrack: 'strings-qanun',
      status: 'live',
      coupleSecret: secret(),
      openRsvpMaxSeats: overrides.openRsvpMaxSeats ?? 2,
    },
  });
  const guest = await prisma.guest.create({
    data: {
      weddingId: wedding.id,
      displayName: 'عائلة أبو حسين',
      maxSeats: 4,
      group: 'أهل العريس',
      token: token(),
    },
  });
  return { wedding, guest };
}
