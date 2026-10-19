import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, ClampToEdgeWrapping } from 'three';
import { mulberry32 } from '@/lib/invite/audio/dsp';
import { canvas, heightToNormal } from '@/lib/invite/stage/textures';
import { archArcs } from './geometry';

/**
 * Canvas art for royal-gold: khatam (eight-point star) zellige, the carved and gilded arch wall,
 * marble floor, a pierced-brass lantern pattern, the lantern's star gobo and the flap emboss.
 * Each painter can also paint a "material mask" (G = roughness, B = metalness, like three's
 * roughness/metalness maps) with the same strokes, so painted gold leaf is truly metallic.
 */

export interface Inks {
  ground: string;
  star: string;
  line: string;
  inner: string;
}

export const MASK = {
  plaster: 'rgb(0,225,0)',
  glaze: 'rgb(0,110,0)',
  gold: 'rgb(0,85,255)',
  marble: 'rgb(0,135,0)',
};

const TAU = Math.PI * 2;

/** An eight-point star (two overlapping squares) as a path. */
export function star8(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, rot = 0) {
  const r = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = rot + (k * Math.PI) / 8;
    const rad = k % 2 === 0 ? R : r;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
}

/** One repeat of a khatam zellige: touching eight-point stars with knots between them. */
export function starTile(size: number, inks: Inks): HTMLCanvasElement {
  const [c, ctx] = canvas(size, size);
  const S = size;
  ctx.fillStyle = inks.ground;
  ctx.fillRect(0, 0, S, S);
  const R = S * 0.355;
  const centres: [number, number][] = [
    [S / 2, S / 2],
    [0, 0],
    [S, 0],
    [0, S],
    [S, S],
  ];
  ctx.lineJoin = 'round';
  for (const [x, y] of centres) {
    star8(ctx, x, y, R);
    ctx.fillStyle = inks.star;
    ctx.fill();
    ctx.lineWidth = S * 0.028;
    ctx.strokeStyle = inks.line;
    ctx.stroke();
    star8(ctx, x, y, R * 0.42, Math.PI / 8);
    ctx.fillStyle = inks.inner;
    ctx.fill();
    ctx.lineWidth = S * 0.014;
    ctx.stroke();
  }
  // Knots where four star points meet (edge midpoints).
  for (const [x, y] of [
    [S / 2, 0],
    [S / 2, S],
    [0, S / 2],
    [S, S / 2],
  ] as const) {
    ctx.beginPath();
    const k = S * 0.085;
    ctx.moveTo(x, y - k);
    ctx.lineTo(x + k, y);
    ctx.lineTo(x, y + k);
    ctx.lineTo(x - k, y);
    ctx.closePath();
    ctx.fillStyle = inks.line;
    ctx.fill();
  }
  return c;
}

export function tex(c: HTMLCanvasElement, srgb: boolean, repeat = false): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}

export interface WallPalette {
  ivory: string;
  ivoryWarm: string;
  gold: string;
  goldDeep: string;
  goldPale: string;
  emerald: string;
}

export interface WallSpec {
  width: number;
  /** Height covered by the texture (wall + merlons). */
  height: number;
  archWidth: number;
  spring: number;
  apex: number;
  /** Lantern positions on the wall (x, y) for a baked gobo (low tier), or null. */
  bakedGobo: [number, number][] | null;
}

/** Wall layout shared by the painter and the 3D parts. */
export const WALL = {
  width: 21,
  height: 11,
  texHeight: 12,
  archWidth: 4.4,
  spring: 3.75,
  apex: 6.55,
  alfiz: { half: 3.4, top: 7.75, band: 0.48 },
  frieze: { half: 3.4, y0: 8.05, y1: 9.7 },
  dado: 1.2,
  niche: { x: 5.9, w: 2.3, y0: 1.55, spring: 5.0, apex: 6.75 },
} as const;

/**
 * The arch wall's face: ivory plaster, an emerald-and-gold zellige dado and alfiz (the frame
 * around the arch), ablaq voussoirs, gilded spandrel medallions, an inscription frieze for the
 * names and blind niches. Returns the colour map and the roughness/metalness mask.
 */
