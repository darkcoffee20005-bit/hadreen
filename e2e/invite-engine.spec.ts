import { expect, test } from '@playwright/test';
import { openInvitation } from './fixtures';

/** The invitation engine without WebGL (default e2e Chromium): the 2D path. */
test.describe('2D path', () => {
  test('gate → opening → content, with every word already in the DOM', async ({ page }) => {
    await page.goto('/i/demo-royal-gold');
    const shell = page.locator('[data-path]');
    await expect(shell).toHaveAttribute('data-path', '2d');
    await expect(shell).toHaveAttribute('data-phase', 'gate');

    // Content is server-rendered and present (for crawlers, no-JS and screen readers later),
    // but inert behind the gate.
    await expect(page.locator('#rsvp')).toHaveCount(1);
    await expect(page.locator('#invite-hero')).toBeHidden();
    await expect(page.getByText('اضغطوا على الختم')).toBeVisible();

    await openInvitation(page);
    await expect(page.locator('#invite-hero')).toBeVisible();
    await expect(page.locator('#invite-hero')).toBeFocused();
    await expect(page.locator('#rsvp')).toBeVisible();
  });

  test('the skip link goes straight to the details', async ({ page }) => {
    await page.goto('/i/demo-royal-gold');
    await expect(page.locator('[data-phase="gate"]')).toHaveCount(1);
    await page.getByRole('link', { name: 'انتقلوا إلى تفاصيل الدعوة' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-phase="content"]')).toHaveCount(1);
  });

  test('reduced motion gets the 2D gate and an offer to play the 3D version', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/i/demo-royal-gold');
    await expect(page.locator('[data-path="2d"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'شغّلوا النسخة ثلاثية الأبعاد' })).toBeVisible();
  });

  test('hold and scratch gates open from the keyboard', async ({ page }) => {
    await page.goto('/i/demo-eternal-romance');
    const hold = page.getByRole('button', { name: 'اضغطوا مطوّلاً لرفع الستارة' });
    await hold.focus();
    await page.keyboard.down('Enter');
    await expect(page.locator('[data-phase="content"]')).toHaveCount(1, { timeout: 15_000 });
    await page.keyboard.up('Enter');

    await page.goto('/i/demo-dolce-vita');
    await expect(page.locator('[data-phase="gate"]')).toHaveCount(1);
    // Each revealed tile drops its "scratch to reveal" label, so always take the first one left.
    const tiles = page.getByRole('button', { name: /امسحوا لكشف/ });
    await expect(tiles).toHaveCount(3);
    for (let left = 3; left > 0; left--) {
      await tiles.first().focus();
      await page.keyboard.press('Enter');
      await expect(tiles).toHaveCount(left - 1);
    }
    await expect(page.locator('[data-phase="content"]')).toHaveCount(1, { timeout: 15_000 });
  });
});
