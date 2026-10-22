import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas, heightToNormal } from '@/lib/invite/stage/textures';
import { CARD, DRAW, SEAL_Y } from './camera';
import { ELEVATION_H, ELEVATION_W, FANLIGHT, facadeStrokes, PEDIMENT_TEXT, toDrawing } from './facade';

/**
 * Procedural textures for white-house-hall: the letterpress card, its line drawing, the night
 * façade's lights and the white hall's marble, panels and ceiling. All drawn on canvases.
 */

export async function loadFonts(fonts: string[], sample: string): Promise<void> {
  await Promise.all(fonts.map((f) => document.fonts.load(f, sample).catch(() => undefined)));
}

/** Strokes the elevation into a 2D context whose transform maps drawing space to pixels. */
function strokeFacade(ctx: CanvasRenderingContext2D, k: number, weight: number) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of facadeStrokes()) {
    ctx.lineWidth = (weight * (0.45 + s.w * 0.55)) / k;
    ctx.stroke(new Path2D(s.d));
  }
}

/**
 * The façade drawing as an alpha map: white ink on black, the hall's name lettered in the
 * tympanum. `px` is the width in pixels; line weight scales with it.
 */
export function drawingTexture(px: number, name: string, family: string): CanvasTexture {
  const k = px / ELEVATION_W;
  const [c, ctx] = canvas(px, Math.round(ELEVATION_H * k));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.scale(k, k);
  ctx.strokeStyle = '#fff';
  strokeFacade(ctx, k, Math.max(1.4, px / 430));
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `400 ${Math.round(PEDIMENT_TEXT.size * k)}px ${family}`;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(name, PEDIMENT_TEXT.x * k, PEDIMENT_TEXT.y * k);
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface CardText {
  greeting: string;
  lead: string;
  names: string;
  date: string;
  display: string; // CSS font family for the names
  serif: string;
}

/** Fibres and soft cloud in a paper ground (shared by colour and height). */
function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, seed: number, strength: number) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(seed);
  ctx.globalAlpha = 0.05 * strength;
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w * (0.1 + rand() * 0.3));
    g.addColorStop(0, rand() > 0.5 ? '#ffffff' : '#000000');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalAlpha = 0.07 * strength;
  ctx.lineWidth = 1;
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 2 + rand() * 7;
    ctx.strokeStyle = rand() > 0.5 ? '#ffffff' : '#5a554c';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Everything printed on the card, in card units mapped by `k` px per unit (y down from the top). */
