/**
 * Canvas-painted maps for the Sacred Garden: the ivory envelope (cotton fibres, four folds,
 * blind-embossed flowering sprays, a blush liner), stone grain and lawn. Drawn once at load
 * time; nothing is downloaded.
 */
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { mixHex, shadeHex } from '@/lib/invite/stage/color';
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

function tex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * A blind-embossed flowering spray: a gently curving stem with alternating leaves, sprigs and
 * five-petal blossoms. Drawn in white into a height canvas (and faintly into the colour map, so
 * the relief still reads where the light is flat).
 */
function spray(ctxs: Ctx[], x: number, y: number, angle: number, length: number, size: number, seed: number) {
  const rand = rng(seed);
  const bend = (rand() - 0.5) * 0.9;
  const at = (s: number) => {
    const a = angle + bend * s * s;
    const d = s * length;
    const sway = Math.sin(s * Math.PI * 1.3 + seed) * length * 0.05;
    return [x + Math.cos(a) * d - Math.sin(a) * sway, y + Math.sin(a) * d + Math.cos(a) * sway, a] as const;
  };
  const leaf = (c: Ctx, px: number, py: number, a: number, l: number) => {
    c.save();
    c.translate(px, py);
    c.rotate(a);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0);
    c.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
    c.fill();
    c.restore();
  };
  const blossom = (c: Ctx, px: number, py: number, r: number, spin: number) => {
    for (let k = 0; k < 5; k++) {
      const a = spin + (k / 5) * Math.PI * 2;
      c.beginPath();
      c.ellipse(px + Math.cos(a) * r * 0.62, py + Math.sin(a) * r * 0.62, r * 0.56, r * 0.4, a, 0, Math.PI * 2);
      c.fill();
    }
  };
  for (const c of ctxs) {
    const solid = c.fillStyle;
    c.lineCap = 'round';
    c.lineWidth = Math.max(1.6, size * 0.22);
    c.beginPath();
    for (let s = 0; s <= 1.0001; s += 0.02) {
      const [px, py] = at(s);
      if (s === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    const r2 = rng(seed + 1);
    for (let s = 0.08; s < 0.98; s += 0.085) {
      const [px, py, a] = at(s);
      const side = Math.round(s / 0.085) % 2 ? 1 : -1;
      const l = size * (1.6 + r2() * 0.8) * (1 - s * 0.35);
      leaf(c, px, py, a + side * (0.7 + r2() * 0.3), l);
      if (r2() < 0.5) leaf(c, px, py, a - side * (0.6 + r2() * 0.3), l * 0.7);
      if (r2() < 0.55) {
        // A sprig: short twig ending in a blossom or a bud.
        const ta = a + side * (0.9 + r2() * 0.4);
        const tl = size * (1.8 + r2() * 1.2);
        const tx = px + Math.cos(ta) * tl;
        const ty = py + Math.sin(ta) * tl;
        c.lineWidth = Math.max(1, size * 0.12);
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(tx, ty);
        c.stroke();
        c.fillStyle = solid;
        if (r2() < 0.7) blossom(c, tx, ty, size * (0.7 + r2() * 0.35), r2() * 6);
        else {
          c.beginPath();
          c.ellipse(tx, ty, size * 0.3, size * 0.48, ta, 0, Math.PI * 2);
          c.fill();
        }
        c.lineWidth = Math.max(1.6, size * 0.22);
      }
    }
    const [ex, ey] = at(1);
    blossom(c, ex, ey, size * 1.05, seed);
  }
}

export interface EnvelopeMaps {
  /** Front (all four flaps share it: UV = position across the closed envelope). */
  map: CanvasTexture;
  normalMap: CanvasTexture;
  /** The flaps' inside: blush with a fine cream print. */
  liner: CanvasTexture;
}

/**
 * The ivory envelope's face: soft cotton paper, the four fold triangles in barely different
 * whites, and blind-embossed flowering sprays climbing the side flaps and framing the top and
 * bottom ones. Drawn for the envelope's own proportions (`w` × `h`).
 */
export function envelopeMaps(w: number, h: number, colors: { paper: string; blush: string }): EnvelopeMaps {
  const cw = 640;
  const ch = Math.round((cw * h) / w);
  const cx = cw / 2;
  const cy = ch / 2;
  const [c, ctx] = canvas(cw, ch);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, cw, ch);
  // The four folds, each a whisper apart: side flaps cooler, bottom warmer, top lightest.
  const tri = (pts: [number, number][], fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  tri([[0, 0], [cx, cy], [0, ch]], shadeHex(colors.paper, 0.975));
  tri([[cw, 0], [cx, cy], [cw, ch]], shadeHex(colors.paper, 0.975));
  tri([[0, ch], [cx, cy], [cw, ch]], mixHex(colors.paper, '#ffffff', 0.12));
  tri([[0, 0], [cx, cy], [cw, 0]], mixHex(colors.paper, '#ffffff', 0.22));
  fibres(ctx, cw, ch, 5, '#ffffff', shadeHex(colors.paper, 0.86));
  // A soft, warm falloff to the corners, as if lit from the seal.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
  glow.addColorStop(0, 'rgba(255,250,240,0.18)');
  glow.addColorStop(1, 'rgba(120,90,70,0.10)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cw, ch);

  const [height, hctx] = canvas(cw, ch);
  hctx.fillStyle = '#000';
  hctx.fillRect(0, 0, cw, ch);
  hctx.filter = 'blur(1.4px)';
  hctx.fillStyle = '#fff';
  hctx.strokeStyle = '#fff';
  // The colour map gets the same sprays, faintly darker (shadowed relief reads in flat light).
  ctx.fillStyle = 'rgba(150,118,92,0.09)';
  ctx.strokeStyle = 'rgba(150,118,92,0.09)';
  const both = [hctx, ctx];
  const u = cw / 640;
  const leafSize = 11 * u;
  // Side flaps: two intertwined sprays climbing from each bottom corner and two falling from each
  // top one, so the long edges carry a full garland.
  for (const side of [-1, 1]) {
    const x = side < 0 ? cw * 0.1 : cw * 0.9;
    const seed = side < 0 ? 3 : 13;
    spray(both, x, ch * 0.985, -Math.PI / 2 + side * 0.1, ch * 0.42, leafSize, seed);
    spray(both, x - side * cw * 0.035, ch * 0.9, -Math.PI / 2 + side * 0.22, ch * 0.3, leafSize * 0.85, seed + 1);
    spray(both, x, ch * 0.015, Math.PI / 2 - side * 0.1, ch * 0.36, leafSize * 0.95, seed + 2);
    spray(both, x - side * cw * 0.035, ch * 0.09, Math.PI / 2 - side * 0.24, ch * 0.24, leafSize * 0.8, seed + 3);
    // Top and bottom flaps: sprays tucked along the slanted edges, opening towards the centre.
    spray(both, cx + side * cw * 0.3, ch * 0.03, Math.PI / 2 + side * 1.0, cw * 0.24, leafSize * 0.85, seed + 4);
    spray(both, cx + side * cw * 0.3, ch * 0.97, -Math.PI / 2 - side * 1.0, cw * 0.24, leafSize * 0.85, seed + 5);
  }
  // Creases: a fine raised line along each fold.
  hctx.filter = 'blur(0.8px)';
  hctx.strokeStyle = 'rgba(255,255,255,0.45)';
  hctx.lineWidth = 2;
  for (const [x, y] of [[0, 0], [cw, 0], [0, ch], [cw, ch]] as const) {
    hctx.beginPath();
    hctx.moveTo(x, y);
    hctx.lineTo(cx, cy);
    hctx.stroke();
  }

  const [lc, lctx] = canvas(256, 256);
  const lining = mixHex(colors.blush, colors.paper, 0.45);
  lctx.fillStyle = lining;
  lctx.fillRect(0, 0, 256, 256);
  lctx.fillStyle = mixHex(lining, '#ffffff', 0.55);
  const lr = rng(17);
  for (let i = 0; i < 26; i++) {
    const x = lr() * 256;
    const y = lr() * 256;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      lctx.beginPath();
      lctx.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.6, 2.4, a, 0, Math.PI * 2);
      lctx.fill();
    }
  }
  const liner = tex(lc, true);
  liner.wrapS = liner.wrapT = RepeatWrapping;
  liner.repeat.set(3, 3);
  return { map: tex(c, true), normalMap: heightToNormal(height, 3.4), liner };
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

/**
 * The seal's height map: a raised rim, a laurel wreath circling the monogram (leaves in pairs
 * along a stem, tied with a bow at the bottom), a fine inner ring and the initials.
 */
export function sealHeight(monogram: string, family: string, size = 512): HTMLCanvasElement {
  const [c, ctx] = canvas(size, size);
  const m = size / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.filter = 'blur(2px)';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.arc(m, m, size * 0.405, 0, Math.PI * 2);
  ctx.stroke();
  // The wreath: two branches from the bottom, meeting at the top.
  const R = size * 0.32;
  ctx.lineWidth = size * 0.008;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(m, m, R, Math.PI / 2 + side * 0.18, Math.PI / 2 + side * (Math.PI - 0.22), side < 0);
    ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const a = Math.PI / 2 + side * (0.3 + i * 0.205);
      const px = m + Math.cos(a) * R;
      const py = m + Math.sin(a) * R;
      const tang = a + (side * Math.PI) / 2;
      const len = size * (0.042 - i * 0.0012);
      for (const out of [-1, 1]) {
        const la = tang + side * out * 0.55 + Math.PI;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.translate(px + Math.cos(la) * len * 0.55, py + Math.sin(la) * len * 0.55);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.ellipse(0, 0, len * 0.6, len * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (i % 4 === 2) {
        ctx.beginPath();
        ctx.arc(px, py, size * 0.009, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // A small bow where the branches cross.
  ctx.beginPath();
  ctx.ellipse(m - size * 0.03, m + R + size * 0.005, size * 0.03, size * 0.014, 0.3, 0, Math.PI * 2);
  ctx.ellipse(m + size * 0.03, m + R + size * 0.005, size * 0.03, size * 0.014, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = size * 0.006;
  ctx.beginPath();
  ctx.arc(m, m, size * 0.255, 0, Math.PI * 2);
  ctx.stroke();
  ctx.filter = 'blur(1.6px)';
  ctx.font = `700 ${Math.round(size * 0.15)}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(monogram, m, m + size * 0.015, size * 0.4);
  return c;
}

/** Polished cream marble tiles with soft grey-rose veins (colour map; tile = 1 uv unit / 2). */
export function marbleMap(base: string, size = 512): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rand = rng(29);
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let x = rand() * size;
    let y = rand() * size;
    let a = rand() * Math.PI;
    ctx.strokeStyle = `rgba(${150 + rand() * 30},${130 + rand() * 20},${125 + rand() * 20},${0.08 + rand() * 0.12})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 18; k++) {
      a += (rand() - 0.5) * 0.7;
      x += Math.cos(a) * 14;
      y += Math.sin(a) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Soft clouds in the stone.
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(rand() * size, rand() * size, 0, rand() * size, rand() * size, 30 + rand() * 60);
    g.addColorStop(0, `rgba(255,255,255,${0.05 + rand() * 0.06})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // Tile joints: 2 × 2 tiles per texture.
  ctx.strokeStyle = 'rgba(120,100,90,0.28)';
  ctx.lineWidth = 2;
  for (const p of [0, size / 2]) {
    ctx.beginPath();
    ctx.moveTo(p + 1, 0);
    ctx.lineTo(p + 1, size);
    ctx.moveTo(0, p + 1);
    ctx.lineTo(size, p + 1);
    ctx.stroke();
  }
  const t = tex(c, true);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
