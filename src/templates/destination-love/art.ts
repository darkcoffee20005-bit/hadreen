import { CanvasTexture, NoColorSpace, SRGBColorSpace } from 'three';
import type { Lang } from '@/lib/lang';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas, cssFontFamily } from '@/lib/invite/stage/textures';
import { cssFontVar, type TextRole } from '@/lib/invite/text3d/fonts';
import { PLANE_GLYPH } from './glyph';
import { barcode, MAIN_SHARE, PASS_ASPECT, type PassContent } from './pass';

/**
 * Canvas art for destination-love: the boarding pass (front, back, and a roughness/metalness map
 * so its gold foil glints), cloud wisps, and soft glows. Text is drawn by the browser's own
 * shaper, so Arabic joins exactly as in the DOM.
 */
export interface PassColors {
  paper: string;
  ink: string;
  inkSoft: string;
  accent: string;
  onAccent: string;
  gold: string;
  goldInk: string;
  night: string;
}

export { PLANE_GLYPH };
export const PASS_W = 1536;
export const PASS_H = Math.round(PASS_W / PASS_ASPECT);
const BAND = 112;
const RADIUS = 30;
const NOTCH = 24;

/** Where the perforation runs and which side is which. */
export function passLayout(rtl: boolean) {
  const perf = Math.round(rtl ? PASS_W * (1 - MAIN_SHARE) : PASS_W * MAIN_SHARE);
  return {
    perf,
    main: rtl ? ([perf, PASS_W] as const) : ([0, perf] as const),
    stub: rtl ? ([0, perf] as const) : ([perf, PASS_W] as const),
  };
}