function printCard(ctx: CanvasRenderingContext2D, k: number, text: CardText, ink: string, withDrawing: boolean, name: string) {
  const W = CARD.w * k;
  const Y = (y: number) => (CARD.h / 2 - y) * k; // card y (up, centre origin) → px
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  // Double rule border.
  ctx.lineWidth = Math.max(1, k * 0.008);
  const i1 = 0.11 * k;
  ctx.strokeRect(i1, i1, W - i1 * 2, CARD.h * k - i1 * 2);
  ctx.lineWidth = Math.max(1, k * 0.004);
  const i2 = 0.15 * k;
  ctx.strokeRect(i2, i2, W - i2 * 2, CARD.h * k - i2 * 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'rtl';
  ctx.font = `400 ${Math.round(0.12 * k)}px ${text.serif}`;
  ctx.fillText(text.greeting, W / 2, Y(1.86));

  if (withDrawing) {
    ctx.save();
    const k2 = (DRAW.w * k) / ELEVATION_W;
    ctx.translate(W / 2 - (DRAW.w * k) / 2, Y(DRAW.cy + DRAW.h / 2));
    ctx.scale(k2, k2);
    strokeFacade(ctx, k2, Math.max(1.1, k / 220));
    ctx.restore();
    ctx.font = `400 ${Math.round(PEDIMENT_TEXT.size * ((DRAW.w * k) / ELEVATION_W))}px ${text.serif}`;
    const [px, py] = [PEDIMENT_TEXT.x * ((DRAW.w * k) / ELEVATION_W), PEDIMENT_TEXT.y * ((DRAW.w * k) / ELEVATION_W)];
    ctx.fillText(name, W / 2 - (DRAW.w * k) / 2 + px, Y(DRAW.cy + DRAW.h / 2) + py);
  }

  // A hairline with a small lozenge, then the lead, the names and the date.
  const ruleY = Y(-0.47);
  ctx.lineWidth = Math.max(1, k * 0.004);
  ctx.beginPath();
  ctx.moveTo(W / 2 - 0.55 * k, ruleY);
  ctx.lineTo(W / 2 - 0.08 * k, ruleY);
  ctx.moveTo(W / 2 + 0.08 * k, ruleY);
  ctx.lineTo(W / 2 + 0.55 * k, ruleY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2, ruleY - 0.045 * k);
  ctx.lineTo(W / 2 + 0.045 * k, ruleY);
  ctx.lineTo(W / 2, ruleY + 0.045 * k);
  ctx.lineTo(W / 2 - 0.045 * k, ruleY);
  ctx.closePath();
  ctx.stroke();

  ctx.font = `400 ${Math.round(0.115 * k)}px ${text.serif}`;
  ctx.fillText(text.lead, W / 2, Y(-0.7));
  ctx.font = `700 ${Math.round(0.4 * k)}px ${text.display}`;
  ctx.fillText(text.names, W / 2, Y(-1.13), W - 0.5 * k);
  ctx.font = `400 ${Math.round(0.118 * k)}px ${text.serif}`;
  ctx.fillText(text.date, W / 2, Y(-1.37));
}

/** The letterpress card: colour (paper and ink) and a normal map where everything is pressed in. */
export function cardTextures(k: number, text: CardText, paper: string, ink: string, name: string) {
  const w = Math.round(CARD.w * k);
  const h = Math.round(CARD.h * k);
  const [c, ctx] = canvas(w, h);
  paperGrain(ctx, w, h, paper, 11, 0.35);
  ctx.globalAlpha = 0.93;
  printCard(ctx, k, text, ink, false, name);
  ctx.globalAlpha = 1;
  // A soft dent under where the seal sits.
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;

  const [hc, hctx] = canvas(w, h);
  paperGrain(hctx, w, h, '#b4b4b4', 11, 0.9);
  hctx.filter = `blur(${Math.max(1, k / 260)}px)`;
  printCard(hctx, k, text, '#303030', true, name);
  hctx.filter = 'none';
  const sealY = (CARD.h / 2 - SEAL_Y) * k;
  const g = hctx.createRadialGradient(w / 2, sealY, 0, w / 2, sealY, 0.42 * k);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  hctx.fillStyle = g;
  hctx.fillRect(0, 0, w, h);
  const normal = heightToNormal(hc, 2.4);
  return { map, normal };
}

/** A soft vignette pool for the black ground behind the card. */
export function poolTexture(): CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#2a2824');
  g.addColorStop(0.45, '#121110');
  g.addColorStop(1, '#050505');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Vertical uplight wash: bright at the foot, fading up, soft at the sides (alpha). */
export function washTexture(): CanvasTexture {
  const [c, ctx] = canvas(64, 256);
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) {
    const v = 1 - y / 255; // 1 at the bottom (canvas bottom = texture v 0 → flip below)
    for (let x = 0; x < 64; x++) {
      const u = (x - 31.5) / 32;
      const spread = 0.35 + 0.65 * (1 - v); // wider as it rises
      const side = Math.exp(-(u * u) / (spread * spread * 0.35));
      const a = Math.pow(v, 1.6) * 0.9 * side + Math.pow(v, 6) * 0.4;
      const i = ((255 - y) * 64 + x) * 4;
      const val = Math.round(Math.min(1, a) * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}

/** A scallop of light thrown up a wall by a floor lamp (alpha). */
export function scallopTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 128, 128);
  ctx.filter = 'blur(6px)';
  const g = ctx.createRadialGradient(64, 132, 4, 64, 132, 120);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.5, '#777');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(14, 128);
  ctx.quadraticCurveTo(30, 30, 64, 8);
  ctx.quadraticCurveTo(98, 30, 114, 128);
  ctx.closePath();
  ctx.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}

/** A round soft glow (alpha), for halos and floor reflections. */
export function glowTexture(size = 128): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.25, '#9a9a9a');
  g.addColorStop(0.6, '#262626');
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}

