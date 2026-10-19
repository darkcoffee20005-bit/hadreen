import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as hb from 'harfbuzzjs';

/**
 * Satori (behind next/og) can't shape Arabic: it draws isolated, unjoined letters. So text for
 * share images is shaped with HarfBuzz and handed to Satori as SVG paths.
 */
export type OgFont = 'ArefRuqaa-700' | 'Amiri-400' | 'Amiri-700' | 'Tajawal-500' | 'PinyonScript-400' | 'CormorantGaramond-500';

const fonts = new Map<OgFont, Promise<{ font: hb.Font; upem: number; ascender: number; descender: number }>>();

function loadFont(name: OgFont) {
  let entry = fonts.get(name);
  if (!entry) {
    entry = readFile(join(process.cwd(), 'src/assets/fonts', `${name}.ttf`)).then((data) => {
      const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
      const font = new hb.Font(face);
      const { ascender, descender } = font.hExtents();
      return { font, upem: face.upem, ascender, descender };
    });
    fonts.set(name, entry);
  }
  return entry;
}

// Numbers (Western or Eastern Arabic, with :/.,) read left-to-right inside right-to-left text.
const NUMBER_RUN = /[0-9٠-٩]+(?:[:.,٫٬][0-9٠-٩]+)*/g;

function runs(text: string, rtl: boolean): { text: string; dir: 'ltr' | 'rtl' }[] {
  if (!rtl) return [{ text, dir: 'ltr' }];
  const out: { text: string; dir: 'ltr' | 'rtl' }[] = [];
  let last = 0;
  for (const m of text.matchAll(NUMBER_RUN)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), dir: 'rtl' });
    out.push({ text: m[0], dir: 'ltr' });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), dir: 'rtl' });
  // Right-to-left paragraph: runs are laid out from the right, so reverse them for left-to-right placement.
  return out.reverse();
}

export interface ShapedLine {
  /** data:image/svg+xml URI, ready for <img src> */
  src: string;
  width: number;
  height: number;
}

export async function shapeLine(
  text: string,
  options: { font: OgFont; size: number; color: string; rtl: boolean },
): Promise<ShapedLine> {
  const { font, upem, ascender, descender } = await loadFont(options.font);
  const scale = options.size / upem;
  const paths: string[] = [];
  let x = 0;

  for (const run of runs(text, options.rtl)) {
    const buffer = new hb.Buffer();
    buffer.addText(run.text);
    buffer.guessSegmentProperties();
    buffer.setDirection(run.dir === 'rtl' ? hb.Direction.RTL : hb.Direction.LTR);
    hb.shape(font, buffer);
    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    infos.forEach((info, i) => {
      const p = positions[i]!;
      const d = font.glyphToPath(info.codepoint);
      if (d) paths.push(`<path transform="translate(${x + p.xOffset} ${p.yOffset})" d="${d}"/>`);
      x += p.xAdvance;
    });
  }

  const pad = Math.round(upem * 0.08);
  const top = ascender + pad;
  const heightUnits = ascender - descender + pad * 2;
  const width = Math.ceil(x * scale) + 2;
  const height = Math.ceil(heightUnits * scale);
  // Font space is y-up; flip it into SVG space with the baseline at `top`.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${x} ${heightUnits}">` +
    `<g fill="${options.color}" transform="translate(0 ${top}) scale(1 -1)">${paths.join('')}</g></svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width, height };
}
