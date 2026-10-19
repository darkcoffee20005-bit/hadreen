/**
 * Downloads the brand fonts as TTF (SIL OFL 1.1) into src/assets/fonts.
 * Used by the OG image route (Satori/HarfBuzz need TTF) and, from Phase 2, for WebGL subsets.
 * Run: pnpm fonts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'src/assets/fonts');
const FAMILIES: { family: string; file: string; weights: number[] }[] = [
  { family: 'Aref Ruqaa', file: 'ArefRuqaa', weights: [400, 700] },
  { family: 'Amiri', file: 'Amiri', weights: [400, 700] },
  { family: 'Tajawal', file: 'Tajawal', weights: [500, 700] },
  { family: 'Cormorant Garamond', file: 'CormorantGaramond', weights: [500] },
  { family: 'Pinyon Script', file: 'PinyonScript', weights: [400] },
  { family: 'Jost', file: 'Jost', weights: [400] },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const f of FAMILIES) {
    // Without a modern User-Agent, the Google Fonts CSS API answers with TTF URLs.
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@${f.weights.join(';')}`)
    ).text();
    for (const block of css.split('@font-face').slice(1)) {
      const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
      const url = /url\((https:[^)]+\.ttf)\)/.exec(block)?.[1];
      if (!weight || !url) continue;
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      const name = `${f.file}-${weight}.ttf`;
      await writeFile(join(OUT, name), bytes);
      console.log(`${name.padEnd(28)} ${(bytes.length / 1024).toFixed(0)} KB`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
