import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas, heightToNormal } from '@/lib/invite/stage/textures';

/**
 * Canvas textures for dolce-vita: water normals, cloud puffs, villa façades, cotto tiles, stone,
 * and the papers (gate card, envelope, letter). All procedural, all seeded.
 */

const srgb = (c: HTMLCanvasElement) => {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Tileable ripple normals: a sum of waves with integer wave numbers (so it wraps seamlessly). */
export function waterNormalTexture(size = 256, seed = 5): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(seed);
  const waves = Array.from({ length: 14 }, (_, i) => {
    const k = 2 + Math.floor(rand() * (i < 5 ? 4 : 11));
    const ang = rand() * Math.PI * 2;
    return { kx: Math.round(Math.cos(ang) * k), ky: Math.round(Math.sin(ang) * k), ph: rand() * Math.PI * 2, amp: 1 / (1 + k * 0.35) };
  });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const w of waves) h += Math.sin(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.ph) * w.amp;
      const v = 128 + h * 26;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = heightToNormal(c, 3.2);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = NoColorSpace;
  return t;
}

/** Four cumulus puffs in a 2×2 atlas: red = light (lit tops), alpha = shape. */
export function cloudAtlas(size = 512, seed = 9): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.clearRect(0, 0, size, size);
  const rand = mulberry32(seed);
  const cell = size / 2;
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * cell;
    const oy = Math.floor(k / 2) * cell;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, cell, cell);
    ctx.clip();
    const n = 9 + Math.floor(rand() * 5);
    const base = oy + cell * 0.7;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const x = ox + cell * (0.14 + u * 0.72) + (rand() - 0.5) * cell * 0.06;
      const r = cell * (0.08 + 0.17 * Math.sin(Math.PI * u) * (0.7 + rand() * 0.5));
      const y = base - r * (0.45 + rand() * 0.5);
      const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(225,225,225,0.92)');
      g.addColorStop(1, 'rgba(170,170,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A soft flat base.
    const g = ctx.createLinearGradient(0, base - cell * 0.1, 0, base + cell * 0.05);
    g.addColorStop(0, 'rgba(190,190,190,0.6)');
    g.addColorStop(1, 'rgba(160,160,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ox + cell / 2, base - cell * 0.03, cell * 0.36, cell * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Soften every puff edge.
  const [b, bctx] = canvas(size, size);
  bctx.filter = 'blur(3px)';
  bctx.drawImage(c, 0, 0);
  const t = new CanvasTexture(b);
  t.colorSpace = NoColorSpace;
  return t;
}

/** Villa façade (white stucco; tinted per instance): shuttered windows, arched ground floor, cornice. */
export function facadeTexture(): CanvasTexture {
  const [c, ctx] = canvas(256, 192);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 0, 256, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 120, 256, 3);
  const cols = 5;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < cols; i++) {
      const x = 22 + i * 47;
      const y = 26 + r * 46;
      ctx.fillStyle = '#3E4E5A';
      ctx.fillRect(x, y, 18, 28);
      ctx.fillStyle = '#5F8A72';
      ctx.fillRect(x - 9, y, 8, 28);
      ctx.fillRect(x + 19, y, 8, 28);
    }
  }
  for (let i = 0; i < cols; i++) {
    const x = 31 + i * 47;
    ctx.fillStyle = '#4A5560';
    ctx.beginPath();
    ctx.moveTo(x - 11, 182);
    ctx.lineTo(x - 11, 150);
    ctx.arc(x, 150, 11, Math.PI, 0);
    ctx.lineTo(x + 11, 182);
    ctx.fill();
  }
  return srgb(c);
}

