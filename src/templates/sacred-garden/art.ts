/**
 * Canvas-painted maps for the Sacred Garden: the blush envelope (paper fibres, gilded floral
 * emboss, folds, a wine liner with a gold lattice), the flap, stone grain and lawn. Drawn once
 * at load time; nothing is downloaded.
 */
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { hexToRgb, mixHex, shadeHex } from '@/lib/invite/stage/color';
import { canvas, heightToNormal } from '@/lib/invite/stage/textures';
import { rng } from './layout';

type Ctx = CanvasRenderingContext2D;

function fibres(ctx: Ctx, w: number, h: number, seed: number, light: string, dark: string) {
  const rand = rng(seed);
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.globalAlpha = 0.05 + rand() * 0.07;
    ctx.strokeStyle = rand() < 0.5 ? light : dark;
    ctx.lineWidth = 0.6 + rand() * 0.6;
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    const l = 2 + rand() * 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Wine liner with a fine gold lattice of quatrefoils. */
function liner(ctx: Ctx, w: number, h: number, wine: string, gold: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, shadeHex(wine, 0.8));
  g.addColorStop(1, mixHex(wine, '#000000', 0.05));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const cell = Math.max(18, Math.round(w / 16));
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, cell / 22);
  for (let y = 0; y < h + cell; y += cell) {
    for (let x = (y / cell) % 2 ? cell / 2 : 0; x < w + cell; x += cell) {
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * cell * 0.17, y + Math.sin(a) * cell * 0.17, cell * 0.16, cell * 0.08, a, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Mixes gold into `base` where `mask` is lit, and returns roughness/metal for the foil. */
function gild(base: HTMLCanvasElement, height: HTMLCanvasElement, gold: string, threshold = 0.35) {
  const { width: w, height: h } = base;
  const src = base.getContext('2d')!.getImageData(0, 0, w, h);
  const hd = height.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [gr, gg, gb] = hexToRgb(gold);
  const [orm, octx] = canvas(w, h);
  const od = octx.createImageData(w, h);
  for (let i = 0; i < hd.length; i += 4) {
    const t = Math.min(1, Math.max(0, (hd[i]! / 255 - threshold) / (1 - threshold)) * 1.5);
    src.data[i] = src.data[i]! + (gr - src.data[i]!) * t;
    src.data[i + 1] = src.data[i + 1]! + (gg - src.data[i + 1]!) * t;
    src.data[i + 2] = src.data[i + 2]! + (gb - src.data[i + 2]!) * t;
    od.data[i] = 255;
    od.data[i + 1] = Math.round((0.82 - 0.5 * t) * 255); // roughness (G)
    od.data[i + 2] = Math.round(t * 0.9 * 255); // metalness (B)
    od.data[i + 3] = 255;
  }
  base.getContext('2d')!.putImageData(src, 0, 0);
  octx.putImageData(od, 0, 0);
  return orm;
}

function tex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * A stationer's border: gold-foil double rule and corner rosettes (drawn into `gold` and
 * `height`), with a blind-embossed vine of leaves and small blossoms between them (height only).
 */
function vineBorder(height: Ctx, gold: Ctx, w: number, h: number, seed: number) {
  const rand = rng(seed);
  const inset = Math.round(Math.min(w, h) * 0.05);
  const both = (fn: (c: Ctx) => void) => [height, gold].forEach(fn);
  both((c) => {
    c.strokeStyle = '#fff';
    c.fillStyle = '#fff';
    c.lineWidth = 3;
    c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    c.lineWidth = 1.2;
    c.strokeRect(inset + 22, inset + 22, w - (inset + 22) * 2, h - (inset + 22) * 2);
  });
  const mid = inset + 11;
  const runs: [number, number, number, number][] = [
    [mid + 26, mid, w - mid - 26, mid],
    [w - mid, mid + 26, w - mid, h - mid - 26],
    [w - mid - 26, h - mid, mid + 26, h - mid],
    [mid, h - mid - 26, mid, mid + 26],
  ];
  height.lineWidth = 1.6;
  for (const [x0, y0, x1, y1] of runs) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    const at = (s: number) => {
      const off = Math.sin(s / 14) * 4;
      return [x0 + ux * s - uy * off, y0 + uy * s + ux * off] as const;
    };
    height.beginPath();
    for (let s = 0; s <= len; s += 3) {
      const [x, y] = at(s);
      if (s === 0) height.moveTo(x, y);
      else height.lineTo(x, y);
    }
    height.stroke();
    for (let s = 12; s < len - 8; s += 22) {
      const [x, y] = at(s);
      const side = Math.round(s / 22) % 2 ? 1 : -1;
      height.save();
      height.translate(x, y);
      height.rotate(Math.atan2(uy, ux) + side * 0.9);
      height.beginPath();
      height.ellipse(5, 0, 5, 2.2, 0, 0, Math.PI * 2);
      height.fill();
      height.restore();
      if (rand() < 0.22) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          height.beginPath();
          height.arc(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.2, 0, Math.PI * 2);
          height.fill();
        }
        gold.beginPath();
        gold.arc(x, y, 1.6, 0, Math.PI * 2);
        gold.fill();
      }
    }
  }
  const r = inset * 0.5;
  for (const [x, y] of [
    [mid, mid],
    [w - mid, mid],
    [mid, h - mid],
    [w - mid, h - mid],
  ] as const) {
    both((c) => {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        c.save();
        c.translate(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75);
        c.rotate(a);
        c.beginPath();
        c.ellipse(0, 0, r * 0.62, r * 0.26, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.beginPath();
      c.arc(x, y, r * 0.36, 0, Math.PI * 2);
      c.fill();
    });
  }
}

