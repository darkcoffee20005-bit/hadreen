import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const tier of ['low','medium']) {
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://localhost:3100/i/demo-eternal-romance?tier=${tier}&capture=gate`);
await page.waitForFunction(() => window.__hadreen?.ready, null, { timeout: 120000 });
await page.waitForTimeout(1000);
const luma = await page.evaluate(() => {
  const c = document.querySelector('canvas'); const g = c.getContext('webgl2');
  const w = g.drawingBufferWidth, h = g.drawingBufferHeight, px = new Uint8Array(4), r = [];
  for (let i=0;i<5;i++) for (let j=0;j<5;j++){ g.readPixels(Math.floor((i+.5)/5*w), Math.floor((j+.5)/5*h),1,1,g.RGBA,g.UNSIGNED_BYTE,px); r.push(Math.round(.2126*px[0]+.7152*px[1]+.0722*px[2])); }
  return r.sort((a,b)=>a-b);
});
console.log(tier, luma.join(','));
await page.screenshot({ path: `${out}/er-${tier}.png` });
}
await browser.close();