export function wallTextures(p: WallPalette, spec: WallSpec, pxPerUnit: number) {
  const W = spec.width;
  const H = spec.height;
  const k = pxPerUnit;
  const make = (mask: boolean) => {
    const [c, ctx] = canvas(Math.round(W * k), Math.round(H * k));
    const X = (x: number) => (x + W / 2) * k;
    const Y = (y: number) => (H - y) * k;
    const gold = mask ? MASK.gold : p.gold;
    const tileColors: Inks = mask
      ? { ground: MASK.glaze, star: MASK.glaze, line: MASK.gold, inner: MASK.gold }
      : { ground: p.emerald, star: p.ivory, line: p.gold, inner: p.gold };
    const tile = starTile(Math.round(0.62 * k), tileColors);
    const pattern = ctx.createPattern(tile, 'repeat')!;

    // Plaster.
    if (mask) {
      ctx.fillStyle = MASK.plaster;
      ctx.fillRect(0, 0, c.width, c.height);
    } else {
      const g = ctx.createLinearGradient(0, Y(H), 0, Y(0));
      g.addColorStop(0, p.ivory);
      g.addColorStop(1, p.ivoryWarm);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      const rand = mulberry32(41);
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rand() > 0.5 ? '#ffffff' : p.goldDeep;
        ctx.fillRect(rand() * c.width, rand() * c.height, 1 + rand() * 2, 1 + rand() * 2);
      }
      ctx.globalAlpha = 1;
    }

    const band = (x0: number, y0: number, x1: number, y1: number, fill: string | CanvasPattern) => {
      ctx.fillStyle = fill;
      ctx.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    };
    const goldRect = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      ctx.strokeStyle = gold;
      ctx.lineWidth = w * k;
      ctx.strokeRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k);
    };

    // Dado: zellige band with a gold rule and a plinth.
    band(-W / 2, 0, W / 2, WALL.dado, pattern);
    band(-W / 2, WALL.dado, W / 2, WALL.dado + 0.07, gold);
    band(-W / 2, WALL.dado + 0.1, W / 2, WALL.dado + 0.12, gold);
    band(-W / 2, 0, W / 2, 0.16, mask ? MASK.plaster : p.ivoryWarm);

    // Blind niches either side: shaded pointed recesses with a gold outline and a star.
    for (const side of [-1, 1]) {
      const n = WALL.niche;
      const cx = side * n.x;
      const path = () => {
        const { radius, left, right, apexAngle } = archArcs(n.w, n.spring, n.apex);
        ctx.beginPath();
        ctx.moveTo(X(cx - n.w / 2), Y(n.y0));
        ctx.lineTo(X(cx - n.w / 2), Y(n.spring));
        for (let i = 0; i <= 20; i++) {
          const a = Math.PI + ((apexAngle - Math.PI) * i) / 20;
          ctx.lineTo(X(cx + left[0] + Math.cos(a) * radius), Y(left[1] + Math.sin(a) * radius));
        }
        for (let i = 0; i <= 20; i++) {
          const a = Math.PI - apexAngle + ((0 - (Math.PI - apexAngle)) * i) / 20;
          ctx.lineTo(X(cx + right[0] + Math.cos(a) * radius), Y(right[1] + Math.sin(a) * radius));
        }
        ctx.lineTo(X(cx + n.w / 2), Y(n.y0));
        ctx.closePath();
      };
      path();
      if (mask) ctx.fillStyle = MASK.plaster;
      else {
        const g = ctx.createLinearGradient(0, Y(n.apex), 0, Y(n.y0));
        g.addColorStop(0, p.goldPale);
        g.addColorStop(0.35, p.ivoryWarm);
        g.addColorStop(1, p.ivory);
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 0.05 * k;
      ctx.stroke();
      // Inner outline.
      ctx.save();
      ctx.translate(X(cx), Y(n.y0));
      ctx.scale(0.88, 0.94);
      ctx.translate(-X(cx), -Y(n.y0));
      path();
      ctx.lineWidth = 0.022 * k;
      ctx.stroke();
      ctx.restore();
      // Star medallion in the niche head and a small tile panel at its foot.
      star8(ctx, X(cx), Y(n.spring + 0.75), 0.36 * k, Math.PI / 8);
      ctx.fillStyle = mask ? MASK.glaze : p.emerald;
      ctx.fill();
      ctx.lineWidth = 0.035 * k;
      ctx.stroke();
      star8(ctx, X(cx), Y(n.spring + 0.75), 0.15 * k);
      ctx.fillStyle = gold;
      ctx.fill();
      band(cx - n.w * 0.32, n.y0 + 0.35, cx + n.w * 0.32, n.y0 + 1.6, pattern);
      goldRect(cx - n.w * 0.32, n.y0 + 0.35, cx + n.w * 0.32, n.y0 + 1.6, 0.03);
    }

    // Alfiz: a zellige frame around the arch, gold-ruled.
    const A = WALL.alfiz;
    band(-A.half, 0, A.half, A.top, pattern);
    band(-A.half + A.band, 0, A.half - A.band, A.top - A.band, mask ? MASK.plaster : p.ivory);
    goldRect(-A.half, -0.1, A.half, A.top, 0.06);
    goldRect(-A.half + A.band, -0.1, A.half - A.band, A.top - A.band, 0.045);
    goldRect(-A.half - 0.09, -0.1, A.half + 0.09, A.top + 0.09, 0.018);

    // Spandrels: ivory with gilded eight-point medallions and a thin vine of stars.
    for (const side of [-1, 1]) {
      const mx = side * (WALL.archWidth / 2 + 0.36);
      const my = A.top - A.band - 0.62;
      ctx.beginPath();
      ctx.arc(X(mx), Y(my), 0.4 * k, 0, TAU);
      ctx.fillStyle = mask ? MASK.glaze : p.emerald;
      ctx.fill();
      ctx.lineWidth = 0.05 * k;
      ctx.strokeStyle = gold;
      ctx.stroke();
      star8(ctx, X(mx), Y(my), 0.33 * k);
      ctx.lineWidth = 0.03 * k;
      ctx.stroke();
      star8(ctx, X(mx), Y(my), 0.16 * k, Math.PI / 8);
      ctx.fillStyle = gold;
      ctx.fill();
    }

    // Ablaq voussoirs around the arch: alternating ivory and pale gold, gold-jointed.
    {
      const { radius, left, right, apexAngle } = archArcs(WALL.archWidth, WALL.spring, WALL.apex);
      const depth = 0.42;
      const count = 9;
      for (const [centre, a0, a1] of [
        [left, Math.PI, apexAngle],
        [right, Math.PI - apexAngle, 0],
      ] as const) {
        for (let i = 0; i < count; i++) {
          const s0 = a0 + ((a1 - a0) * i) / count;
          const s1 = a0 + ((a1 - a0) * (i + 1)) / count;
          ctx.beginPath();
          for (let j = 0; j <= 6; j++) {
            const a = s0 + ((s1 - s0) * j) / 6;
            ctx.lineTo(X(centre[0] + Math.cos(a) * radius), Y(centre[1] + Math.sin(a) * radius));
          }
          for (let j = 6; j >= 0; j--) {
            const a = s0 + ((s1 - s0) * j) / 6;
            ctx.lineTo(X(centre[0] + Math.cos(a) * (radius + depth)), Y(centre[1] + Math.sin(a) * (radius + depth)));
          }
          ctx.closePath();
          ctx.fillStyle = mask ? MASK.glaze : i % 2 ? p.goldPale : p.ivory;
          ctx.fill();
          ctx.lineWidth = 0.025 * k;
          ctx.strokeStyle = gold;
          ctx.stroke();
        }
      }
      // Jamb bands below the springing.
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -WALL.archWidth / 2 - depth : WALL.archWidth / 2;
        band(x0, 0, x0 + depth, WALL.spring, mask ? MASK.glaze : p.ivory);
        goldRect(x0, -0.1, x0 + depth, WALL.spring, 0.025);
      }
    }

    // Inscription frieze (the names sit on it in 3D).
    const F = WALL.frieze;
    band(-F.half, F.y0, F.half, F.y1, mask ? MASK.plaster : p.ivoryWarm);
    goldRect(-F.half, F.y0, F.half, F.y1, 0.05);
    goldRect(-F.half + 0.1, F.y0 + 0.1, F.half - 0.1, F.y1 - 0.1, 0.02);
    for (const side of [-1, 1]) {
      star8(ctx, X(side * (F.half - 0.42)), Y((F.y0 + F.y1) / 2), 0.26 * k);
      ctx.fillStyle = mask ? MASK.glaze : p.emerald;
      ctx.fill();
      ctx.lineWidth = 0.03 * k;
      ctx.strokeStyle = gold;
      ctx.stroke();
    }

    // Cornice under the merlons.
    band(-W / 2, 10.35, W / 2, 10.62, pattern);
    band(-W / 2, 10.3, W / 2, 10.35, gold);
    band(-W / 2, 10.62, W / 2, 10.67, gold);

    // Low tier: the lanterns' star light painted on (no moving gobo there).
    if (!mask && spec.bakedGobo) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly] of spec.bakedGobo) {
        const g = ctx.createRadialGradient(X(lx), Y(ly), 0, X(lx), Y(ly), 2.4 * k);
        g.addColorStop(0, 'rgba(255,196,120,0.28)');
        g.addColorStop(1, 'rgba(255,196,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(X(lx - 2.6), Y(ly + 2.6), 5.2 * k, 5.2 * k);
        const rand = mulberry32(Math.round(lx * 100) + 7);
        for (let i = 0; i < 26; i++) {
          const a = rand() * TAU;
          const r = 0.5 + rand() * 1.9;
          const R = (0.07 + rand() * 0.07) * k * (1.4 - r / 3);
          ctx.fillStyle = `rgba(255,214,150,${0.32 * (1 - r / 2.6)})`;
          star8(ctx, X(lx + Math.cos(a) * r * 1.1), Y(ly - 0.6 + Math.sin(a) * r * 0.8), R, rand());
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    return c;
  };
  return { map: tex(make(false), true), mr: tex(make(true), false) };
}

/** Courtyard marble: ivory slabs, gold grout and emerald star inlays (2 × 2 units, repeating). */
export function marbleTextures(p: WallPalette, size = 1024) {
  const make = (mask: boolean) => {
    const [c, ctx] = canvas(size, size);
    const S = size;
    ctx.fillStyle = mask ? MASK.marble : p.ivory;
    ctx.fillRect(0, 0, S, S);
    if (!mask) {
      const rand = mulberry32(5);
      // Soft veining.
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = `rgba(160,130,90,${0.04 + rand() * 0.05})`;
        ctx.lineWidth = 1 + rand() * 2.5;
        ctx.beginPath();
        let x = rand() * S;
        let y = rand() * S;
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          const nx = x + (rand() - 0.3) * S * 0.25;
          const ny = y + (rand() - 0.5) * S * 0.18;
          ctx.quadraticCurveTo(x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 80, nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
      }
      // Warm/cool slab variation.
      for (let sx = 0; sx < 2; sx++)
        for (let sy = 0; sy < 2; sy++) {
          ctx.fillStyle = (sx + sy) % 2 ? 'rgba(239,227,204,0.45)' : 'rgba(255,255,255,0.12)';
          ctx.fillRect((sx * S) / 2, (sy * S) / 2, S / 2, S / 2);
        }
    }
    // Grout.
    ctx.strokeStyle = mask ? MASK.gold : p.goldPale;
    ctx.lineWidth = S * 0.006;
    for (const v of [0, S / 2, S]) {
      ctx.beginPath();
      ctx.moveTo(v, 0);
      ctx.lineTo(v, S);
      ctx.moveTo(0, v);
      ctx.lineTo(S, v);
      ctx.stroke();
    }
    // Inlaid stars at slab corners.
    for (const [x, y] of [
      [0, 0],
      [S, 0],
      [0, S],
      [S, S],
      [S / 2, S / 2],
    ] as const) {
      star8(ctx, x, y, S * 0.07);
      ctx.fillStyle = mask ? MASK.glaze : p.emerald;
      ctx.fill();
      ctx.strokeStyle = mask ? MASK.gold : p.gold;
      ctx.lineWidth = S * 0.007;
      ctx.stroke();
      star8(ctx, x, y, S * 0.028, Math.PI / 8);
      ctx.fillStyle = mask ? MASK.gold : p.gold;
      ctx.fill();
    }
    return c;
  };
  return { map: tex(make(false), true, true), mr: tex(make(true), false, true) };
}

/** The gilded card inside the pochette: ivory to pale gold, double gold rule, star medallion. */
export function cardTexture(p: WallPalette, size = 512): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(0.6, p.ivory);
  g.addColorStop(1, p.goldPale);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = size * 0.012;
  ctx.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(size * 0.085, size * 0.085, size * 0.83, size * 0.83);
  ctx.lineWidth = size * 0.008;
  star8(ctx, size / 2, size / 2, size * 0.2);
  ctx.stroke();
  star8(ctx, size / 2, size / 2, size * 0.13, Math.PI / 8);
  ctx.stroke();
  ctx.fillStyle = p.gold;
  star8(ctx, size / 2, size / 2, size * 0.05);
  ctx.fill();
  for (const [x, y] of [
    [0.06, 0.06],
    [0.94, 0.06],
    [0.06, 0.94],
    [0.94, 0.94],
  ] as const) {
    star8(ctx, x * size, y * size, size * 0.035);
    ctx.fill();
  }
  return tex(c, true);
}

