/**
 * Procedural geometry for the loggia terrace and the vista beyond it: the wall with its cusped
 * arch, the balustrade and urns, sheer curtains, brass lanterns, the mountains and the lakeside
 * village. Pure builders (no React), vertex-coloured, merged so each material is one draw call.
 */
import { BoxGeometry, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Path, Shape, SphereGeometry, TorusGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grid, lin, noise3, paint, type Detail } from './geometry';
import { ARCH, archOutline, chainTop, FLOOR_Y, LANTERNS, openingOutline, RAIL, rng, SIDE_ARCH, smoothstep, SUN, WALL, type V3 } from './layout';

type RGB = [number, number, number];

function merge(parts: BufferGeometry[]): BufferGeometry {
  const list = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  // Every part needs the same attributes to merge.
  for (const g of list) {
    if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
    if (!g.attributes.color) paint(g, () => [1, 1, 1]);
  }
  const out = mergeGeometries(list, false);
  if (!out) throw new Error('sacred-garden: terrace merge failed');
  parts.forEach((p) => p.dispose());
  list.forEach((p) => p.dispose());
  return out;
}

const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------------------------------------------------------------------------------------
// the loggia (arch frame: origin on the floor under the opening's axis, z = 0 the wall's middle)

/** The terrace wall with the cusped opening cut out, its proud arch ring, imposts and plinths. */
export function buildLoggia(stone: string, detail: Detail): BufferGeometry {
  const seg = detail === 'low' ? 16 : 28;
  const { half, top, depth } = WALL;
  const wallShape = new Shape();
  wallShape.moveTo(-half, -0.02);
  wallShape.lineTo(half, -0.02);
  wallShape.lineTo(half, top);
  wallShape.lineTo(-half, top);
  wallShape.closePath();
  const opening = openingOutline(seg);
  const side = (dx: number) => opening.map(([x, y]) => [dx + x * SIDE_ARCH.scaleX, y * SIDE_ARCH.scaleY] as [number, number]);
  for (const poly of [opening, side(-SIDE_ARCH.x), side(SIDE_ARCH.x)]) wallShape.holes.push(new Path(poly.map(([x, y]) => new Vector2(x, Math.max(-0.02, y))).reverse()));
  const wall = new ExtrudeGeometry(wallShape, { depth, bevelEnabled: false, curveSegments: 4 });
  wall.translate(0, 0, -depth / 2);

  const ringShape = new Shape(archOutline(seg).map(([x, y]) => new Vector2(x, y)));
  const ring = new ExtrudeGeometry(ringShape, { depth: ARCH.depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: detail === 'low' ? 1 : 2, curveSegments: 4 });
  ring.translate(0, 0, -ARCH.depth / 2);

  const parts: BufferGeometry[] = [wall, ring];
  // The side arches' rings (scaled copies of the main one, a little less deep).
  for (const sx of [-SIDE_ARCH.x, SIDE_ARCH.x]) {
    const r = new ExtrudeGeometry(new Shape(archOutline(seg).map(([x, y]) => new Vector2(sx + x * SIDE_ARCH.scaleX, y * SIDE_ARCH.scaleY))), { depth: ARCH.depth * 0.85, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 1, curveSegments: 4 });
    r.translate(0, 0, -(ARCH.depth * 0.85) / 2);
    parts.push(r);
  }
  const { a, t, spring } = ARCH;
  for (const side of [-1, 1]) {
    const x = side * (a + t / 2);
    const impost = new BoxGeometry(t + 0.16, 0.12, ARCH.depth + 0.12);
    impost.translate(x, spring - 0.02, 0);
    const plinth = new BoxGeometry(t + 0.2, 0.42, ARCH.depth + 0.14);
    plinth.translate(x, 0.21, 0);
    const torus = new BoxGeometry(t + 0.12, 0.06, ARCH.depth + 0.08);
    torus.translate(x, 0.45, 0);
    parts.push(impost, plinth, torus);
  }
  // A cornice along the top of the wall.
  const cornice = new BoxGeometry(half * 2, 0.22, depth + 0.16);
  cornice.translate(0, 10.6, 0);
  parts.push(cornice);
  const g = merge(parts);
  const base = lin(stone);
  return paint(g, (x, y, z) => {
    const n = noise3(x * 1.7, y * 1.7, z * 1.7);
    // Ashlar courses: a faint darker line every 0.55 m, joints staggered.
    const course = Math.abs(((y + 0.02) % 0.55) - 0.275) > 0.268 ? 0.93 : 1;
    const foot = 1 - 0.1 * (1 - smoothstep(0, 0.8, y));
    const k = (0.94 + n * 0.1) * course * foot;
    return [base[0] * k, base[1] * k, base[2] * k];
  });
}

