import { describe, expect, it } from 'vitest';
import { evaluateTrack, framedPosition } from '@/lib/invite/stage/rig';
import { buildRose, buildSwan, grid, HEAD } from '@/templates/sacred-garden/geometry';
import {
  ambientShot,
  ARCH,
  archApex,
  archArc,
  archCentreline,
  archOutline,
  buildTrack,
  envelopeSize,
  hedgeProfile,
  hedgeRoseLayout,
  polygonArea,
  roseLayout,
  S3,
  samplePolyline,
  SEAL_SEEDS,
  shardMotion,
  shardOf,
  SWAN_SCALE,
  swanPlacement,
  SWANS,
  type V2,
} from '@/templates/sacred-garden/layout';

const PHONE = 390 / 844;
const DESKTOP = 1440 / 900;

describe('pointed arch', () => {
  it('springs from the pillars and meets at the apex', () => {
    const left = archArc(ARCH.a, -1, 20);
    expect(left[0]![0]).toBeCloseTo(-ARCH.a, 6);
    expect(left[0]![1]).toBeCloseTo(ARCH.spring, 6);
    expect(left[20]![0]).toBeCloseTo(0, 6);
    expect(left[20]![1]).toBeCloseTo(archApex(ARCH.a), 6);
    const right = archArc(ARCH.a, 1, 20);
    right.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(-left[i]![0], 6);
      expect(y).toBeCloseTo(left[i]![1], 6);
    });
  });

  it('outline area is the outer arch minus the opening', () => {
    const { a, t } = ARCH;
    const region = (hw: number): V2[] => [[-hw, 0], ...archArc(hw, -1, 24), ...archArc(hw, 1, 24).reverse().slice(1), [hw, 0]];
    const expected = polygonArea(region(a + t)) - polygonArea(region(a));
    expect(polygonArea(archOutline(24))).toBeCloseTo(expected, 6);
  });

  it('samples the centreline by length with outward normals', () => {
    const line = archCentreline(40);
    expect(samplePolyline(line, 0).p).toEqual(line[0]);
    expect(samplePolyline(line, 1).p[0]).toBeCloseTo(line[line.length - 1]![0], 6);
    const top = samplePolyline(line, 0.5);
    expect(top.p[0]).toBeCloseTo(0, 2);
    expect(top.n[1]).toBeGreaterThan(0.95);
    expect(samplePolyline(line, 0.1).n[0]).toBeLessThan(-0.95);
    for (let s = 0; s <= 1; s += 0.05) expect(Math.hypot(...samplePolyline(line, s).n)).toBeCloseTo(1, 6);
  });
});

