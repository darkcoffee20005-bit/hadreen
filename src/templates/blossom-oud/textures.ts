import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas, floralBorderHeight, heightToNormal } from '@/lib/invite/stage/textures';

/** Canvas textures for blossom-oud (all procedural, built once on the client). */

const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** A date-palm frond: a rachis with paired leaflets sweeping toward the tip (alpha-cut). */
export function frondTexture(green: string, light: string): CanvasTexture {
  const W = 512;
  const H = 128;
  const [c, ctx] = canvas(W, H);
  const rand = mulberry32(5);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  const n = 46;
  for (let i = 0; i < n; i++) {
    const u = 0.04 + (i / n) * 0.94;
    const x = u * W;
    const len = H * 0.5 * Math.sin(Math.min(1, u * 1.12) * Math.PI) * (0.8 + rand() * 0.25);
    for (const side of [-1, 1]) {
      const tipX = x + len * 0.55;
      const tipY = H / 2 + side * len * 0.95;
      const g = ctx.createLinearGradient(x, H / 2, tipX, tipY);
      g.addColorStop(0, green);
      g.addColorStop(1, rand() < 0.3 ? light : green);
      ctx.strokeStyle = g;
      ctx.lineWidth = 3.2 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, H / 2);
      ctx.quadraticCurveTo(x + len * 0.2, H / 2 + side * len * 0.6, tipX, tipY);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = light;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W * 0.98, H / 2);
  ctx.stroke();
  return tex(c);
}

/** Ringed palm bark with diamond leaf scars, repeating along v. */
export function barkTexture(base: string, dark: string): CanvasTexture {
  const W = 64;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  const rand = mulberry32(9);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const rings = 34;
  for (let i = 0; i < rings; i++) {
    const y = (i / rings) * H;
    const off = (i % 2) * (W / 8);
    for (let k = -1; k < 5; k++) {
      const x = off + k * (W / 4);
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.55 + rand() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x + W / 8, y + H / rings - 2);
      ctx.lineTo(x + W / 4, y + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, y, W, 2);
  }
  ctx.globalAlpha = 1;
  const t = tex(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A pressed rose sprig: a flattened bloom, a stem and three leaves (alpha). */
export function sprigTexture(rose: string, roseDeep: string, leaf: string): CanvasTexture {
  const W = 256;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  // Stem.
  ctx.strokeStyle = leaf;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(W * 0.5, H * 0.3);
  ctx.bezierCurveTo(W * 0.46, H * 0.55, W * 0.56, H * 0.75, W * 0.48, H * 0.98);
  ctx.stroke();
  const leafAt = (x: number, y: number, a: number, s: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 60 * s, 0);
    g.addColorStop(0, leaf);
    g.addColorStop(1, '#7f9a72');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(30 * s, -22 * s, 70 * s, 0);
    ctx.quadraticCurveTo(30 * s, 22 * s, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4 * s, 0);
    ctx.lineTo(64 * s, 0);
    ctx.stroke();
    ctx.restore();
  };
  leafAt(W * 0.49, H * 0.5, -2.5, 1.1);
  leafAt(W * 0.52, H * 0.62, -0.5, 1.2);
  leafAt(W * 0.5, H * 0.76, -2.8, 0.95);
  // The bloom: layered petals spiralling in, pressed flat.
  const cx = W * 0.5;
  const cy = H * 0.24;
  for (let ring = 0; ring < 4; ring++) {
    const n = 5 + ring;
    const r = 82 - ring * 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.6;
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, roseDeep);
      g.addColorStop(0.75, rose);
      g.addColorStop(1, ring === 0 ? '#f6d7d4' : rose);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32, r * 0.62, r * 0.42, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,20,35,0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  return tex(c);
}

/** A four-point star with a soft core: the crystal sparkle sprite. */
export function starTexture(): CanvasTexture {
  const S = 128;
  const [c, ctx] = canvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S - 0.5;
      const dy = (y + 0.5) / S - 0.5;
      const r = Math.hypot(dx, dy);
      const core = Math.exp(-r * r * 260);
      const ray = Math.exp(-Math.abs(dx) * 90) * Math.exp(-Math.abs(dy) * 7) + Math.exp(-Math.abs(dy) * 90) * Math.exp(-Math.abs(dx) * 7);
      const diag = 0.35 * (Math.exp(-Math.abs(dx - dy) * 120) + Math.exp(-Math.abs(dx + dy) * 120)) * Math.exp(-r * 14);
      const v = Math.min(1, core + ray * 0.8 + diag) * Math.max(0, 1 - r * 2);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, false);
}