// ---------------------------------------------------------------------------------------------
// the terrace (world frame)

/** One turned baluster, foot at y = 0, ≈0.76 m tall (for instancing). */
export function buildBaluster(detail: Detail): BufferGeometry {
  const h = RAIL.h - 0.27;
  const prof: [number, number][] = [
    [0.0, 0],
    [0.07, 0],
    [0.07, 0.05],
    [0.05, 0.07],
    [0.06, 0.1],
    [0.085, 0.2],
    [0.095, 0.3],
    [0.08, 0.4],
    [0.05, 0.5],
    [0.037, 0.6],
    [0.05, 0.66],
    [0.042, 0.7],
    [0.062, 0.74],
    [0.062, 0.78],
    [0.0, 0.78],
  ];
  const g = new LatheGeometry(
    prof.map(([r, y]) => new Vector2(r, (y / 0.78) * h)),
    detail === 'low' ? 7 : 12,
  );
  return paint(g, () => [1, 1, 1]);
}

/** Baluster x positions along the rail, leaving room for the pedestals. */
export function balusterXs(): number[] {
  const out: number[] = [];
  const posts = pedestalXs();
  for (let x = -RAIL.half + 0.2; x <= RAIL.half - 0.2; x += RAIL.pitch) if (posts.every((p) => Math.abs(p - x) > 0.36)) out.push(x);
  return out;
}

export function pedestalXs(): number[] {
  return [-8.4, -5.1, -RAIL.pedestalX, RAIL.pedestalX, 5.1, 8.4];
}

/** Plinth, handrail, pedestals and the two urns, as one stone geometry. */
export function buildBalustrade(stone: string, detail: Detail): BufferGeometry {
  const { z, h, half } = RAIL;
  const y0 = FLOOR_Y;
  const parts: BufferGeometry[] = [];
  const box = (w: number, hh: number, d: number, x: number, y: number, zz: number) => {
    const b = new BoxGeometry(w, hh, d);
    b.translate(x, y, zz);
    parts.push(b);
  };
  box(half * 2, 0.16, 0.44, 0, y0 + 0.08, z);
  box(half * 2, 0.06, 0.34, 0, y0 + 0.19, z);
  box(half * 2, 0.07, 0.34, 0, y0 + h - 0.15, z);
  box(half * 2 + 0.1, 0.09, 0.42, 0, y0 + h - 0.045, z);
  // The terrace's face down to the water, under the rail.
  box(half * 2 + 0.4, FLOOR_Y + 0.4, 0.3, 0, FLOOR_Y / 2 - 0.4, z - 0.12);
  for (const x of pedestalXs()) {
    box(0.48, 0.14, 0.48, x, y0 + 0.07, z);
    box(0.42, h - 0.16, 0.42, x, y0 + 0.14 + (h - 0.16) / 2, z);
    box(0.52, 0.08, 0.52, x, y0 + h + 0.0, z);
  }
  // Urns on the two pedestals by the arch: a fluted bowl on a stem.
  const urn: [number, number][] = [
    [0.0, 0],
    [0.16, 0],
    [0.16, 0.04],
    [0.09, 0.07],
    [0.07, 0.14],
    [0.1, 0.18],
    [0.2, 0.24],
    [0.27, 0.34],
    [0.28, 0.42],
    [0.3, 0.46],
    [0.3, 0.5],
    [0.0, 0.5],
  ];
  for (const side of [-1, 1]) {
    const g = new LatheGeometry(
      urn.map(([r, y]) => new Vector2(r, y)),
      detail === 'low' ? 10 : 18,
    );
    g.translate(side * RAIL.pedestalX, y0 + h + 0.04, z);
    parts.push(g);
  }
  const g = merge(parts);
  const base = lin(stone);
  return paint(g, (x, y, zz) => {
    const n = noise3(x * 2.3, y * 2.3, zz * 2.3);
    const shade = y < FLOOR_Y ? 0.8 : 1;
    const k = (0.93 + n * 0.12) * shade;
    return [base[0] * k, base[1] * k, base[2] * k];
  });
}

// ---------------------------------------------------------------------------------------------
// curtains (arch frame)

/** The inner arc's height at x (for the curtain's top edge). */
function innerArcY(x: number): number {
  const r = ARCH.a + ARCH.e;
  const dx = Math.abs(x) + ARCH.e;
  return ARCH.spring + Math.sqrt(Math.max(0, r * r - dx * dx));
}

