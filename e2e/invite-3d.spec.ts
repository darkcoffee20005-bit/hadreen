import { expect, test } from '@playwright/test';

// SwiftShader WebGL for this file; ?tier= pins the 3D path (detect-gpu would pick 2D for it).
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } });
test.setTimeout(150_000);

test('3D path: loads, opens, skips, hands off to the content', async ({ page }) => {
  await page.goto('/i/demo-royal-gold?tier=low');
  const shell = page.locator('[data-path]');
  await expect(shell).toHaveAttribute('data-path', '3d', { timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(shell).toHaveAttribute('data-phase', 'gate', { timeout: 90_000 });

  await page.getByRole('button', { name: 'افتحوا الدعوة' }).click();
  await expect(shell).toHaveAttribute('data-phase', 'opening');
  await page.getByRole('button', { name: 'تخطّي الحركة' }).click();
  await expect(shell).toHaveAttribute('data-phase', 'content', { timeout: 10_000 });
  await expect(page.locator('#invite-hero')).toBeVisible();
  // The stage keeps living behind the content.
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('3D path: the old-money envelope plays its whole opening into the details card', async ({ page }) => {
  await page.goto('/i/demo-old-money?tier=medium');
  const shell = page.locator('[data-path]');
  await expect(shell).toHaveAttribute('data-path', '3d', { timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-phase', 'gate', { timeout: 90_000 });
  await expect(page.getByText('اضغطوا على الظرف للفتح')).toBeVisible();

  await page.getByRole('button', { name: 'افتحوا الدعوة' }).click();
  await expect(shell).toHaveAttribute('data-phase', 'content', { timeout: 30_000 });
  await expect(page.locator('#invite-hero')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'التفاصيل' })).toBeAttached();
  // Programme items get their line icons from their titles.
  await expect(page.locator('#programme li[data-icon="rings"]')).toHaveCount(1);
});

test('White House Hall (exclusive): the card opens onto the hall and the page names the hall', async ({ page }) => {
  await page.goto('/i/demo-white-house-hall?tier=low');
  const shell = page.locator('[data-path]');
  await expect(shell).toHaveAttribute('data-path', '3d', { timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-phase', 'gate', { timeout: 90_000 });
  await page.getByRole('button', { name: 'افتحوا الدعوة' }).click();
  await expect(shell).toHaveAttribute('data-phase', 'opening');
  // The whole opening plays through to the content on its own.
  await expect(shell).toHaveAttribute('data-phase', 'content', { timeout: 30_000 });
  await expect(page.locator('#invite-hero')).toBeVisible();
  await expect(page.locator('#venue')).toContainText('قاعة البيت الأبيض');
  await expect(page.locator('#venue a', { hasText: 'افتحوا الموقع' })).toHaveAttribute('href', /google\.com\/maps/);
  expect(await page.content()).not.toMatch(/07708|tel:|\+964/);
});

test('3D path: Escape skips the opening', async ({ page }) => {
  await page.goto('/i/demo-royal-gold?tier=low');
  const shell = page.locator('[data-path]');
  await expect(shell).toHaveAttribute('data-phase', 'gate', { timeout: 90_000 });
  await page.getByRole('button', { name: 'افتحوا الدعوة' }).click();
  await expect(shell).toHaveAttribute('data-phase', 'opening');
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-phase', 'content', { timeout: 10_000 });
});