/** Cotto floor tiles with lime grout and a little wear. */
export function cottoTexture(seed = 4): CanvasTexture {
  const size = 512;
  const [c, ctx] = canvas(size, size);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#D9C9B2';
  ctx.fillRect(0, 0, size, size);
  const n = 8;
  const s = size / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const k = rand();
      const r = 196 + k * 22;
      const g = 128 + k * 22;
      const b = 96 + k * 16;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      const gr = ctx.createRadialGradient(x * s + s * rand(), y * s + s * rand(), 2, x * s + s / 2, y * s + s / 2, s * 0.8);
      gr.addColorStop(0, 'rgba(255,235,210,0.18)');
      gr.addColorStop(1, 'rgba(120,70,40,0.08)');
      ctx.fillStyle = gr;
      ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
    }
  }
  const t = srgb(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Soft limestone mottling (tileable-ish), used as a colour map on the stone. */
export function stoneTexture(seed = 2): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#F2ECE3';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 26;
    const dark = rand() < 0.6;
    ctx.fillStyle = dark ? `rgba(150,130,105,${0.03 + rand() * 0.05})` : `rgba(255,252,246,${0.08 + rand() * 0.1})`;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = srgb(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

interface PaperOpts {
  monogram: string;
  family: string;
}

function sprig(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, gold: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = Math.max(1.5, len * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.08, len, 0);
  ctx.stroke();
  for (let i = 1; i <= 5; i++) {
    const u = i / 6;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(len * u, -len * 0.04 * Math.sin(Math.PI * u));
      ctx.rotate(side * 0.7);
      ctx.beginPath();
      ctx.ellipse(len * 0.07, 0, len * 0.075, len * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * The gate card: powder-blue cotton paper with a gilded double rule, an olive wreath and the
 * couple's monogram. Returns a colour map and a metalness map (gold = metal).
 */
export function cardTextures({ monogram, family }: PaperOpts, paper: string, gold: string) {
  const W = 1024;
  const H = Math.round(W * 0.69);
  const [c, ctx] = canvas(W, H);
  const [m, mctx] = canvas(W, H);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(3);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.07})`;
    ctx.fillRect(rand() * W, rand() * H, 2, 2);
  }
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, W, H);
  const draw = (g: CanvasRenderingContext2D, colour: string) => {
    g.strokeStyle = colour;
    g.fillStyle = colour;
    g.lineWidth = 7;
    g.strokeRect(40, 40, W - 80, H - 80);
    g.lineWidth = 2.5;
    g.strokeRect(58, 58, W - 116, H - 116);
    for (const [x, y] of [[58, 58], [W - 58, 58], [58, H - 58], [W - 58, H - 58]] as const) {
      g.beginPath();
      g.arc(x, y, 9, 0, Math.PI * 2);
      g.fill();
    }
    // Wreath: two olive sprigs curving round the monogram.
    const cx = W / 2;
    const cy = H / 2;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 2 + side * (0.55 + k * 0.42);
        sprig(g, cx + Math.cos(a) * 190, cy + Math.sin(a) * 150, 95, a + side * Math.PI / 2 + (side < 0 ? Math.PI : 0), colour);
      }
    }
    g.font = `700 ${Math.round(H * 0.3)}px ${family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.direction = 'rtl';
    g.fillText(monogram, cx, cy + H * 0.015, W * 0.42);
  };
  draw(ctx, gold);
  draw(mctx, '#FFFFFF');
  const map = srgb(c);
  const metal = new CanvasTexture(m);
  metal.colorSpace = NoColorSpace;
  return { map, metal };
}

/** The envelope paper (front and back) with a gold hairline edge; `liner` patterns the inside of the flap. */
export function envelopeTextures(paper: string, gold: string, liner: string, rose: string) {
  const W = 512;
  const H = 356;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(8);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.08})`;
    ctx.fillRect(rand() * W, rand() * H, 2, 2);
  }
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  const map = srgb(c);
  // Liner: stripes of lemon and rose, like a deckchair.
  const [l, lctx] = canvas(256, 256);
  lctx.fillStyle = liner;
  lctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    lctx.fillStyle = i % 2 ? rose : '#FFFFFF';
    lctx.globalAlpha = i % 2 ? 0.7 : 0.55;
    lctx.fillRect(i * 32 + 4, 0, 14, 256);
  }
  lctx.globalAlpha = 1;
  const linerMap = srgb(l);
  return { map, linerMap };
}

/**
 * The letter: ivory card with a watercolour of the lake (sky, mountains, water, a sail) in its
 * top half, a gold rule and the monogram.
 */
export function letterTexture({ monogram, family }: PaperOpts, tones: { ink: string; gold: string; powder: string; mountain: string; lake: string; rose: string }) {
  const W = 512;
  const H = 724;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#FCF9F2';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = tones.gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  // Watercolour vignette in an arch.
  ctx.save();
  ctx.beginPath();
  const ax = W / 2;
  const top = 80;
  const bottom = 380;
  const half = 150;
  ctx.moveTo(ax - half, bottom);
  ctx.lineTo(ax - half, top + half);
  ctx.arc(ax, top + half, half, Math.PI, 0);
  ctx.lineTo(ax + half, bottom);
  ctx.closePath();
  ctx.clip();
  const sky = ctx.createLinearGradient(0, top, 0, bottom);
  sky.addColorStop(0, tones.powder);
  sky.addColorStop(0.55, '#F3F7FB');
  sky.addColorStop(0.56, tones.lake);
  sky.addColorStop(1, tones.powder);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const rand = mulberry32(12);
  const ridge = (y0: number, amp: number, colour: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(ax - half, 300);
    for (let x = ax - half; x <= ax + half; x += 10) ctx.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin(x * 0.03 + rand() * 0.6)) - rand() * 8);
    ctx.lineTo(ax + half, 300);
    ctx.fill();
  };
  ridge(270, 60, tones.mountain, 0.45);
  ridge(292, 40, tones.mountain, 0.7);
  ctx.globalAlpha = 1;
  // A little sail.
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(ax + 30, 336);
  ctx.lineTo(ax + 30, 296);
  ctx.lineTo(ax + 52, 336);
  ctx.fill();
  ctx.fillStyle = tones.ink;
  ctx.fillRect(ax + 22, 337, 36, 4);
  // Roses spilling over the lower corners.
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? -1 : 1;
    ctx.globalAlpha = 0.55 + rand() * 0.3;
    ctx.fillStyle = i % 3 ? tones.rose : '#F7DCE3';
    ctx.beginPath();
    ctx.arc(ax + side * (half - 10 - rand() * 50), bottom - rand() * 40, 12 + rand() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = tones.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax - half, bottom);
  ctx.lineTo(ax - half, top + half);
  ctx.arc(ax, top + half, half, Math.PI, 0);
  ctx.lineTo(ax + half, bottom);
  ctx.stroke();
  // Monogram and rule.
  ctx.fillStyle = tones.gold;
  ctx.font = `700 120px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(monogram, ax, 500, 300);
  ctx.fillRect(ax - 90, 590, 180, 2);
  ctx.beginPath();
  ctx.arc(ax, 591, 6, 0, Math.PI * 2);
  ctx.fill();
  sprig(ctx, ax + 20, 640, 80, 0, tones.gold);
  sprig(ctx, ax - 20, 640, 80, Math.PI, tones.gold);
  return srgb(c);
}

/** A round soft dot (sparkles). */
export function dotTexture(): CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  return t;
}