describe('roses', () => {
  it('are seeded, above the water, and none hang into the opening at the crown', () => {
    const a = roseLayout(120);
    expect(a).toEqual(roseLayout(120));
    expect(a).toHaveLength(120);
    const innerApex = archApex(ARCH.a);
    for (const r of a) {
      expect(r.position[1]).toBeGreaterThan(0.4);
      expect(Math.hypot(...r.facing)).toBeCloseTo(1, 6);
      const [x, y] = r.position;
      if (y > ARCH.spring + 0.9) {
        // Inside the opening means below the inner arc at this x.
        const rr = ARCH.a + ARCH.e;
        const dx = Math.abs(x) + ARCH.e; // each side's arc is centred on the far side of the axis
        const arcY = ARCH.spring + Math.sqrt(Math.max(0, rr * rr - dx * dx));
        expect(y).toBeGreaterThan(Math.min(arcY, innerApex) - 0.05);
      }
    }
  });

  it('climb the hedge thinly behind the opening', () => {
    const spots = hedgeRoseLayout(150);
    const behind = spots.filter((r) => Math.abs(r.position[0]) < 1.7 && r.position[1] > 0.9 && r.position[1] < hedgeProfile(0) - 0.5);
    expect(behind.length).toBeLessThan(spots.length * 0.08);
  });

  it('the hedge is tallest behind the arch', () => {
    expect(hedgeProfile(0)).toBeGreaterThan(hedgeProfile(4));
    expect(hedgeProfile(4)).toBeGreaterThan(hedgeProfile(8));
    expect(hedgeProfile(0)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('swans', () => {
  it('glide from the pool sides to the heart, facing each other', () => {
    for (const side of [-1, 1] as const) {
      const start = swanPlacement(side, 0);
      const end = swanPlacement(side, 1);
      expect(start.x).toBeCloseTo(side * SWANS.startX, 6);
      expect(Math.abs(start.x)).toBeLessThan(3.0 - 0.4); // inside the pool
      expect(end.x).toBeCloseTo(side * SWANS.meetX, 6);
      expect(end.z).toBeCloseTo(SWANS.z, 6);
      expect(Math.cos(end.heading)).toBeCloseTo(-side, 6);
      expect(start.wake).toBe(0);
    }
  });

  it('their beaks meet on the axis', () => {
    const tip = (HEAD.centre[0] + HEAD.dir[0] * 0.1) * SWAN_SCALE;
    expect(Math.abs(tip - SWANS.meetX)).toBeLessThan(0.01);
  });

  it('stay within the triangle budget per tier', () => {
    const tris = (d: 'low' | 'medium' | 'high') => buildSwan(d).index!.count / 3;
    expect(tris('high')).toBeLessThanOrEqual(6500);
    expect(tris('low')).toBeLessThanOrEqual(1600);
    expect(tris('medium')).toBeLessThan(tris('high'));
    expect(buildRose('low').index!.count / 3).toBeLessThan(buildRose('high').index!.count / 3);
  });

  it('parametric patches face +z', () => {
    const g = grid(2, 2, (u, v) => [u, v, 0]);
    expect(g.attributes.normal!.getZ(0)).toBeCloseTo(1, 6);
  });
});

describe('wax seal shards', () => {
  it('partition the seal into four real pieces', () => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (let y = -1; y <= 1; y += 0.05) {
      for (let x = -1; x <= 1; x += 0.05) {
        if (x * x + y * y > 0.85) continue;
        counts[shardOf([x, y])]! += 1;
        total++;
      }
    }
    expect(SEAL_SEEDS).toHaveLength(4);
    counts.forEach((c) => expect(c / total).toBeGreaterThan(0.12));
  });

  it('rest whole, then fall away and fade', () => {
    for (let i = 0; i < 4; i++) {
      const rest = shardMotion(i, 0);
      rest.offset.forEach((v) => expect(v).toBeCloseTo(0, 9));
      expect(rest.opacity).toBe(1);
      const gone = shardMotion(i, 1);
      expect(gone.opacity).toBe(0);
      expect(gone.offset[1]).toBeLessThan(-5);
    }
  });
});

describe('camera', () => {
  it('portrait envelope on phones, landscape on desktop', () => {
    const p = envelopeSize(PHONE);
    const d = envelopeSize(DESKTOP);
    expect(p.h).toBeGreaterThan(p.w);
    expect(d.w).toBeGreaterThan(d.h);
  });

  it('the track runs 8 s, ends on S3 and never dips under the water', () => {
    for (const aspect of [PHONE, DESKTOP]) {
      const track = buildTrack(envelopeSize(aspect));
      expect(track[0]!.at).toBe(0);
      expect(track[track.length - 1]!.at).toBe(8);
      expect(track[track.length - 1]!.shot).toBe(S3);
      track.slice(1).forEach((k, i) => expect(k.at).toBeGreaterThan(track[i]!.at));
      for (let t = 0; t <= 8; t += 0.1) {
        const pos = framedPosition(evaluateTrack(track, t), aspect);
        expect(pos[1]).toBeGreaterThan(0.15);
      }
    }
  });

  it('the ambient shot starts at S3 and cranes up with the scroll', () => {
    expect(ambientShot(0, 0)).toEqual({ ...S3, position: [0, S3.position[1], S3.position[2]] });
    expect(ambientShot(1, 0).target[1]).toBeGreaterThan(S3.target[1] + 6);
    expect(ambientShot(0.5, 0).position[1]).toBeGreaterThan(S3.position[1]);
  });
});