const family = (lang: Lang, role: TextRole) => {
  const [v, f] = cssFontVar(lang, role);
  return cssFontFamily(v, f);
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Sets the largest font (≤ px) at which `text` fits in maxW; returns the size used. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, px: number, fam: string, maxW: number, min = px * 0.5): number {
  let size = px;
  ctx.font = `${weight} ${size}px ${fam}`;
  while (ctx.measureText(text).width > maxW && size > min) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fam}`;
  }
  return size;
}

function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size / 100, size / 100);
  ctx.translate(-50, -50);
  ctx.fill(new Path2D(PLANE_GLYPH));
  ctx.restore();
}

function cutNotches(ctx: CanvasRenderingContext2D, x: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (const y of [0, PASS_H]) {
    ctx.beginPath();
    ctx.arc(x, y, NOTCH, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

async function loadFonts(lang: Lang, sample: string) {
  const fonts = [`700 48px ${family(lang, 'ui')}`, `500 30px ${family(lang, 'ui')}`, `700 44px ${family(lang, 'serif')}`, `700 50px ${family(lang, 'display')}`];
  await Promise.all(fonts.map((f) => document.fonts.load(f, sample).catch(() => undefined)));
}

/**
 * The boarding pass, drawn once per invitation. Returns sRGB front/back maps and a packed
 * surface map (G = roughness, B = metalness: paper is matte, the gold foil is metal).
 */
export async function passTextures(c: PassContent, lang: Lang, col: PassColors): Promise<{ front: CanvasTexture; back: CanvasTexture; surface: CanvasTexture }> {
  await loadFonts(lang, `${c.title}${c.flight.value}${c.passenger.value}${c.gate.value}${c.date.value}${c.to}${c.from ?? ''}`);
  const rtl = c.rtl;
  const L = passLayout(rtl);
  const ui = family(lang, 'ui');
  const serif = family(lang, 'serif');
  const display = family(lang, 'display');
  const dir = rtl ? 'rtl' : 'ltr';
  const pad = 54;
  const [m0, m1] = L.main;
  const [s0, s1] = L.stub;
  const sx = (s0 + s1) / 2;
  /** x of a cell edge measured from the reading start of the main part. */
  const startX = (offset: number) => (rtl ? m1 - pad - offset : m0 + pad + offset);
  const mainW = m1 - m0 - pad * 2;

  const [front, f] = canvas(PASS_W, PASS_H);
  const [surf, g] = canvas(PASS_W, PASS_H);
  for (const ctx of [f, g]) {
    ctx.direction = dir;
    ctx.textBaseline = 'alphabetic';
  }

  // Paper.
  f.save();
  roundRect(f, 0, 0, PASS_W, PASS_H, RADIUS);
  f.clip();
  const paper = f.createLinearGradient(0, 0, 0, PASS_H);
  paper.addColorStop(0, '#FFFEFA');
  paper.addColorStop(1, col.paper);
  f.fillStyle = paper;
  f.fillRect(0, 0, PASS_W, PASS_H);
  // Security guilloche, very faint.
  f.strokeStyle = col.gold;
  f.globalAlpha = 0.11;
  f.lineWidth = 1.2;
  for (let k = 0; k < 9; k++) {
    f.beginPath();
    for (let x = m0; x <= m1; x += 8) {
      const y = BAND + 70 + k * 52 + Math.sin(x / 47 + k * 0.9) * 13 + Math.sin(x / 113 + k) * 7;
      if (x === m0) f.moveTo(x, y);
      else f.lineTo(x, y);
    }
    f.stroke();
  }
  f.globalAlpha = 1;
  // Emerald band across the top.
  f.fillStyle = col.accent;
  f.fillRect(0, 0, PASS_W, BAND);
  f.restore();

  g.fillStyle = 'rgb(0,186,0)';
  g.fillRect(0, 0, PASS_W, PASS_H);

  /** Gold foil elements: drawn in gold on the front and as "metal" on the surface map. */
  const foil = (ctx: CanvasRenderingContext2D, ink: string | CanvasGradient) => {
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.fillRect(0, BAND, PASS_W, 4);
    // Kicker + glyph on the band.
    ctx.textAlign = rtl ? 'left' : 'right';
    ctx.font = `500 30px ${ui}`;
    const kx = rtl ? m0 + pad + 46 : m1 - pad - 46;
    ctx.fillText(c.kicker, kx, 68);
    glyph(ctx, rtl ? m0 + pad + 16 : m1 - pad - 16, 58, 34, rtl ? -Math.PI / 2 : Math.PI / 2);
    // Stub title on the band.
    ctx.textAlign = 'center';
    fit(ctx, c.stubTitle, 700, 46, rtl ? display : ui, s1 - s0 - 70);
    ctx.fillText(c.stubTitle, sx, 74);
    // Route arc and plane.
    const yCity = 262;
    const ax0 = startX(0) + (rtl ? -250 : 250);
    const ax1 = startX(mainW) + (rtl ? 250 : -250);
    ctx.lineWidth = 4;
    ctx.setLineDash([2, 14]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax0, yCity - 28);
    ctx.quadraticCurveTo((ax0 + ax1) / 2, yCity - 120, ax1, yCity - 28);
    ctx.stroke();
    ctx.setLineDash([]);
    glyph(ctx, (ax0 + ax1) / 2, yCity - 74, 46, rtl ? -Math.PI / 2 - 0.08 : Math.PI / 2 + 0.08);
    for (const x of [ax0, ax1]) {
      ctx.beginPath();
      ctx.arc(x, yCity - 28, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // The couple, as the flight.
    ctx.textAlign = rtl ? 'right' : 'left';
    fit(ctx, c.flight.value, 700, 52, display, mainW * 0.5 - 20, 26);
    ctx.fillText(c.flight.value, startX(mainW * 0.5), 440);
    // Stub monogram seal.
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, 236, 74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, 236, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    fit(ctx, c.monogram, 700, 56, display, 112, 28);
    ctx.fillText(c.monogram, sx, 254);
  };
  const goldInk = f.createLinearGradient(0, 0, 0, PASS_H);
  goldInk.addColorStop(0, col.gold);
  goldInk.addColorStop(0.55, col.goldInk);
  goldInk.addColorStop(1, col.gold);
  foil(f, goldInk);
  foil(g, 'rgb(0,70,255)');

  // Band title.
  f.fillStyle = col.onAccent;
  f.textAlign = rtl ? 'right' : 'left';
  f.font = `700 50px ${ui}`;
  f.fillText(c.title, startX(0), 74);

  // Cities.
  const label = (text: string, x: number, y: number, align: CanvasTextAlign) => {
    f.fillStyle = col.goldInk;
    f.textAlign = align;
    f.font = `500 27px ${ui}`;
    f.fillText(text, x, y);
  };
  const value = (text: string, x: number, y: number, align: CanvasTextAlign, maxW: number, px = 42) => {
    f.fillStyle = col.ink;
    f.textAlign = align;
    fit(f, text, 700, px, serif, maxW, 22);
    f.fillText(text, x, y);
  };
  const near: CanvasTextAlign = rtl ? 'right' : 'left';
  const far: CanvasTextAlign = rtl ? 'left' : 'right';
  if (c.from) {
    label(c.fromLabel, startX(0), 186, near);
    value(c.from, startX(0), 262, near, 230, 60);
  }
  label(c.toLabel, startX(mainW), 186, far);
  value(c.to, startX(mainW), 262, far, 230, 60);

  // Fields.
  f.fillStyle = col.inkSoft;
  f.globalAlpha = 0.25;
  f.fillRect(rtl ? m0 + pad : m0 + pad, 312, mainW, 2);
  f.globalAlpha = 1;
  label(c.passenger.label, startX(0), 372, near);
  value(c.passenger.value, startX(0), 436, near, mainW * 0.5 - 30);
  label(c.flight.label, startX(mainW * 0.5), 372, near);
  label(c.date.label, startX(0), 506, near);
  value(c.date.value, startX(0), 566, near, mainW * 0.5 - 30, 38);
  label(c.time.label, startX(mainW * 0.5), 506, near);
  value(c.time.value, startX(mainW * 0.5), 566, near, mainW * 0.22, 38);
  label(c.gate.label, startX(mainW * 0.74), 506, near);
  value(c.gate.value, startX(mainW * 0.74), 566, near, mainW * 0.26, 38);

  // Stub: passenger and barcode.
  f.textAlign = 'center';
  f.fillStyle = col.goldInk;
  f.font = `500 25px ${ui}`;
  f.fillText(c.passenger.label, sx, 372);
  f.fillStyle = col.ink;
  fit(f, c.passenger.value, 700, 36, serif, s1 - s0 - 70, 20);
  f.fillText(c.passenger.value, sx, 420);
  const bars = barcode(`${c.flight.value}${c.passenger.value}`, 38);
  const unit = (s1 - s0 - 96) / bars.reduce((a, b) => a + b + 1.2, 0);
  let bx = s0 + 48;
  f.fillStyle = col.ink;
  bars.forEach((w, i) => {
    if (i % 2 === 0) f.fillRect(bx, 462, w * unit, 96);
    bx += (w + 1.2) * unit;
  });

  // Perforation.
  f.fillStyle = col.inkSoft;
  for (let y = NOTCH + 20; y < PASS_H - NOTCH - 12; y += 19) {
    f.beginPath();
    f.arc(L.perf, y, 3.4, 0, Math.PI * 2);
    f.fill();
  }

  // Shape: rounded corners and the two notches.
  for (const ctx of [f, g]) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    roundRect(ctx, 0, 0, PASS_W, PASS_H, RADIUS);
    ctx.fill();
    ctx.restore();
    cutNotches(ctx, L.perf);
  }

  // Back: emerald card with a gold guilloche and the monogram (drawn as seen from behind).
  const [back, b] = canvas(PASS_W, PASS_H);
  const backPerf = PASS_W - L.perf;
  roundRect(b, 0, 0, PASS_W, PASS_H, RADIUS);
  b.save();
  b.clip();
  const bg = b.createLinearGradient(0, 0, PASS_W, PASS_H);
  bg.addColorStop(0, col.accent);
  bg.addColorStop(1, col.night);
  b.fillStyle = bg;
  b.fillRect(0, 0, PASS_W, PASS_H);
  b.strokeStyle = col.gold;
  b.globalAlpha = 0.16;
  b.lineWidth = 1.2;
  for (let k = -PASS_H; k < PASS_W; k += 26) {
    b.beginPath();
    b.moveTo(k, 0);
    b.lineTo(k + PASS_H, PASS_H);
    b.stroke();
  }
  b.globalAlpha = 0.85;
  b.lineWidth = 2;
  roundRect(b, 20, 20, PASS_W - 40, PASS_H - 40, RADIUS - 10);
  b.stroke();
  // Seen from behind the sides swap: a gold globe emblem on the main part, the monogram on the stub.
  const mainBackX = rtl ? backPerf / 2 : backPerf + (PASS_W - backPerf) / 2;
  const emblemX = rtl ? backPerf + (PASS_W - backPerf) / 2 : backPerf / 2;
  b.globalAlpha = 0.9;
  b.lineWidth = 2.5;
  b.beginPath();
  b.arc(mainBackX, PASS_H / 2, 150, 0, Math.PI * 2);
  b.stroke();
  b.lineWidth = 1.4;
  for (const k of [0.35, 0.7]) {
    b.beginPath();
    b.ellipse(mainBackX, PASS_H / 2, 150 * k, 150, 0, 0, Math.PI * 2);
    b.stroke();
  }
  for (const yk of [-0.5, 0, 0.5]) {
    const w = 150 * Math.sqrt(1 - yk * yk);
    b.beginPath();
    b.moveTo(mainBackX - w, PASS_H / 2 + yk * 150);
    b.lineTo(mainBackX + w, PASS_H / 2 + yk * 150);
    b.stroke();
  }
  b.fillStyle = col.gold;
  b.textAlign = 'center';
  b.direction = dir;
  fit(b, c.monogram, 700, 64, display, 200, 30);
  b.fillText(c.monogram, emblemX, PASS_H / 2 + 22);
  b.restore();
  b.fillStyle = col.gold;
  b.globalAlpha = 0.55;
  for (let y = NOTCH + 20; y < PASS_H - NOTCH - 12; y += 19) {
    b.beginPath();
    b.arc(backPerf, y, 3.2, 0, Math.PI * 2);
    b.fill();
  }
  b.globalAlpha = 1;
  cutNotches(b, backPerf);

  const tex = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new CanvasTexture(cv);
    t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { front: tex(front, true), back: tex(back, true), surface: tex(surf, false) };
}

/** Soft cloud wisp: overlapping blurred puffs, seeded. */
export function cloudTexture(seed = 11): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const rand = mulberry32(seed);
  for (let i = 0; i < 16; i++) {
    const x = 26 + rand() * 76;
    const y = 50 + (rand() - 0.5) * 34 * (1 - Math.abs(x - 64) / 64);
    const r = 12 + rand() * 20;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.42)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}

/** Radial glow (white → transparent), for the city light and the low-tier halo. */
export function glowTexture(inner = 0, peak = 0.0, size = 128): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const h = size / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  if (peak > 0) {
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(Math.max(0, inner), 'rgba(255,255,255,0.95)');
    grad.addColorStop(peak, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
