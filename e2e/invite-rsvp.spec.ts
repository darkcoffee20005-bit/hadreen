import { expect, test } from '@playwright/test';
import { createWeddingWithGuest, openInvitation, prisma } from './fixtures';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a guest opens their invite, RSVPs, and the couple sees it', async ({ page }) => {
  const { wedding, guest } = await createWeddingWithGuest();

  await page.goto(`/i/${wedding.slug}?g=${guest.token}`);
  const gate = page.locator('.invite-gate');
  await expect(gate.getByText('أهلاً عائلة أبو حسين')).toBeVisible();
  await expect(gate.getByRole('heading', { level: 1 })).toContainText('أحمد');

  await openInvitation(page);
  const rsvp = page.locator('#rsvp');
  await rsvp.getByRole('radio', { name: 'حاضرين' }).click();
  await rsvp.getByRole('button', { name: 'أقل' }).click(); // 4 → 3
  await rsvp.getByRole('button', { name: 'أقل' }).click(); // 3 → 2
  await rsvp.getByLabel('كلمة للعروسين (اختياري)').fill('ألف مبروك');
  await rsvp.getByRole('button', { name: 'أرسلوا الرد' }).click();
  await expect(rsvp.getByText('وصل ردّكم، ننتظركم!')).toBeVisible();
  await expect(rsvp.getByText('حاضرين (٢)')).toBeVisible();

  // Reloading shows the saved answer.
  await page.reload();
  await openInvitation(page);
  await expect(page.locator('#rsvp').getByText('حاضرين (٢)')).toBeVisible();

  await page.goto(`/d/${wedding.slug}?k=${wedding.coupleSecret}`);
  await expect(page).toHaveURL(new RegExp(`/d/${wedding.slug}$`)); // secret moved to a cookie
  const row = page.locator(`[data-guest="عائلة أبو حسين"]`);
  await expect(row.getByText('حاضرين')).toBeVisible();
  await expect(row).toContainText('٢ / ٤');
  await expect(page.getByText('«ألف مبروك»')).toBeVisible();
  await expect(page.getByText('المقاعد المؤكدة').locator('..')).toContainText('٢');
});

test('a guest without a personal link RSVPs with their name', async ({ page }) => {
  const { wedding } = await createWeddingWithGuest({ openRsvpMaxSeats: 2 });

  await page.goto(`/i/${wedding.slug}`);
  await expect(page.locator('.invite-gate').getByText('أهلاً وسهلاً')).toBeVisible();
  await openInvitation(page);
  const rsvp = page.locator('#rsvp');
  await rsvp.getByRole('radio', { name: 'حاضرين' }).click();
  await rsvp.getByLabel('الاسم').fill('بيت أبو علي');
  await rsvp.getByRole('button', { name: 'أرسلوا الرد' }).click();
  await expect(rsvp.getByText('وصل ردّكم، ننتظركم!')).toBeVisible();
  await expect(page).toHaveURL(/\?g=/); // this browser now edits through its own link

  const open = await prisma.guest.findFirst({ where: { weddingId: wedding.id, source: 'open' }, include: { rsvp: true } });
  expect(open?.displayName).toBe('بيت أبو علي');
  expect(open?.rsvp?.seats).toBe(2);
});

test('an unknown invitation shows a friendly 404', async ({ page }) => {
  const res = await page.goto('/i/does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('ما لگينا هذي الدعوة')).toBeVisible();
});

test('calendar file is valid iCalendar', async ({ request }) => {
  const { wedding } = await createWeddingWithGuest();
  const res = await request.get(`/i/${wedding.slug}/calendar.ics`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/calendar');
  const body = await res.text();
  expect(body).toContain('BEGIN:VEVENT');
  expect(body).toContain('SUMMARY:زفاف أحمد وسارة');
});
