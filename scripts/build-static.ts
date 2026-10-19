/**
 * Builds the static files the 3D engine loads at runtime:
 *  - public/fonts/webgl/*.woff : subsets of the brand fonts for troika (WebGL text). Arabic shaping
 *    needs the GSUB/GPOS tables, which HarfBuzz's subsetter keeps.
 *  - public/detect-gpu/*.json   : detect-gpu benchmarks, self-hosted instead of fetched from unpkg.
 * Run: pnpm static
 */
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const ROOT = process.cwd();
const FONT_SRC = join(ROOT, 'src/assets/fonts');
const FONT_OUT = join(ROOT, 'public/fonts/webgl');
const GPU_SRC = join(ROOT, 'node_modules/detect-gpu/dist/benchmarks');
const GPU_OUT = join(ROOT, 'public/detect-gpu');

const range = (from: number, to: number) => String.fromCodePoint(...Array.from({ length: to - from + 1 }, (_, i) => from + i));

// Names and greetings are typed by people, so keep whole blocks rather than a list of words.
const ARABIC =
  range(0x0600, 0x06ff) + // Arabic (incl. ٠-٩, ، ؛ ؟, tatweel, harakat)
  range(0x0750, 0x077f) + // Arabic Supplement
  range(0x200c, 0x200f) + // ZWNJ, ZWJ, LRM, RLM
  ' –—‘’“”…«»♥♡✦';
const LATIN = range(0x20, 0x7e) + range(0xa0, 0xff);

const FONTS: { file: string; text: string }[] = [
  { file: 'ArefRuqaa-700', text: ARABIC + LATIN },
  { file: 'ArefRuqaa-400', text: ARABIC + LATIN },
  { file: 'Amiri-400', text: ARABIC + LATIN },
  { file: 'Tajawal-500', text: ARABIC + LATIN },
  { file: 'PinyonScript-400', text: LATIN },
  { file: 'CormorantGaramond-500', text: LATIN },
];

async function main() {
  await mkdir(FONT_OUT, { recursive: true });
  for (const f of FONTS) {
    const source = await readFile(join(FONT_SRC, `${f.file}.ttf`));
    const out = await subsetFont(source, f.text, { targetFormat: 'woff' });
    await writeFile(join(FONT_OUT, `${f.file}.woff`), out);
    console.log(`fonts/webgl/${f.file}.woff`.padEnd(40), `${(source.length / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(0)} KB`);
  }

  await mkdir(GPU_OUT, { recursive: true });
  let bytes = 0;
  for (const name of await readdir(GPU_SRC)) {
    if (!name.endsWith('.json')) continue;
    await copyFile(join(GPU_SRC, name), join(GPU_OUT, name));
    bytes += (await stat(join(GPU_OUT, name))).size;
  }
  console.log(`detect-gpu benchmarks: ${(bytes / 1024).toFixed(0)} KB (one file is fetched per device)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