function blank(w: number, h: number) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = 'blur(1.2px)';
  return [c, ctx] as const;
}

export interface PaperMaps {
  map: CanvasTexture;
  normalMap: CanvasTexture;
  ormMap: CanvasTexture;
}

/**
 * The envelope's back: blush paper with an embossed, gilded floral border and fold lines; the
 * throat under the flap shows the wine liner. `flap` = flap depth as a fraction of height.
 */
export function envelopeBodyMaps(w: number, h: number, flap: number, colors: { paper: string; wine: string; gold: string }): PaperMaps {
  const cw = 768;
  const ch = Math.round((cw * h) / w);
  const [c, ctx] = canvas(cw, ch);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, cw, ch);
  // Side flaps a touch darker, bottom flap lighter: the folds of the envelope's back.
  const cx = cw / 2;
  const cy = ch * 0.56;
  ctx.fillStyle = shadeHex(colors.paper, 0.965);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cx, cy);
  ctx.lineTo(0, ch);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cw, 0);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cw, ch);
  ctx.fill();
  ctx.fillStyle = mixHex(colors.paper, '#ffffff', 0.18);
  ctx.beginPath();
  ctx.moveTo(0, ch);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cw, ch);
  ctx.fill();
  fibres(ctx, cw, ch, 5, '#ffffff', shadeHex(colors.paper, 0.8));
  // Throat: the liner, seen once the flap lifts.
  const throat = ch * flap * 0.94;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cw * 0.03, 0);
  ctx.lineTo(cw * 0.97, 0);
  ctx.lineTo(cx, throat);
  ctx.closePath();
  ctx.clip();
  liner(ctx, cw, throat, colors.wine, colors.gold);
  const sh = ctx.createLinearGradient(0, 0, 0, throat);
  sh.addColorStop(0, 'rgba(0,0,0,0.45)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, cw, throat);
  ctx.restore();

  const [height, hctx] = blank(cw, ch);
  const [goldMask, gctx] = blank(cw, ch);
  vineBorder(hctx, gctx, cw, ch, 5);
  hctx.strokeStyle = 'rgba(255,255,255,0.3)';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.moveTo(0, ch);
  hctx.lineTo(cx, cy);
  hctx.lineTo(cw, ch);
  hctx.stroke();
  const ormCanvas = gild(c, goldMask, colors.gold, 0.3);
  return { map: tex(c, true), normalMap: heightToNormal(height, 2.4), ormMap: tex(ormCanvas, false) };
}