/** A zellige path texture (repeating), in ivory and gold with emerald hearts. */
export function pathTexture(p: WallPalette, size = 256) {
  return tex(starTile(size, { ground: p.goldPale, star: p.ivory, line: p.gold, inner: p.emerald }), true, true);
}

/**
 * Pierced brass: rows of eight-point stars and dots, white where light shines through.
 * Used as the lantern body's emissive map (6 repeats around).
 */
export function piercedTexture(w = 512, h = 256): CanvasTexture {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  const cols = 6;
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const cx = cw * (i + 0.5);
    star8(ctx, cx, h * 0.5, cw * 0.3);
    ctx.fill();
    ctx.fillStyle = '#000';
    star8(ctx, cx, h * 0.5, cw * 0.12, Math.PI / 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const yy of [0.14, 0.86]) {
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(cw * i + cw * (0.2 + j * 0.3), h * yy, cw * 0.055, 0, TAU);
        ctx.fill();
      }
    }
    // Teardrops between stars.
    ctx.beginPath();
    ctx.ellipse(cw * i, h * 0.5, cw * 0.06, h * 0.14, 0, 0, TAU);
    ctx.fill();
  }
  const t = tex(c, true, true);
  return t;
}

/**
 * The lantern's star gobo for SpotLight.map: a pool of light (floorLevel = what the dark parts let through)
 * with brighter star and dot piercings in rings.
 */