/** The fanlight: warm glass behind the wrought-iron crest (taken from the drawing itself). */
export function fanlightTexture(px = 512): CanvasTexture {
  const { cy, r } = FANLIGHT;
  const h = Math.round(px / 2);
  const [c, ctx] = canvas(px, h);
  const g = ctx.createRadialGradient(px / 2, h, 0, px / 2, h, h);
  g.addColorStop(0, '#fff6e2');
  g.addColorStop(0.5, '#ffd9a0');
  g.addColorStop(1, '#c98a46');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px / 2, h, h * 0.985, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Map the drawing's fanlight box onto this canvas: x ∈ [-r, r], y ∈ [cy, cy + r].
  const k = px / (2 * r);
  const [ox, oy] = toDrawing(-r, cy + r);
  ctx.scale(k, k);
  ctx.translate(-ox, -oy);
  ctx.strokeStyle = '#121212';
  strokeFacade(ctx, k, 4.5);
  ctx.restore();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A tall window at night: warm sheer curtain glow, glazing bars. */
export function windowTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 320);
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#f7d7a6');
  g.addColorStop(1, '#ffe9c8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 320);
  // Sheer curtains: soft vertical folds, gathered at the sides.
  for (let x = 0; x < 128; x += 6) {
    ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.1 * Math.sin(x * 0.7)})`;
    ctx.fillRect(x, 0, 3, 320);
  }
  ctx.strokeStyle = '#1a1714';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, 123, 315);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(64, 320);
  ctx.moveTo(0, 105);
  ctx.lineTo(128, 105);
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Raised panels on the black doors (height → normal). */
export function doorNormal(): CanvasTexture {
  const [c, ctx] = canvas(128, 512);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 512);
  ctx.filter = 'blur(2px)';
  for (const [y0, y1] of [
    [30, 190],
    [230, 470],
  ] as const) {
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(16, y0, 96, y1 - y0);
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(24, y0 + 8, 80, y1 - y0 - 16);
  }
  return heightToNormal(c, 3);
}

/** Black-and-white marble laid on the diagonal, with soft veins. One tile repeat = 2 × 2 tiles. */
export function marbleTexture(px = 512, light = '#F2EFE8', dark = '#1B1B1B'): CanvasTexture {
  const [c, ctx] = canvas(px, px);
  const rand = mulberry32(5);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, px, px);
  ctx.save();
  ctx.translate(px / 2, px / 2);
  ctx.rotate(Math.PI / 4);
  const s = px / Math.SQRT2 / 2;
  ctx.fillStyle = dark;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * s - s / 2, j * s - s / 2, s, s);
  ctx.restore();
  // Veins: wandering hairlines in both stones.
  ctx.lineWidth = 1;
  for (let v = 0; v < 26; v++) {
    ctx.strokeStyle = v % 2 ? 'rgba(160,150,135,0.35)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    let x = rand() * px;
    let y = rand() * px;
    ctx.moveTo(x, y);
    for (let k = 0; k < 14; k++) {
      x += (rand() - 0.3) * px * 0.08;
      y += (rand() - 0.5) * px * 0.06;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Fine grout lines.
  ctx.save();
  ctx.translate(px / 2, px / 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(120,112,100,0.45)';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s - s / 2, -px);
    ctx.lineTo(i * s - s / 2, px);
    ctx.moveTo(-px, i * s - s / 2);
    ctx.lineTo(px, i * s - s / 2);
    ctx.stroke();
  }
  ctx.restore();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Off-white wall panelling: a dado rail, tall moulded panels, a frieze. One bay per repeat. */
export function wallTexture(): CanvasTexture {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = '#F3F0E9';
  ctx.fillRect(0, 0, 256, 512);
  const line = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  ctx.lineWidth = 2;
  const panel = (x0: number, y0: number, x1: number, y1: number) => {
    line(x0, y0, x1, y0, 'rgba(255,255,255,0.9)');
    line(x0, y0, x0, y1, 'rgba(255,255,255,0.9)');
    line(x1, y0, x1, y1, 'rgba(120,110,95,0.45)');
    line(x0, y1, x1, y1, 'rgba(120,110,95,0.45)');
  };
  panel(40, 60, 216, 330);
  panel(52, 72, 204, 318);
  panel(40, 380, 216, 470);
  line(0, 350, 256, 350, 'rgba(120,110,95,0.5)');
  line(0, 356, 256, 356, 'rgba(255,255,255,0.9)');
  line(0, 30, 256, 30, 'rgba(120,110,95,0.4)');
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  return t;
}

/** A coffered ceiling, one coffer per repeat. */
export function ceilingTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#EEEAE2';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#F7F5F0';
  ctx.fillRect(14, 14, 100, 100);
  ctx.strokeStyle = 'rgba(110,100,85,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 100, 100);
  ctx.strokeRect(24, 24, 80, 80);
  ctx.beginPath();
  ctx.arc(64, 64, 9, 0, Math.PI * 2);
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
