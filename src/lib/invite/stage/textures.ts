import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { hexToRgb } from './color';

/**
 * Procedural textures drawn on 2D canvases: emboss normal maps, monograms, gobo cookies.
 * Nothing to download, sharp at any size we choose, and seeded so every render matches.
 */

export function canvas(width: number, height = width): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Turns a grey height map into a tangent-space normal map (Sobel). */
export function heightToNormal(height: HTMLCanvasElement, strength = 2): CanvasTexture {
  const { width: w, height: h } = height;
  const src = height.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [out, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const at = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4]! / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * strength;
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(out);
  tex.colorSpace = NoColorSpace;
  return tex;
}

/** Height map of an embossed floral border: double rule, corner rosettes and a petal chain. */
export function floralBorderHeight(width: number, height: number): HTMLCanvasElement {
  const [c, ctx] = canvas(width, height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'blur(1.5px)';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  const inset = Math.round(Math.min(width, height) * 0.06);
  ctx.lineWidth = 3;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset + 9, inset + 9, width - (inset + 9) * 2, height - (inset + 9) * 2);
  const petal = (x: number, y: number, r: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const rosette = (x: number, y: number, r: number) => {
    for (let k = 0; k < 8; k++) petal(x + Math.cos((k * Math.PI) / 4) * r * 0.9, y + Math.sin((k * Math.PI) / 4) * r * 0.9, r * 0.75, (k * Math.PI) / 4);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  };
  const r = inset * 0.38;
  for (const [x, y] of [
    [inset, inset],
    [width - inset, inset],
    [inset, height - inset],
    [width - inset, height - inset],
  ] as const)
    rosette(x, y, r);
  const step = r * 2.6;
  for (let x = inset + step * 1.5; x < width - inset - step; x += step) {
    petal(x, inset - r * 0.9, r * 0.55, 0.5);
    petal(x, height - inset + r * 0.9, r * 0.55, -0.5);
  }
  for (let y = inset + step * 1.5; y < height - inset - step; y += step) {
    petal(inset - r * 0.9, y, r * 0.55, Math.PI / 2 + 0.5);
    petal(width - inset + r * 0.9, y, r * 0.55, Math.PI / 2 - 0.5);
  }
  return c;
}

/** CSS font-family behind a next/font variable (e.g. --font-aref), for drawing text on canvases. */
export function cssFontFamily(variable: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

/** Height map for a wax-seal monogram: rim ring, inner ring and the initials. */
export function monogramHeight(text: string, family: string, size = 512): HTMLCanvasElement {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.filter = 'blur(2.5px)';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `700 ${Math.round(size * 0.2)}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, size / 2, size / 2 + size * 0.02, size * 0.5);
  return c;
}

/** A colour map from a height map: `base` where it's low, `relief` where it's raised (gilded relief). */
export function tintFromHeight(height: HTMLCanvasElement, base: string, relief: string): CanvasTexture {
  const { width: w, height: h } = height;
  const src = height.getContext('2d')!.getImageData(0, 0, w, h).data;
  const [out, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const [ar, ag, ab] = hexToRgb(base);
  const [br, bg, bb] = hexToRgb(relief);
  for (let i = 0; i < src.length; i += 4) {
    const t = Math.min(1, (src[i]! / 255) * 1.6);
    img.data[i] = ar + (br - ar) * t;
    img.data[i + 1] = ag + (bg - ag) * t;
    img.data[i + 2] = ab + (bb - ab) * t;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(out);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * A gobo: the pattern a spotlight projects (light through a mashrabiya, leaves, a window).
 * `floor` is how much light the dark parts still let through — gobos read as dappled light,
 * never as black holes in the scene.
 */
export function goboTexture(kind: 'lattice' | 'leaves' | 'window', size = 512, seed = 3, floor = 0.7): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const shade = Math.round(floor * 255);
  ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
  ctx.fillRect(0, 0, size, size);
  ctx.filter = `blur(${Math.max(1, Math.round(size / 400))}px)`;
  ctx.fillStyle = '#fff';
  if (kind === 'lattice') {
    const cell = size / 9;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const cx = x * cell + (y % 2 ? cell / 2 : 0);
        const cy = y * cell;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const r = k % 2 ? cell * 0.22 : cell * 0.36;
          const a = (k * Math.PI) / 8;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (kind === 'leaves') {
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    for (let i = 0; i < 70; i++) {
      ctx.save();
      ctx.translate(rand() * size, rand() * size);
      ctx.rotate(rand() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * (0.03 + rand() * 0.05), size * 0.015, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    const pad = size * 0.08;
    const w = (size - pad * 3) / 2;
    ctx.fillRect(pad, pad, w, size - pad * 2);
    ctx.fillRect(pad * 2 + w, pad, w, size - pad * 2);
  }
  // Soft edge falloff so the pool of light has no hard border.
  ctx.filter = 'none';
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = kind === 'lattice' ? RepeatWrapping : ClampToEdgeWrapping;
  tex.minFilter = LinearFilter;
  return tex;
}

/** Text drawn with the browser's own shaper (full OpenType support), as an alpha texture. */
export async function textTexture(
  text: string,
  options: { family: string; weight?: number; px?: number; rtl?: boolean; padding?: number },
): Promise<{ texture: CanvasTexture; aspect: number }> {
  const { family, weight = 700, px = 160, rtl = true, padding = 0.25 } = options;
  const font = `${weight} ${px}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {
    // fall back to whatever font is available
  }
  const [, probe] = canvas(8, 8);
  probe.font = font;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent || px * 0.9;
  const descent = m.actualBoundingBoxDescent || px * 0.4;
  const pad = px * padding;
  const width = Math.ceil(m.width + pad * 2);
  const height = Math.ceil(ascent + descent + pad * 2);
  const [c, ctx] = canvas(width, height);
  ctx.font = font;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, width / 2, pad + ascent);
  const texture = new CanvasTexture(c);
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}
