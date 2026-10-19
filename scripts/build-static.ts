/**
 * Copies the static files the 3D engine loads at runtime:
 *  - public/detect-gpu/*.json : detect-gpu benchmarks, self-hosted instead of fetched from unpkg.
 * Run: pnpm static
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const GPU_SRC = join(ROOT, 'node_modules/detect-gpu/dist/benchmarks');
const GPU_OUT = join(ROOT, 'public/detect-gpu');

async function main() {
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