export function starGobo(size = 512, floorLevel = 0.6): CanvasTexture {
  const [c, ctx] = canvas(size, size);
  const floor = Math.round(floorLevel * 255);
  ctx.fillStyle = `rgb(${floor},${floor},${floor})`;
  ctx.fillRect(0, 0, size, size);
  ctx.filter = 'blur(1px)';
  ctx.fillStyle = '#fff';
  const m = size / 2;
  star8(ctx, m, m, size * 0.08);
  ctx.fill();
  const rings: [number, number, number][] = [
    [0.17, 8, 0.055],
    [0.29, 12, 0.048],
    [0.4, 16, 0.036],
  ];
  rings.forEach(([r, n, s], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ri * 0.2;
      star8(ctx, m + Math.cos(a) * r * size, m + Math.sin(a) * r * size, s * size, a);
      ctx.fill();
      ctx.beginPath();
      const a2 = a + Math.PI / n;
      ctx.arc(m + Math.cos(a2) * r * size, m + Math.sin(a2) * r * size, s * size * 0.32, 0, TAU);
      ctx.fill();
    }
  });
  ctx.filter = 'none';
  const g = ctx.createRadialGradient(m, m, size * 0.36, m, m, size * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Linear data: the light multiplies by these values directly (floor ≈ 0.59).
  return tex(c, false);
}

