/**
 * The hall's façade as numbers, shared by the 3D model, the line drawing on the card (and its
 * 3D twin that dissolves into the real façade), the 2D fallback and the content page. World
 * units, y up, the façade's centre line at x = 0; the doorway's wall face sits at z = WALL.z.
 *
 * Neoclassical: a stepped porch, four fluted Corinthian columns, an entablature with dentils, a
 * triangular pediment carrying the hall's name, black double doors under a wrought-iron fanlight,
 * tall windows, and lower wings either side. Drawn by us from the general type of building;
 * no photograph or logo is traced.
 */

export const PORCH = 0.9; // top of the stylobate
export const STEPS = { count: 4, rise: 0.225, tread: 0.42, halfWidth: 4.35, front: 2.68 };
export const COLUMN = { xs: [-4.0, -1.45, 1.45, 4.0] as const, z: 0.6, radius: 0.27, top: 0.23, height: 5.4 };
export const COL_BASE = 0.3;
export const COL_CAPITAL = 0.58;
export const ENT = { bottom: PORCH + COLUMN.height, architrave: 0.32, frieze: 0.26, cornice: 0.24, halfWidth: 4.75, corniceHalfWidth: 4.98 };
export const ENT_TOP = ENT.bottom + ENT.architrave + ENT.frieze + ENT.cornice; // 7.12
export const PEDIMENT = { base: ENT_TOP, apex: ENT_TOP + 1.5, halfWidth: 4.98, inset: 0.3 };
export const WALL = { z: -1.2, depth: 0.4, halfWidth: 5.0, top: ENT.bottom };
export const DOOR = { halfWidth: 0.8, top: 4.3, lintel: 0.2 };
export const FANLIGHT = { cy: DOOR.top + DOOR.lintel, r: 0.74 };
export const WINDOWS = { xs: [-2.72, 2.72] as const, halfWidth: 0.45, bottom: 2.0, top: 4.6 };
export const WING = { from: WALL.halfWidth, to: 10.4, top: 5.7, windowXs: [6.6, 8.6] as const, windowHalfWidth: 0.45, windowBottom: 2.1, windowTop: 4.4 };
export const LAMPS = { xs: [-5.35, 5.35] as const, z: 2.4, height: 3.2 };

/** The drawing's frame (elevation, world units): the portico with a little air around it. */
export const ELEVATION = { left: -5.65, right: 5.65, bottom: -0.05, top: 8.9 };
export const ELEVATION_W = ELEVATION.right - ELEVATION.left;
export const ELEVATION_H = ELEVATION.top - ELEVATION.bottom;

/** One stroke of the drawing: an SVG path in drawing space (x right, y down, origin top-left). */
export interface Stroke {
  d: string;
  /** Relative pen weight: 1 = outline, < 1 = detail. */
  w: number;
}

const f = (n: number) => Math.round(n * 1000) / 1000;
/** World (x, y-up) → drawing space (x from the left edge, y down from the top). */
export const toDrawing = (x: number, y: number): [number, number] => [f(x - ELEVATION.left), f(ELEVATION.top - y)];

function poly(pts: [number, number][], close = false): string {
  return (
    pts
      .map(([x, y], i) => {
        const [dx, dy] = toDrawing(x, y);
        return `${i ? 'L' : 'M'}${dx} ${dy}`;
      })
      .join('') + (close ? 'Z' : '')
  );
}
const line = (x0: number, y0: number, x1: number, y1: number) => poly([[x0, y0], [x1, y1]]);
const rect = (x0: number, y0: number, x1: number, y1: number) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true);
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 24): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  });
}
/** A small spiral (an Ionic/Corinthian volute) turning `dir` (+1 counter-clockwise). */
function volute(cx: number, cy: number, r: number, dir: 1 | -1): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const a = dir * t * Math.PI * 2.4 + (dir > 0 ? Math.PI : 0);
    const rr = r * (1 - t * 0.78);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts);
}

