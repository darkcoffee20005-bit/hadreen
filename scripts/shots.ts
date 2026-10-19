/**
 * Captures review screenshots at 390×844 (phone) and 1440×900 (desktop) into screenshots/<phase>/.
 *
 *   pnpm shots phase-1                # against http://localhost:3100 (the e2e server)
 *   SHOTS_BASE_URL=http://localhost:3000 SHOTS_DATABASE_URL=$DATABASE_URL pnpm shots phase-1
 *
 * Needs the app running with seeded demo weddings. Reads tokens/secrets from the database so it
 * can open a personal invitation and a couple dashboard.
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { TEMPLATE_IDS } from '../src/lib/invite/types';

const phase = process.argv[2] ?? 'scratch';
const base = process.env.SHOTS_BASE_URL ?? 'http://localhost:3100';
const dbUrl = process.env.SHOTS_DATABASE_URL ?? process.env.E2E_DATABASE_URL!;
const out = join(process.cwd(), 'screenshots', phase);
const sizes = [
  { width: 390, height: 844, mobile: true },
  { width: 1440, height: 900, mobile: false },
];

async function main() {
  await mkdir(out, { recursive: true });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });
  const demo = await prisma.wedding.findUniqueOrThrow({
    where: { slug: 'demo-royal-gold' },
    include: { guests: { where: { rsvp: null }, take: 1 } },
  });
  await prisma.$disconnect();

  const pages: { name: string; path: string; full?: boolean; admin?: boolean }[] = [
    { name: 'home', path: '/', full: true },
    ...TEMPLATE_IDS.map((id) => ({ name: `invite-${id}`, path: `/i/demo-${id}`, full: true })),
    { name: 'invite-personal-hero', path: `/i/demo-royal-gold?g=${demo.guests[0]!.token}` },
    { name: 'invite-not-found', path: '/i/missing-invitation' },
    { name: 'dashboard', path: `/d/demo-royal-gold?k=${demo.coupleSecret}`, full: true },
    { name: 'admin-login', path: '/admin/login' },
    { name: 'admin-list', path: '/admin', full: true, admin: true },
    { name: 'admin-editor', path: `/admin/weddings/${demo.id}`, admin: true },
  ];

  const browser = await chromium.launch();
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      isMobile: size.mobile,
      hasTouch: size.mobile,
      locale: 'ar-IQ',
      timezoneId: 'Asia/Baghdad',
      userAgent: 'HadreenScreenshots/1.0 (headless)', // excluded from analytics
    });
    const page = await context.newPage();
    let loggedIn = false;
    for (const p of pages) {
      if (p.admin && !loggedIn) {
        await logIn(page);
        loggedIn = true;
      }
      await page.goto(base + p.path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(p.name === 'admin-editor' ? 1200 : 300); // let the preview iframe render
      const file = join(out, `${p.name}-${size.width}x${size.height}.png`);
      await page.screenshot({ path: file, fullPage: p.full ?? false });
      console.log(file);
    }
    await context.close();
  }
  await browser.close();

  // Share images (fixed 1200×630).
  for (const id of TEMPLATE_IDS) {
    const html = await (await fetch(`${base}/i/demo-${id}`)).text();
    const src = /property="og:image" content="([^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, '&');
    if (!src) continue;
    const png = Buffer.from(await (await fetch(src.replace(/^https?:\/\/[^/]+/, base))).arrayBuffer());
    const file = join(out, `og-${id}-1200x630.png`);
    await writeFile(file, png);
    console.log(file);
  }
}

async function logIn(page: Page) {
  await page.goto(`${base}/admin/login`);
  await page.getByLabel('كلمة المرور').fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForURL(/\/admin$/);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
