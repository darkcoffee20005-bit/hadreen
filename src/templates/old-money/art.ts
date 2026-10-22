import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { hexToRgb } from '@/lib/invite/stage/color';
import { canvas, heightToNormal } from '@/lib/invite/stage/textures';
import { ENVELOPE, FLAP_DEPTH } from './layout';

/**
 * The envelope's paper, drawn on canvases: a cotton-rag grain, the folds of the back, and the
 * couple's monogram blind-embossed on the flap (raised, faintly gilded).
 */

/** Cotton-paper grain as a height map: soft clouds plus short fibres. Seeded. */
export function paperGrain(w: number, h: number, seed = 7, fibres = 1): HTMLCanvasElement {
  const [c, ctx] = canvas(w, h);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  // Clouds: the pulp's uneven thickness.
  ctx.filter = `blur(${Math.round(w / 60)}px)`;
  for (let i = 0; i < 60; i++) {
    const v = 110 + Math.round(rand() * 36);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, (0.04 + rand() * 0.1) * w, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';
  // Fibres.
  ctx.lineCap = 'round';
  const n = Math.round(((w * h) / 90) * fibres);
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI * 2;
    const len = 2 + rand() * 7;
    const v = rand() < 0.5 ? 255 : 0;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.05 + rand() * 0.08})`;
    ctx.lineWidth = 0.6 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  return c;
}

/** The envelope's back: grain plus the creases where the side flaps and the pocket meet. */
export function bodyNormal(size = 512): CanvasTexture {
  const w = size;
  const h = Math.round((size * ENVELOPE.height) / ENVELOPE.width);
  const c = paperGrain(w, h, 11);
  const ctx = c.getContext('2d')!;
  ctx.filter = 'blur(1.5px)';
  ctx.lineWidth = 2.2;
  const meet = h * 0.56; // the pocket's folds meet under the flap's tip
  // Pocket edges: a valley line (dark) with a raised paper edge (light) just above it.
  ctx.strokeStyle = 'rgba(40,40,40,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w / 2, meet);
  ctx.lineTo(w, h);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,230,230,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, h - 3);
  ctx.lineTo(w / 2, meet - 3);
  ctx.lineTo(w, h - 3);
  ctx.stroke();
  // Side flaps under the pocket, fainter.
  ctx.strokeStyle = 'rgba(70,70,70,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.36, meet * 0.98);
  ctx.moveTo(w, 0);
  ctx.lineTo(w * 0.64, meet * 0.98);
  ctx.stroke();
  ctx.filter = 'none';
  const tex = heightToNormal(c, 1.4);
  tex.anisotropy = 4;
  return tex;
}

/**
 * The flap's colour and normal maps. Canvas x spans the envelope's width, canvas y runs down
 * the flap from the hinge (top) to the tip. The monogram sits where the tip points.
 */
export async function flapMaps(monogram: string, family: string, paper: string, relief: string, width = 1024): Promise<{ map: CanvasTexture; normal: CanvasTexture }> {
  const w = width;
  const h = Math.round((width * FLAP_DEPTH) / ENVELOPE.width);
  const px = Math.round(h * 0.2);
  const font = `700 ${px}px ${family}`;
  try {
    await document.fonts.load(font, monogram);
  } catch {
    // the fallback face still embosses
  }

  // The letters alone (for the gilding) …
  const [mono, mctx] = canvas(w, h);
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, w, h);
  mctx.filter = 'blur(1.6px)';
  mctx.fillStyle = '#fff';
  mctx.font = font;
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';
  mctx.direction = 'rtl';
  mctx.fillText(monogram, w / 2, h * 0.56, w * 0.22);
  // A hairline oval around them, as a die would press.
  mctx.lineWidth = 2;
  mctx.strokeStyle = 'rgba(255,255,255,0.55)';
  mctx.beginPath();
  mctx.ellipse(w / 2, h * 0.56, w * 0.085, h * 0.19, 0, 0, Math.PI * 2);
  mctx.stroke();

  // … and on the grain for the relief.
  const height = paperGrain(w, h, 23, 0.8);
  const hctx = height.getContext('2d')!;
  hctx.globalCompositeOperation = 'lighter';
  hctx.globalAlpha = 0.55;
  hctx.drawImage(mono, 0, 0);
  hctx.globalCompositeOperation = 'source-over';
  hctx.globalAlpha = 1;

  const normal = heightToNormal(height, 2.2);
  normal.anisotropy = 4;

  const [col, cctx] = canvas(w, h);
  const src = mono.getContext('2d')!.getImageData(0, 0, w, h).data;
  const img = cctx.createImageData(w, h);
  const [ar, ag, ab] = hexToRgb(paper);
  const [br, bg, bb] = hexToRgb(relief);
  for (let i = 0; i < src.length; i += 4) {
    const t = Math.min(1, (src[i]! / 255) * 0.9);
    img.data[i] = ar + (br - ar) * t;
    img.data[i + 1] = ag + (bg - ag) * t;
    img.data[i + 2] = ab + (bb - ab) * t;
    img.data[i + 3] = 255;
  }
  cctx.putImageData(img, 0, 0);
  const map = new CanvasTexture(col);
  map.colorSpace = SRGBColorSpace;
  map.minFilter = LinearFilter;
  map.anisotropy = 4;
  return { map, normal };
}
