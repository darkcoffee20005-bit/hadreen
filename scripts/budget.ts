/**
 * Performance budget per template, measured in a real browser against a production build:
 *   - bytes transferred before the gate is ready ("before intro"), 3D path and 2D path
 *   - draw calls / triangles / textures of a gate frame and a content frame (3D, medium tier)
 *
 *   pnpm build && pnpm start --port 3100 &   # (or let `pnpm e2e` start it)
 *   pnpm budget                               # BUDGET_BASE_URL=http://localhost:3100
 *
 * Fails (exit 1) when any template passes the hard cap of 2.5 MB before intro; warns when it
 * passes its own budget (TemplateMeta.budgetKB). Writes reports/budget.json and budget.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { TEMPLATE_IDS } from '../src/lib/invite/types';
import { getTemplate } from '../src/templates';

const base = process.env.BUDGET_BASE_URL ?? 'http://localhost:3100';
const HARD_CAP_KB = 2500;
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

type RenderInfo = Record<string, number>;
interface Row {
  template: string;
  budgetKB: number;
  kb3d: number;
  kb2d: number;
  gate: RenderInfo | null;
  content: RenderInfo | null;
  requests3d: number;
}

async function measure(browser: Browser, path: string, until: 'introReady' | 'ready') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const bytes = new Map<string, number>();
  cdp.on('Network.loadingFinished', (e) => bytes.set(e.requestId, e.encodedDataLength));
  await page.goto(base + path, { waitUntil: 'commit' });
  await page.waitForFunction((key) => (window as unknown as { __hadreen?: Record<string, unknown> }).__hadreen?.[key] === true, until, {
    timeout: 120_000,
  });
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const info = await page.evaluate(() => {
    const probe = (window as unknown as { __hadreen?: { path?: string; renderInfo?: () => RenderInfo } }).__hadreen;
    return { path: probe?.path, render: probe?.renderInfo?.() ?? null };
  });
  await context.close();
  return { kb: Math.round(total / 1024), requests: bytes.size, ...info };
}

async function main() {
  const browser = await chromium.launch({ args: GL_ARGS });
  const rows: Row[] = [];
  for (const id of TEMPLATE_IDS) {
    const slug = `/i/demo-${id}`;
    const intro3d = await measure(browser, `${slug}?tier=medium`, 'introReady');
    const intro2d = await measure(browser, `${slug}?force2d=1`, 'introReady');
    const gate = await measure(browser, `${slug}?tier=medium&capture=gate`, 'ready');
    const content = await measure(browser, `${slug}?tier=medium&capture=content`, 'ready');
    if (intro3d.path !== '3d') console.warn(`${id}: expected the 3D path, got ${intro3d.path}`);
    rows.push({
      template: id,
      budgetKB: getTemplate(id).budgetKB,
      kb3d: intro3d.kb,
      kb2d: intro2d.kb,
      requests3d: intro3d.requests,
      gate: gate.render,
      content: content.render,
    });
    console.log(`${id}: 3D ${intro3d.kb} KB · 2D ${intro2d.kb} KB · gate ${JSON.stringify(gate.render)}`);
  }
  await browser.close();

  const out = join(process.cwd(), 'reports');
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'budget.json'), JSON.stringify({ measuredAt: new Date().toISOString(), base, rows }, null, 2));
  const md = [
    '| Template | Budget | 3D before intro | 2D before intro | Requests (3D) | Gate calls / tris | Content calls / tris |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map(
      (r) =>
        `| ${r.template} | ${r.budgetKB} KB | ${r.kb3d} KB | ${r.kb2d} KB | ${r.requests3d} | ${r.gate?.calls ?? '–'} / ${r.gate?.triangles ?? '–'} | ${r.content?.calls ?? '–'} / ${r.content?.triangles ?? '–'} |`,
    ),
  ].join('\n');
  await writeFile(join(out, 'budget.md'), md + '\n');
  console.log('\n' + md);

  const over = rows.filter((r) => r.kb3d > HARD_CAP_KB || r.kb2d > HARD_CAP_KB);
  for (const r of rows.filter((r) => r.kb3d > r.budgetKB)) console.warn(`warning: ${r.template} is over its own budget (${r.kb3d} > ${r.budgetKB} KB)`);
  if (over.length) {
    console.error(`FAIL: over the ${HARD_CAP_KB} KB cap before intro: ${over.map((r) => r.template).join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
