import 'dotenv/config';
import { expect, type Page } from '@playwright/test';
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
      couplePin: '123456',
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

/**
 * Opens the gate the way a guest does. Default e2e Chromium has no WebGL, so this is the 2D
 * gate: tap the seal, the short CSS opening plays, the content takes over.
 */
export async function openInvitation(page: Page) {
  await page.getByRole('button', { name: 'افتحوا الدعوة' }).click();
  await expect(page.locator('[data-phase="content"]')).toBeVisible({ timeout: 15_000 });
}

/** Opens a couple dashboard the way the couple does: secret link, then the 6-digit code. */
export async function openDashboard(page: import('@playwright/test').Page, slug: string, secret: string, pin = '123456') {
  await page.goto(`/d/${slug}?k=${secret}`);
  await page.getByLabel('رمز اللوحة').fill(pin);
  await page.getByRole('button', { name: 'فتح اللوحة' }).click();
}