/**
 * Two sheer curtains hung inside the opening, tied back low: wide at the top, gathered at the
 * tie, flaring to the floor. uv: u across (0 at the wall edge), v down (0 at the top), for the
 * sway in the material's vertex shader.
 */
export function buildCurtains(detail: Detail): BufferGeometry {
  const [cols, rows] = detail === 'low' ? [14, 22] : detail === 'medium' ? [22, 36] : [30, 48];
  const parts: BufferGeometry[] = [];
  const { a } = ARCH;
  for (const side of [-1, 1]) {
    const g = grid(cols, rows, (u, v) => {
      const tieV = 0.68;
      // Width of the cloth (from the wall edge) down its length.
      const wTop = 1.05;
      const wTie = 0.3;
      const wFoot = 0.62;
      const w = v < tieV ? wTop + (wTie - wTop) * smoothstep(0, tieV, v) ** 0.8 : wTie + (wFoot - wTie) * smoothstep(tieV, 1, v);
      const xi = -a + 0.04 + u * w;
      const x = side * -xi;
      const top = innerArcY(xi) - 0.06;
      const y = top * (1 - v) + 0.0 * v;
      // Pleats: tighter where it's gathered.
      const gather = 1 - Math.min(1, w / wTop);
      const pleat = Math.sin(u * Math.PI * (7 + gather * 6)) * (0.035 + gather * 0.05);
      return [x, Math.max(0.01, y), -0.08 + pleat + u * 0.04];
    });
    // Mirror the right curtain's winding so both face the camera.
    if (side > 0) {
      const idx = g.index!.array as Uint16Array | Uint32Array;
      for (let i = 0; i < idx.length; i += 3) {
        const t = idx[i + 1]!;
        idx[i + 1] = idx[i + 2]!;
        idx[i + 2] = t;
      }
      g.computeVertexNormals();
    }
    parts.push(g);
  }
  const out = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return out;
}

// ---------------------------------------------------------------------------------------------
// lanterns (world frame)

export interface LanternSet {
  brass: BufferGeometry;
  glass: BufferGeometry;
  candles: BufferGeometry;
  /** Flame positions (world), with a size. */
  flames: { at: V3; size: number }[];
}

/** Brass hexagonal lanterns with glass panes and a candle each; hanging ones get a chain. */
export function buildLanterns(detail: Detail): LanternSet {
  const sides = 6;
  const brass: BufferGeometry[] = [];
  const glass: BufferGeometry[] = [];
  const candles: BufferGeometry[] = [];
  const flames: { at: V3; size: number }[] = [];
  const brassCol = lin('#C79A4E');
  LANTERNS.forEach((l, li) => {
    const s = l.scale;
    const [x, y, z] = l.at;
    // Hanging lanterns are placed by their top ring; standing ones by their foot.
    const foot = l.hanging ? y - 0.62 * s : y;
    const put = (g: BufferGeometry, gx: number, gy: number, gz: number) => {
      g.scale(s, s, s);
      g.translate(x + gx * s, foot + gy * s, z + gz * s);
      return g;
    };
    brass.push(put(new CylinderGeometry(0.13, 0.14, 0.035, sides), 0, 0.018, 0));
    brass.push(put(new CylinderGeometry(0.115, 0.13, 0.03, sides), 0, 0.05, 0));
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      const post = new BoxGeometry(0.014, 0.33, 0.014);
      brass.push(put(post, Math.cos(a) * 0.108, 0.23, Math.sin(a) * 0.108));
    }
    brass.push(put(new CylinderGeometry(0.12, 0.115, 0.025, sides), 0, 0.4, 0));
    brass.push(put(new ConeGeometry(0.135, 0.15, sides), 0, 0.485, 0));
    brass.push(put(new SphereGeometry(0.025, 8, 6), 0, 0.575, 0));
    brass.push(put(new TorusGeometry(0.03, 0.007, 6, 12), 0, 0.615, 0));
    glass.push(put(new CylinderGeometry(0.104, 0.104, 0.33, sides, 1, true), 0, 0.23, 0));
    const ch = 0.09 + ((li * 0.37) % 1) * 0.07;
    candles.push(put(new CylinderGeometry(0.034, 0.036, ch, 12), 0, 0.065 + ch / 2, 0));
    flames.push({ at: [x, foot + (0.065 + ch + 0.028) * s, z], size: s });
    if (l.hanging) {
      const top = chainTop(x) - (y);
      const chain = new CylinderGeometry(0.006, 0.006, top, 5);
      chain.translate(x, y + top / 2, z);
      brass.push(chain);
    }
  });
  void detail;
  const b = merge(brass);
  paint(b, () => brassCol);
  const g = merge(glass);
  const c = merge(candles);
  paint(c, (_x, yy) => mixRgb(lin('#F6EBDB'), lin('#FFF6E8'), smoothstep(FLOOR_Y, FLOOR_Y + 0.2, yy)));
  return { brass: b, glass: g, candles: c, flames };
}