function columnStrokes(x: number): Stroke[] {
  const { radius: r0, top: r1 } = COLUMN;
  const y0 = PORCH;
  const shaft0 = y0 + COL_BASE;
  const shaft1 = PORCH + COLUMN.height - COL_CAPITAL;
  const top = PORCH + COLUMN.height;
  const s: Stroke[] = [];
  // Base: a square plinth and two tori.
  s.push({ d: rect(x - r0 * 1.45, y0, x + r0 * 1.45, y0 + 0.1), w: 0.8 });
  s.push({ d: poly([...arc(x - r0 * 1.18, y0 + 0.16, 0.06, -Math.PI / 2, -Math.PI * 1.5, 8)]), w: 0.6 });
  s.push({ d: poly([...arc(x + r0 * 1.18, y0 + 0.16, 0.06, -Math.PI / 2, Math.PI / 2, 8)]), w: 0.6 });
  s.push({ d: line(x - r0 * 1.18, y0 + 0.22, x + r0 * 1.18, y0 + 0.22), w: 0.5 });
  s.push({ d: line(x - r0 * 1.12, shaft0, x + r0 * 1.12, shaft0), w: 0.6 });
  // Shaft with entasis-free taper, and flutes.
  s.push({ d: line(x - r0, shaft0, x - r1, shaft1), w: 1 });
  s.push({ d: line(x + r0, shaft0, x + r1, shaft1), w: 1 });
  for (const k of [-0.62, -0.22, 0.22, 0.62]) s.push({ d: line(x + k * r0, shaft0 + 0.08, x + k * r1, shaft1 - 0.06), w: 0.42 });
  // Corinthian capital: astragal, the bell with two rows of acanthus, volutes, abacus.
  s.push({ d: line(x - r1 * 1.05, shaft1, x + r1 * 1.05, shaft1), w: 0.7 });
  const bellTop = top - 0.12;
  s.push({ d: poly([[x - r1, shaft1], [x - r1 * 1.55, bellTop]]), w: 0.75 });
  s.push({ d: poly([[x + r1, shaft1], [x + r1 * 1.55, bellTop]]), w: 0.75 });
  for (const [k, h] of [
    [-0.55, 0.26],
    [0, 0.3],
    [0.55, 0.26],
  ] as const) {
    const lx = x + k * r1;
    s.push({ d: poly([[lx - 0.07, shaft1 + 0.02], [lx - 0.05, shaft1 + h * 0.7], [lx, shaft1 + h], [lx + 0.05, shaft1 + h * 0.7], [lx + 0.07, shaft1 + 0.02]]), w: 0.45 });
  }
  for (const k of [-0.9, -0.3, 0.3, 0.9]) {
    const lx = x + k * r1 * 1.2;
    s.push({ d: poly([[lx - 0.06, shaft1 + 0.22], [lx, shaft1 + 0.44], [lx + 0.06, shaft1 + 0.22]]), w: 0.42 });
  }
  s.push({ d: volute(x - r1 * 1.42, bellTop - 0.08, 0.085, -1), w: 0.5 });
  s.push({ d: volute(x + r1 * 1.42, bellTop - 0.08, 0.085, 1), w: 0.5 });
  s.push({ d: rect(x - r1 * 1.85, bellTop, x + r1 * 1.85, top), w: 0.8 });
  return s;
}