/**
 * Emboss for a pochette flap (normal map): beaded borders along the two slanted edges and a
 * floral spray (stem, leaves, five-petal blossoms) up the flap's axis to a rosette at the point.
 * The flap's UVs span its bounding box: u across the hinge, v = 1 at the hinge, 0 at the point.
 */
export function flapEmboss(w = 512, h = 300): CanvasTexture {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = 'blur(1.6px)';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  const P = (u: number, v: number): [number, number] => [u * w, (1 - v) * h];
  // Inset rules along the slanted edges.
  for (const inset of [0.06, 0.1]) {
    ctx.lineWidth = inset === 0.06 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(...P(0.04 + inset, 1 - inset * 0.4));
    ctx.lineTo(...P(0.5, inset * 1.6 + 0.02));
    ctx.lineTo(...P(0.96 - inset, 1 - inset * 0.4));
    ctx.stroke();
  }
  // Beads along the outer rule.
  for (let i = 1; i < 18; i++) {
    const t = i / 18;
    for (const side of [-1, 1]) {
      const u = 0.5 + side * (0.38 - 0.36 * t);
      const v = 0.94 - 0.82 * t;
      ctx.beginPath();
      ctx.arc(...P(u, v), 2.2, 0, TAU);
      ctx.fill();
    }
  }
  const petal = (x: number, y: number, r: number, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.32, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  const blossom = (u: number, v: number, r: number) => {
    const [x, y] = P(u, v);
    for (let k = 0; k < 5; k++) petal(x, y, r, (k / 5) * TAU);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
  };
  // Stem.
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(...P(0.5, 0.86));
  ctx.bezierCurveTo(...P(0.46, 0.65), ...P(0.54, 0.45), ...P(0.5, 0.3));
  ctx.stroke();
  // Leaves.
  for (let i = 0; i < 6; i++) {
    const v = 0.8 - i * 0.085;
    const side = i % 2 ? 1 : -1;
    const [x, y] = P(0.5 + side * 0.015, v);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side * 0.9);
    ctx.beginPath();
    ctx.ellipse(0, -14, 5, 14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  blossom(0.5, 0.25, 20);
  blossom(0.4, 0.62, 13);
  blossom(0.6, 0.5, 13);
  blossom(0.5, 0.86, 10);
  return heightToNormal(c, 2.6);
}