// ---------------------------------------------------------------------------------------------
// the vista (world frame, unlit: the colours carry the atmosphere)

export interface VistaColors {
  haze: string;
  near: string;
  mid: string;
  far: string;
  wall: string;
  roof: string;
  tree: string;
}

/** The sun's x at a given depth (where the valley opens). */
export function sunX(z: number): number {
  const [dx, , dz] = SUN.dir;
  return (dx / dz) * z;
}

/** Layered ridges, hazier with distance; the nearest layer opens a valley under the sun. */
export function buildMountains(c: VistaColors, detail: Detail): BufferGeometry {
  const n = detail === 'low' ? 70 : 140;
  const haze = lin(c.haze);
  const layers = [
    { z: -260, x: 460, base: 26, amp: 46, seed: 5, col: lin(c.far), valley: 0.35, sharp: 1.3 },
    { z: -175, x: 340, base: 12, amp: 34, seed: 9, col: lin(c.mid), valley: 0.22, sharp: 1.7 },
    { z: -110, x: 240, base: 3, amp: 20, seed: 13, col: lin(c.near), valley: 0.12, sharp: 2.2 },
  ];
  const parts = layers.map((L) => {
    const vx = sunX(L.z);
    const ridge = (u: number) => {
      const x = (u - 0.5) * 2 * L.x;
      const r =
        noise3(x * 0.016 + L.seed, L.seed, 0) * 0.5 + noise3(x * 0.045, L.seed * 2, 1) * 0.28 + noise3(x * 0.12, 3, L.seed) * 0.14 + noise3(x * 0.33, 7, L.seed) * 0.08;
      // Ridged: sharpen the crests into peaks and saddles.
      const ridged = 1 - Math.abs(r * 2 - 1);
      const peak = Math.pow(0.55 * r + 0.45 * ridged, L.sharp) * 1.7;
      const valley = L.valley + (1 - L.valley) * smoothstep(L.x * 0.05, L.x * 0.28, Math.abs(x - vx));
      return L.base * valley + L.amp * peak * valley;
    };
    return grid(
      n,
      3,
      (u, v) => {
        const x = (u - 0.5) * 2 * L.x;
        const top = ridge(u);
        const y = v === 0 ? -6 : v < 0.5 ? top * 0.25 : v < 0.9 ? top * 0.7 : top;
        return [x, y, L.z];
      },
      (u, v) => {
        const top = ridge(u);
        const k = v === 0 ? 0 : v < 0.5 ? 0.25 : v < 0.9 ? 0.7 : 1;
        // Mist pools low down; ridges toward the sun catch a little more light.
        const lit = 1 + 0.06 * (1 - smoothstep(0, L.x * 0.4, Math.abs((u - 0.5) * 2 * L.x - vx)));
        const t = 0.25 + 0.75 * smoothstep(0, 1, k * Math.min(1, top / 20));
        return mixRgb(haze, L.col, t).map((v) => v * lit) as RGB;
      },
    );
  });
  return merge(parts);
}


export interface Village {
  buildings: BufferGeometry;
  /** Warm windows and street lights (world points). */
  lights: V3[];
}

