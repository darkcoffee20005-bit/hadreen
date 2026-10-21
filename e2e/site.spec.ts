import { expect, test } from '@playwright/test';
import { TEMPLATES } from '../src/templates';

test.describe('marketing site', () => {
  test('hero, picker, gallery filters, price and FAQ', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('خلّوا دعوتكم تنفتح مثل الحلم');

    // The picker drives the live demo link.
    const hero = page.locator('#top');
    await hero.getByRole('button', { name: 'الحديقة المقدّسة' }).click();
    await expect(hero.getByRole('link', { name: 'شوفوا الدعوة' })).toHaveAttribute('href', '/i/demo-sacred-garden');

    // Gallery filters by style.
    const gallery = page.locator('#designs');
    await expect(gallery.locator('li h3')).toHaveCount(TEMPLATES.length);
    await gallery.getByRole('button', { name: 'سفر' }).click();
    await expect(gallery.locator('li h3')).toHaveText(['حب بلا حدود']);
    await gallery.getByRole('button', { name: 'الكل' }).click();
    await expect(gallery.locator('li h3')).toHaveCount(TEMPLATES.length);

    await expect(page.locator('#price')).toContainText('٤٩ ألف دينار');
    const faq = page.locator('#faq');
    await faq.getByText('شكد السعر؟').click();
    await expect(faq.getByText('باقة وحدة تشمل كل المميزات')).toBeVisible();
  });

  test('orders go to Instagram only: no phone or WhatsApp anywhere', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toMatch(/tel:|wa\.me|whatsapp|واتساب/i);
    const hrefs = await page.locator('a[target="_blank"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) expect(href).toBe('https://www.instagram.com/7adre.n/');
  });

  test('robots and sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /d/');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/i/demo-royal-gold');
    expect(sitemap).not.toContain('/d/');
  });
});
