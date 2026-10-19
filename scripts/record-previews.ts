/**
 * Records each design's opening for the marketing site: frame by frame at 390×844, with the
 * engine's video capture clock (?capture=video), so headless software rendering can't stutter.
 * ffmpeg encodes an MP4 (H.264, faststart; smaller than VP9 at equal quality here) and a poster into public/previews/, and
 * src/site/previews.data.ts lists the designs that have one.
 *
 *   pnpm previews [template…]          # against PREVIEWS_BASE_URL (default http://localhost:3100)
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { TEMPLATE_IDS } from '../src/lib/invite/types';

const base = process.env.PREVIEWS_BASE_URL ?? 'http://localhost:3100';
const FPS = 24;
const GATE_HOLD = 0.9; // seconds of the closed gate before the opening
const END_HOLD = 1.4; // seconds held on the final frame
const out = join(process.cwd(), 'public', 'previews');
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

type Probe = { ready?: boolean; introDuration?: number; open?: () => void; frame?: (intro: number | null, clock: number) => void };

async function record(id: string, browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(`${base}/i/demo-${id}?tier=medium&capture=video`, { waitUntil: 'load' });
  await page.waitForFunction(() => (window as unknown as { __hadreen?: Probe }).__hadreen?.ready === true, null, { timeout: 180_000 });
  await page.waitForTimeout(500);
  const duration = await page.evaluate(() => (window as unknown as { __hadreen: Probe }).__hadreen.introDuration ?? 0);
  if (!duration) throw new Error(`${id}: no opening registered (is the 3D path running?)`);

  const dir = await mkdtemp(join(tmpdir(), `preview-${id}-`));
  const total = Math.ceil((GATE_HOLD + duration + END_HOLD) * FPS);
  let opened = false;
  for (let k = 0; k < total; k++) {
    const t = k / FPS;
    const intro = t < GATE_HOLD ? null : Math.min(duration, t - GATE_HOLD);
    if (intro !== null && !opened) {
      await page.evaluate(() => (window as unknown as { __hadreen: Probe }).__hadreen.open?.());
      opened = true;
    }
    await page.evaluate(([i, c]) => (window as unknown as { __hadreen: Probe }).__hadreen.frame?.(i, c), [intro, t] as const);
    await page.screenshot({ path: join(dir, `f${String(k).padStart(4, '0')}.png`) });
    if (k % 48 === 0) console.log(`${id}: frame ${k}/${total}`);
  }
  await page.close();

  const input = join(dir, 'f%04d.png');
  const ff = (args: string[]) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  ff(['-framerate', String(FPS), '-i', input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, `${id}.mp4`)]);
  const posterFrame = Math.round((GATE_HOLD + duration * 0.8) * FPS);
  ff(['-i', join(dir, `f${String(Math.min(total - 1, posterFrame)).padStart(4, '0')}.png`), '-q:v', '4', join(out, `${id}.jpg`)]);
  await rm(dir, { recursive: true, force: true });
  console.log(`${id}: done`);
}

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? TEMPLATE_IDS.filter((id) => wanted.includes(id)) : [...TEMPLATE_IDS];
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ args: GL_ARGS });
  for (const id of ids) await record(id, browser);
  await browser.close();

  const have = (await readdir(out)).filter((f) => f.endsWith('.mp4')).map((f) => f.replace(/\.mp4$/, ''));
  const list = TEMPLATE_IDS.filter((id) => have.includes(id));
  await writeFile(
    join(process.cwd(), 'src', 'site', 'previews.data.ts'),
    `// Written by scripts/record-previews.ts: the designs that have a recorded preview (video + poster).\nexport const PREVIEWS: readonly string[] = ${JSON.stringify(list)};\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