/** The flap's outside (gilded scalloped border along its two edges) and its inside (the liner). */
export function envelopeFlapMaps(w: number, h: number, flap: number, colors: { paper: string; wine: string; gold: string }): PaperMaps & { liner: CanvasTexture } {
  const cw = 768;
  const ch = Math.round((cw * h) / w);
  const depth = ch * flap;
  const [c, ctx] = canvas(cw, ch);
  ctx.fillStyle = mixHex(colors.paper, '#ffffff', 0.08);
  ctx.fillRect(0, 0, cw, ch);
  fibres(ctx, cw, ch, 9, '#ffffff', shadeHex(colors.paper, 0.8));
  const [height, hctx] = blank(cw, ch);
  const [goldMask, gctx] = blank(cw, ch);
  hctx.strokeStyle = '#fff';
  hctx.fillStyle = '#fff';
  gctx.strokeStyle = '#fff';
  const inset = cw * 0.045;
  const edge = (k: number) => {
    // A line parallel to the flap's slanted edges, `k` px inside.
    const slope = depth / (cw / 2);
    const dy = k * Math.sqrt(1 + slope * slope);
    return [
      [k * 1.6, 0],
      [cw / 2, depth - dy],
      [cw - k * 1.6, 0],
    ] as const;
  };
  for (const [k, lw] of [
    [inset, 3],
    [inset + 10, 1.4],
  ] as const) {
    const p = edge(k);
    for (const c of [hctx, gctx]) {
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(p[0][0], p[0][1]);
      c.lineTo(p[1][0], p[1][1]);
      c.lineTo(p[2][0], p[2][1]);
      c.stroke();
    }
  }
  // Petal chain along both edges.
  const p = edge(inset + 24);
  for (const [a, b] of [
    [p[0], p[1]],
    [p[1], p[2]],
  ] as const) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let s = 18; s < len - 12; s += 22) {
      hctx.save();
      hctx.translate(a[0] + Math.cos(ang) * s, a[1] + Math.sin(ang) * s);
      hctx.rotate(ang + ((s / 22) % 2 ? 0.5 : -0.5));
      hctx.beginPath();
      hctx.ellipse(0, 0, 6, 2.4, 0, 0, Math.PI * 2);
      hctx.fill();
      hctx.restore();
    }
  }
  const ormCanvas = gild(c, goldMask, colors.gold, 0.3);
  const [lc, lctx] = canvas(cw, ch);
  liner(lctx, cw, ch, colors.wine, colors.gold);
  return { map: tex(c, true), normalMap: heightToNormal(height, 2.2), ormMap: tex(ormCanvas, false), liner: tex(lc, true) };
}

/** Weathered limestone grain (tiling normal map). */
export function stoneNormal(): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const rand = rng(31);
  const lattice = Array.from({ length: 33 * 33 }, () => rand());
  const at = (x: number, y: number) => lattice[(y % 32) * 33 + (x % 32)]!;
  const vnoise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = x - xi;
    const v = y - yi;
    const s = (t: number) => t * t * (3 - 2 * t);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * s(u);
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * s(u);
    return a + (b - a) * s(v);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      let amp = 0.5;
      for (let o = 0; o < 4; o++) {
        const f = 4 * 2 ** o;
        n += vnoise((x / size) * f, (y / size) * f) * amp;
        amp *= 0.5;
      }
      const pit = rand() < 0.004 ? -0.4 : 0;
      const v = Math.max(0, Math.min(255, (n + pit) * 255));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = heightToNormal(c, 1.6);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Lawn: mown grass with soft stripes and speckle. */
export function grassMap(leaf: string): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = shadeHex(leaf, 0.78);
  ctx.fillRect(0, 0, size, size);
  const rand = rng(41);
  for (let i = 0; i < 2600; i++) {
    ctx.globalAlpha = 0.18 + rand() * 0.25;
    ctx.fillStyle = rand() < 0.5 ? shadeHex(leaf, 0.6) : mixHex(leaf, '#d8c27a', 0.25);
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 2 + rand() * 3);
  }
  ctx.globalAlpha = 1;
  const t = tex(c, true);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Clipped foliage: a relief of small overlapping leaves (tiling normal map). */
export function leafNormal(): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = 'rgb(110,110,110)';
  ctx.fillRect(0, 0, size, size);
  const rand = rng(53);
  for (let i = 0; i < 1400; i++) {
    const v = Math.round(90 + rand() * 165);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    const x = rand() * size;
    const y = rand() * size;
    const a = rand() * Math.PI;
    const l = 4 + rand() * 6;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, l, l * 0.45, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = heightToNormal(c, 1.4);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