/** A lakeside village on the right-hand shore: houses up a low hill, a bell tower, cypresses; lights on the left shore too. */
export function buildVillage(c: VistaColors, detail: Detail): Village {
  const rand = rng(77);
  const parts: BufferGeometry[] = [];
  const lights: V3[] = [];
  const haze = lin(c.haze);
  const fade = (col: RGB, z: number) => mixRgb(col, haze, smoothstep(-40, -130, z) * 0.75 + 0.15);
  // Unlit, so shade by facing: the sunset comes from the left, the fronts face the terrace.
  const colored = (g: BufferGeometry, col: RGB) => {
    const n = g.attributes.normal;
    const pos = g.attributes.position!;
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const nx = n ? n.getX(i) : 0;
      const ny = n ? n.getY(i) : 0;
      const k = (0.86 + 0.14 * smoothstep(0, 6, pos.getY(i))) * (1 - 0.22 * Math.max(0, nx) + 0.06 * Math.max(0, -nx) - 0.08 * Math.max(0, ny));
      out.set([col[0] * k, col[1] * k, col[2] * k], i * 3);
    }
    g.setAttribute('color', new BufferAttribute(out, 3));
    return g;
  };

  // The hill the village climbs, and the far left shore.
  const hill = (x0: number, x1: number, z: number, h: number, seed: number, col: RGB) =>
    grid(
      detail === 'low' ? 24 : 48,
      1,
      (u, v) => {
        const x = x0 + (x1 - x0) * u;
        const top = h * Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 0.7 * (0.75 + 0.25 * noise3(x * 0.08, seed, 0));
        return [x, v === 0 ? -2 : top, z];
      },
      (_u, v) => mixRgb(fade(col, z), haze, v === 0 ? 0.3 : 0),
    );
  parts.push(hill(3, 60, -62, 8, 3, lin(c.tree)));
  parts.push(hill(-90, -10, -70, 7, 8, lin(c.tree)));

  const wall = lin(c.wall);
  const roof = lin(c.roof);
  const tree = lin(c.tree);
  const ground = (x: number) => 8 * Math.sin(Math.PI * Math.min(1, ((x - 3) / 57) * 1.25)) ** 0.7 * 0.85;
  for (let i = 0; i < (detail === 'low' ? 22 : 40); i++) {
    const x = 9 + Math.pow(rand(), 1.3) * 26;
    const z = -54 - rand() * 6;
    const g = Math.max(0, ground(x) - 1.5 - rand() * 2.5);
    const w = 1.6 + rand() * 1.9;
    const h = 2.0 + rand() * 2.6;
    const d = 1.8 + rand() * 1.2;
    const body = new BoxGeometry(w, h, d);
    body.translate(x, g + h / 2, z);
    parts.push(colored(body, fade(wall.map((v) => v * (0.9 + rand() * 0.15)) as RGB, z)));
    const r = new ConeGeometry(Math.max(w, d) * 0.72, 1.1 + rand() * 0.6, 4);
    r.rotateY(Math.PI / 4);
    r.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
    r.translate(x, g + h + 0.5, z);
    parts.push(colored(r, fade(roof, z)));
    const rows = Math.max(1, Math.floor(h / 1.6));
    for (let k = 0; k < rows; k++) if (rand() < 0.55) lights.push([x + (rand() - 0.5) * w * 0.6, g + 1 + k * 1.4, z + d / 2 + 0.05]);
  }
  // The bell tower and a dome.
  {
    const x = 13;
    const z = -55;
    const g = ground(x) - 1;
    const t = new BoxGeometry(2.2, 13, 2.2);
    t.translate(x, g + 6.5, z);
    parts.push(colored(t, fade(wall, z)));
    const bel = new BoxGeometry(2.5, 0.4, 2.5);
    bel.translate(x, g + 13.2, z);
    parts.push(colored(bel, fade(wall, z)));
    const spire = new ConeGeometry(1.6, 3.2, 4);
    spire.rotateY(Math.PI / 4);
    spire.translate(x, g + 15, z);
    parts.push(colored(spire, fade(roof, z)));
    lights.push([x, g + 11.5, z + 1.15]);
    const dome = new SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(22, ground(22) + 4.5, -58);
    parts.push(colored(dome, fade(mixRgb(roof, wall, 0.4), -58)));
    const drum = new CylinderGeometry(2.4, 2.4, 3.5, 12);
    drum.translate(22, ground(22) + 2.75, -58);
    parts.push(colored(drum, fade(wall, -58)));
  }
  // Cypresses between the houses and along the shore.
  for (let i = 0; i < (detail === 'low' ? 10 : 18); i++) {
    const x = 10 + rand() * 32;
    const z = -55 - rand() * 7;
    const h = 3 + rand() * 3.5;
    const cy = new ConeGeometry(0.55 + rand() * 0.3, h, 7);
    cy.translate(x, Math.max(0, ground(x) - 2) + h / 2, z);
    parts.push(colored(cy, fade(tree.map((v) => v * (0.85 + rand() * 0.2)) as RGB, z)));
  }
  // A string of lights along the waterfront, and a few on the left shore.
  for (let x = 6; x < 38; x += 1.4 + rand()) lights.push([x, 0.7, -51.5 - rand() * 0.6]);
  for (let i = 0; i < 18; i++) lights.push([-80 + rand() * 62, 0.6 + rand() * 3, -66 + rand() * 2]);
  return { buildings: merge(parts), lights };
}