/** The line drawing of the façade (elevation), as strokes. */
export function facadeStrokes(): Stroke[] {
  const s: Stroke[] = [];
  const P = PORCH;
  // Ground and steps.
  s.push({ d: line(ELEVATION.left + 0.1, 0, ELEVATION.right - 0.1, 0), w: 0.9 });
  for (let i = 1; i <= STEPS.count; i++) {
    const y = i * STEPS.rise;
    s.push({ d: line(-STEPS.halfWidth - (STEPS.count - i) * 0.04, y, STEPS.halfWidth + (STEPS.count - i) * 0.04, y), w: i === STEPS.count ? 0.9 : 0.55 });
  }
  s.push({ d: line(-STEPS.halfWidth - 0.16, 0, -STEPS.halfWidth, P), w: 0.6 });
  s.push({ d: line(STEPS.halfWidth + 0.16, 0, STEPS.halfWidth, P), w: 0.6 });
  // Porch podium either side of the steps.
  s.push({ d: poly([[-4.95, 0], [-4.95, P], [-STEPS.halfWidth, P]]), w: 0.8 });
  s.push({ d: poly([[4.95, 0], [4.95, P], [STEPS.halfWidth, P]]), w: 0.8 });

  // The wall behind the columns, the doorway and the fanlight.
  const D = DOOR.halfWidth;
  s.push({ d: rect(-D - 0.16, P, D + 0.16, DOOR.top + 0.04), w: 0.75 });
  s.push({ d: rect(-D, P, D, DOOR.top - 0.06), w: 0.9 });
  s.push({ d: line(0, P, 0, DOOR.top - 0.06), w: 0.7 });
  for (const side of [-1, 1]) {
    const x0 = side * 0.14;
    const x1 = side * (D - 0.14);
    s.push({ d: rect(Math.min(x0, x1), P + 0.3, Math.max(x0, x1), P + 1.45), w: 0.45 });
    s.push({ d: rect(Math.min(x0, x1), P + 1.65, Math.max(x0, x1), DOOR.top - 0.3), w: 0.45 });
    s.push({ d: line(side * 0.09, P + 1.5, side * 0.09, P + 1.9), w: 0.6 });
  }
  s.push({ d: rect(-D - 0.3, DOOR.top + 0.04, D + 0.3, DOOR.top + DOOR.lintel), w: 0.75 });
  // Fanlight: semicircle, radial bars, scrolls and a rosette — the wrought-iron crest.
  const { cy, r } = FANLIGHT;
  s.push({ d: poly([...arc(0, cy, r, 0, Math.PI, 32)], true), w: 0.85 });
  s.push({ d: poly(arc(0, cy, r * 0.32, 0, Math.PI, 16)), w: 0.55 });
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    s.push({ d: line(Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32, Math.cos(a) * r * 0.97, cy + Math.sin(a) * r * 0.97), w: 0.42 });
  }
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI;
    const mx = Math.cos(a) * r * 0.68;
    const my = cy + Math.sin(a) * r * 0.68;
    s.push({ d: poly(arc(mx, my, 0.085, a + Math.PI * 0.2, a + Math.PI * 1.75, 12)), w: 0.38 });
  }
  s.push({ d: poly(arc(0, cy, 0.12, 0, Math.PI * 2, 16), true), w: 0.5 });
  // A crest over the fanlight: a small cartouche with scrolls.
  s.push({ d: poly([[-0.5, cy + r + 0.06], [-0.22, cy + r + 0.18], [0, cy + r + 0.36], [0.22, cy + r + 0.18], [0.5, cy + r + 0.06]]), w: 0.55 });
  s.push({ d: volute(-0.6, cy + r + 0.1, 0.08, -1), w: 0.4 });
  s.push({ d: volute(0.6, cy + r + 0.1, 0.08, 1), w: 0.4 });

  // Windows between the outer columns.
  for (const x of WINDOWS.xs) {
    const h = WINDOWS.halfWidth;
    s.push({ d: rect(x - h, WINDOWS.bottom, x + h, WINDOWS.top), w: 0.75 });
    s.push({ d: rect(x - h - 0.1, WINDOWS.bottom - 0.12, x + h + 0.1, WINDOWS.bottom), w: 0.55 });
    s.push({ d: line(x, WINDOWS.bottom, x, WINDOWS.top), w: 0.4 });
    s.push({ d: line(x - h, WINDOWS.top - 0.85, x + h, WINDOWS.top - 0.85), w: 0.4 });
    s.push({ d: poly([[x - h - 0.16, WINDOWS.top + 0.1], [x, WINDOWS.top + 0.42], [x + h + 0.16, WINDOWS.top + 0.1]], true), w: 0.55 });
  }

  // Columns.
  for (const x of COLUMN.xs) s.push(...columnStrokes(x));

  // Entablature: architrave (two fasciae), frieze, dentils and cornice.
  const E = ENT;
  const y0 = E.bottom;
  const y1 = y0 + E.architrave;
  const y2 = y1 + E.frieze;
  s.push({ d: rect(-E.halfWidth, y0, E.halfWidth, y1), w: 0.9 });
  s.push({ d: line(-E.halfWidth, y0 + E.architrave * 0.45, E.halfWidth, y0 + E.architrave * 0.45), w: 0.4 });
  s.push({ d: line(-E.halfWidth, y2, E.halfWidth, y2), w: 0.7 });
  for (let x = -E.halfWidth + 0.12; x < E.halfWidth - 0.05; x += 0.2) s.push({ d: rect(x, y2 - 0.09, x + 0.09, y2), w: 0.35 });
  s.push({ d: rect(-E.corniceHalfWidth, y2, E.corniceHalfWidth, ENT_TOP), w: 0.9 });
  s.push({ d: line(-E.corniceHalfWidth, y2 + E.cornice * 0.4, E.corniceHalfWidth, y2 + E.cornice * 0.4), w: 0.4 });

  // Pediment: raking cornice and the recessed tympanum.
  const Pd = PEDIMENT;
  s.push({ d: poly([[-Pd.halfWidth, Pd.base], [0, Pd.apex], [Pd.halfWidth, Pd.base]]), w: 1 });
  const slope = (Pd.apex - Pd.base) / Pd.halfWidth;
  const ih = Pd.halfWidth - Pd.inset / Math.sin(Math.atan(slope)) - 0.1;
  s.push({ d: poly([[-ih, Pd.base + 0.12], [0, Pd.base + 0.12 + ih * slope], [ih, Pd.base + 0.12]], true), w: 0.6 });
  s.push({ d: poly([[-Pd.halfWidth + 0.1, Pd.base + 0.05], [0, Pd.apex - 0.1], [Pd.halfWidth - 0.1, Pd.base + 0.05]]), w: 0.4 });
  // Acroteria: small finials at the apex and the two corners.
  s.push({ d: poly([[-0.14, Pd.apex - 0.04], [0, Pd.apex + 0.22], [0.14, Pd.apex - 0.04]]), w: 0.5 });
  for (const side of [-1, 1]) s.push({ d: poly([[side * Pd.halfWidth, Pd.base], [side * (Pd.halfWidth - 0.05), Pd.base + 0.24], [side * (Pd.halfWidth - 0.28), Pd.base + 0.08]]), w: 0.5 });

  // Lamp posts at the foot of the steps.
  for (const x of LAMPS.xs) {
    s.push({ d: line(x, 0, x, LAMPS.height - 0.25), w: 0.6 });
    s.push({ d: rect(x - 0.12, 0, x + 0.12, 0.3), w: 0.5 });
    s.push({ d: poly(arc(x, LAMPS.height - 0.05, 0.2, 0, Math.PI * 2, 18), true), w: 0.55 });
  }
  return s;
}

/** Where the hall's name sits in the tympanum (drawing space), and its cap height. */
export const PEDIMENT_TEXT = (() => {
  const [x, y] = toDrawing(0, PEDIMENT.base + 0.48);
  return { x, y, size: 0.42 };
})();

/** The whole drawing as one SVG (for the content page and the 2D path). */
export function facadeSvg(stroke: string, weight = 0.035, name?: string, nameFont = 'serif'): string {
  const paths = facadeStrokes()
    .map((st) => `<path d='${st.d}' stroke-width='${f(weight * (0.45 + st.w * 0.55))}'/>`)
    .join('');
  const text = name
    ? `<text x='${PEDIMENT_TEXT.x}' y='${PEDIMENT_TEXT.y}' font-size='${PEDIMENT_TEXT.size}' font-family='${nameFont}' text-anchor='middle' fill='${stroke}' stroke='none' direction='rtl'>${name}</text>`
    : '';
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${f(ELEVATION_W)} ${f(ELEVATION_H)}'><g fill='none' stroke='${stroke}' stroke-linecap='round' stroke-linejoin='round'>${paths}</g>${text}</svg>`;
}
