// Dev helper: screenshot one invitation moment and print the engine probe.
//   node scripts/peek.mjs "http://localhost:3000/i/demo-royal-gold?tier=medium&capture=gate" out.png [width] [height] [timeoutMs]
// Capture mode (?capture=gate|mid|content) publishes window.__hadreen.ready when the frame is set.
import { chromium } from '@playwright/test';

const [, , url, out, w = '390', h = '844', timeout = '120000'] = process.argv;
if (!url || !out) {
  console.error('usage: node scripts/peek.mjs <url> <out.png> [width] [height] [timeoutMs]');
  process.exit(2);
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(`console error: ${m.text().slice(0, 400)}`);
});
page.on('pageerror', (e) => logs.push(`page error: ${e.message.slice(0, 400)}`));
await page.goto(url, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__hadreen?.ready === true, null, { timeout: +timeout });
} catch {
  logs.push('NOT READY: ' + JSON.stringify(await page.evaluate(() => ({ ...window.__hadreen, renderInfo: undefined }))));
}
await page.waitForTimeout(400);
const probe = await page.evaluate(() => ({ ...window.__hadreen, renderInfo: window.__hadreen?.renderInfo?.() }));
console.log(JSON.stringify(probe));
await page.screenshot({ path: out });
if (logs.length) console.log(logs.slice(0, 12).join('\n'));
await browser.close();