/** A soft round glow (halo sprites, the light from the envelope). */
export function glowTexture(): CanvasTexture {
  const S = 128;
  const [c, ctx] = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return tex(c, false);
}

/** The envelope's back: embossed floral border and the folds of its side flaps (normal map). */
export function paperNormal(width: number, height: number): CanvasTexture {
  const w = 1024;
  const h = Math.round((w * height) / width);
  const map = floralBorderHeight(w, h);
  const ctx = map.getContext('2d')!;
  ctx.filter = 'blur(2px)';
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.5, h * 0.4);
  ctx.lineTo(w, h);
  ctx.stroke();
  return heightToNormal(map, 2.2);
}

/** Zellige: eight-point stars and crosses in the template's colours, a tile band (repeats in u). */
export function zelligeTexture(colours: { ground: string; star: string; cross: string; line: string }): CanvasTexture {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = colours.ground;
  ctx.fillRect(0, 0, S, S);
  const star = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.PI / 8;
      const rr = i % 2 ? r * 0.72 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colours.line;
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  for (const [x, y] of [
    [0, 0],
    [S, 0],
    [0, S],
    [S, S],
  ])
    star(x!, y!, S * 0.3, colours.cross);
  star(S / 2, S / 2, S * 0.3, colours.star);
  ctx.strokeStyle = colours.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  const t = tex(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/**
 * The avenue floor across x ∈ [−30, 30] (u), repeating along the avenue (v): the paving either
 * side of the water channel, myrtle beds, the gravel walk under the palms, the garden beyond.
 */
export function groundTexture(c: { paving: string; joint: string; bed: string; walk: string; garden: string }): CanvasTexture {
  const W = 1024;
  const H = 128;
  const [cv, ctx] = canvas(W, H);
  const X = (x: number) => ((x + 30) / 60) * W;
  ctx.fillStyle = c.garden;
  ctx.fillRect(0, 0, W, H);
  const band = (a: number, b: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(X(a), 0, X(b) - X(a), H);
    ctx.fillRect(X(-b), 0, X(-a) - X(-b), H);
  };
  band(-0.01, 1.65, c.paving);
  band(1.65, 2.5, c.bed);
  band(2.5, 6.0, c.walk);
  // Paving joints.
  ctx.fillStyle = c.joint;
  for (let k = 0; k < 8; k++) {
    ctx.fillRect(X(-1.65), (k / 8) * H, X(1.65) - X(-1.65), 1);
  }
  for (const x of [0.6, 1.15]) {
    ctx.fillRect(X(x), 0, 1, H);
    ctx.fillRect(X(-x), 0, 1, H);
  }
  // Speckle.
  const rand = mulberry32(21);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  const t = tex(cv);
  t.wrapT = RepeatWrapping;
  return t;
}

/** Leafy noise for the myrtle hedges. */
export function hedgeTexture(base: string): CanvasTexture {
  const S = 128;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const rand = mulberry32(3);
  for (let i = 0; i < 1400; i++) {
    const l = rand();
    ctx.fillStyle = l < 0.5 ? `rgba(0,0,0,${0.12 + l * 0.2})` : `rgba(190,220,170,${(l - 0.5) * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(rand() * S, rand() * S, 2 + rand() * 2.5, 1 + rand() * 1.2, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Rose-and-ivory marble in large diamonds (the courtyard and the passage floor). */
export function marbleTexture(a: string, b: string, vein: string): CanvasTexture {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.moveTo(S / 2, 0);
  ctx.lineTo(S, S / 2);
  ctx.lineTo(S / 2, S);
  ctx.lineTo(0, S / 2);
  ctx.closePath();
  ctx.fill();
  const rand = mulberry32(13);
  ctx.strokeStyle = vein;
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.08 + rand() * 0.12;
    ctx.lineWidth = 0.6 + rand() * 1.4;
    ctx.beginPath();
    let x = rand() * S;
    let y = rand() * S;
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (rand() - 0.3) * 60;
      y += (rand() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = vein;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S / 2, 0);
  ctx.lineTo(S, S / 2);
  ctx.lineTo(S / 2, S);
  ctx.lineTo(0, S / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  const t = tex(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
