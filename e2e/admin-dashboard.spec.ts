import { expect, test } from '@playwright/test';
import { createWeddingWithGuest, prisma } from './fixtures';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('admin creates and publishes a wedding', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel('كلمة المرور').fill('wrong-password');
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.getByText('كلمة المرور غير صحيحة.')).toBeVisible();
  await page.getByLabel('كلمة المرور').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.getByRole('heading', { name: 'الأعراس' })).toBeVisible();

  await page.getByRole('link', { name: '+ عرس جديد' }).click();
  await page.getByRole('radio', { name: 'الرومانسية الأبدية' }).click();
  await page.getByLabel('اسم العريس').fill('زيد');
  await page.getByLabel('اسم العروس').fill('رنا');
  await page.getByLabel('اسم القاعة').fill('قاعة الشموع');
  const slug = `e2e-admin-${Date.now().toString(36)}`;
  await page.getByLabel('رابط الدعوة').fill(slug);

  // The live preview follows the unsaved form.
  const preview = page.frameLocator('iframe[title="معاينة الدعوة"]');
  await expect(preview.getByRole('heading', { level: 1 })).toContainText('زيد');

  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page.getByText('انحفظ ✓')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/weddings\/(?!new)/);

  const saved = await prisma.wedding.findUnique({ where: { slug } });
  expect(saved).toMatchObject({ template: 'eternal-romance', status: 'live', groomName: 'زيد' });

  const invite = await page.request.get(`/i/${slug}`);
  expect(invite.status()).toBe(200);
});

test('couple imports guests from CSV and exports them', async ({ page, request }) => {
  const { wedding } = await createWeddingWithGuest();
  await page.goto(`/d/${wedding.slug}?k=${wedding.coupleSecret}`);

  await page.getByRole('button', { name: 'استيراد CSV' }).click();
  await page.getByLabel('أو الصقوا القائمة هنا').fill('الاسم,المقاعد,المجموعة\nبيت الحاج كريم,٥,أهل العروس\nعائلة أبو حسين,3,\n');
  await expect(page.getByText('راح يُضاف ٢ ضيف')).toBeVisible();
  await page.getByRole('button', { name: 'استيراد', exact: true }).click();
  await expect(page.getByText('تمت إضافة ١ ضيف.')).toBeVisible(); // the second name already exists
  await expect(page.getByText('الاسم مكرر')).toBeVisible();
  await page.getByRole('button', { name: 'تمام' }).click();
  await expect(page.locator('[data-guest="بيت الحاج كريم"]')).toContainText('٥');

  const csv = await page.request.get(`/d/${wedding.slug}/export.csv`);
  expect(csv.status()).toBe(200);
  const text = await csv.text();
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('بيت الحاج كريم,أهل العروس,5,بلا رد');

  // Without the couple's cookie there is nothing to download.
  expect((await request.get(`/d/${wedding.slug}/export.csv`)).status()).toBe(401);
});

test('dashboard rejects a wrong secret', async ({ page }) => {
  const { wedding } = await createWeddingWithGuest();
  await page.goto(`/d/${wedding.slug}?k=WrongSecretWrongSecret22`);
  await expect(page.getByRole('heading', { name: 'الرابط غير صالح' })).toBeVisible();
});
