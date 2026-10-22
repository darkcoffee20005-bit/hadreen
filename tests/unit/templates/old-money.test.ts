import { describe, expect, it } from 'vitest';
import { evaluateTrack } from '@/lib/invite/stage/rig';
import { flapGeometry, leafGeometry, petalGeometry } from '@/templates/old-money/geometry';
import { iconFor, normalizeTitle } from '@/templates/old-money/icons';
import {
  ambientShot,
  CARD,
  cardScale,
  cardSlideY,
  COVER_DISTANCE,
  coverSize,
  curlPoint,
  ENVELOPE,
  FLAP_DEPTH,
  flapHalfWidth,
  GATE_SHOT,
  hangingString,
  LIFT_SHOT,
  pearlRest,
  PEARLS_PER_EDGE,
  TRACK,
} from '@/templates/old-money/layout';
import { oldMoney } from '@/templates/old-money/meta';
import { FLY, INTRO, introState, pearlSwing } from '@/templates/old-money/timeline';

describe('old-money opening timeline', () => {
  it('starts closed and floating, ends with the card covering the screen', () => {
    const a = introState(0);
    expect(a.float).toBe(1);
    expect(a.flap).toBe(0);
    expect(a.slide).toBe(0);
    expect(a.fly).toBe(0);
    expect(a.away).toBe(0);
    expect(a.date).toBe(1);
    const z = introState(INTRO);
    expect(z.float).toBe(0);
    expect(z.flap).toBeCloseTo(1, 6);
    expect(z.slide).toBeCloseTo(1, 6);
    expect(z.fly).toBeCloseTo(1, 6);
    expect(z.away).toBeCloseTo(1, 6);
    expect(z.date).toBe(0);
    expect(z.border).toBeCloseTo(1, 6);
    expect(oldMoney.intro.duration).toBe(INTRO);
  });

  it('only moves forward (seeking anywhere lands on a consistent frame)', () => {
    let prev = introState(0);
    for (let t = 0.05; t <= INTRO; t += 0.05) {
      const s = introState(t);
      for (const k of ['flap', 'slide', 'fly', 'away', 'border'] as const) expect(s[k]).toBeGreaterThanOrEqual(prev[k] - 1e-9);
      expect(s.date).toBeLessThanOrEqual(prev.date + 1e-9);
      prev = s;
    }
  });

  it('opens before it pulls the card, and pulls before it flies', () => {
    expect(introState(1.2).flap).toBeGreaterThan(0.8);
    expect(introState(1.2).slide).toBe(0);
    expect(introState(FLY.start).slide).toBeGreaterThan(0.9);
    expect(introState(FLY.start).fly).toBe(0);
  });

  it('swings the pearls once the flap kicks them, then lets them settle', () => {
    expect(pearlSwing(0)).toBe(0);
    const peak = Math.max(...Array.from({ length: 60 }, (_, i) => Math.abs(pearlSwing(0.6 + i * 0.03))));
    expect(peak).toBeGreaterThan(0.3);
    expect(Math.abs(pearlSwing(6.5))).toBeLessThan(0.02);
  });
});

describe('old-money envelope', () => {
  it('curls the flap: closed lies flat, open stands above the hinge leaning back', () => {
    const closed = curlPoint(0, FLAP_DEPTH, 0);
    expect(closed.p[1]).toBeCloseTo(-FLAP_DEPTH, 6);
    expect(closed.p[2]).toBeCloseTo(0, 6);
    expect(closed.n).toEqual([0, 0, 1]);
    const open = curlPoint(0, FLAP_DEPTH, 1);
    expect(open.p[1]).toBeGreaterThan(FLAP_DEPTH * 0.8);
    expect(open.p[2]).toBeLessThan(0);
    // The hinge never moves.
    const hinge = curlPoint(0.4, 0, 0.5).p;
    expect(hinge[0]).toBe(0.4);
    expect(hinge[1]).toBeCloseTo(0, 12);
    expect(hinge[2]).toBeCloseTo(0, 12);
  });

  it('strings pearls along both edges from the corners to the tip', () => {
    const pearls = pearlRest();
    expect(pearls).toHaveLength(PEARLS_PER_EDGE * 2);
    for (const p of pearls) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(flapHalfWidth(p.d) + 1e-9);
      expect(p.d).toBeGreaterThan(0);
      expect(p.d).toBeLessThan(FLAP_DEPTH);
      expect(Math.sign(p.x)).toBe(p.side);
    }
  });

  it('builds a flap facing the camera, with texture coordinates inside the paper', () => {
    const g = flapGeometry(ENVELOPE.width);
    const pos = g.attributes.position!;
    const uv = g.attributes.uv!;
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-9);
      expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-9);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-9);
      expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-9);
    }
    // Counter-clockwise first triangle → normal towards +z (the camera).
    const idx = g.index!;
    const [a, b, c] = [idx.getX(0), idx.getX(1), idx.getX(2)];
    const ab = [pos.getX(b) - pos.getX(a), pos.getY(b) - pos.getY(a)];
    const ac = [pos.getX(c) - pos.getX(a), pos.getY(c) - pos.getY(a)];
    expect(ab[0]! * ac[1]! - ab[1]! * ac[0]!).toBeGreaterThan(0);
  });

  it('builds petals and leaves whose faces point at the viewer', () => {
    for (const g of [petalGeometry(), leafGeometry()]) {
      g.computeVertexNormals();
      const n = g.attributes.normal!;
      let z = 0;
      for (let i = 0; i < n.count; i++) z += n.getZ(i);
      expect(z / n.count).toBeGreaterThan(0.3);
    }
  });
});

describe('old-money card and camera', () => {
  it('slides the card up out of the pocket', () => {
    expect(cardSlideY(0)).toBe(CARD.restY);
    expect(cardSlideY(1) - CARD.height / 2).toBeGreaterThan(ENVELOPE.height / 2 - 0.2);
  });

  it('grows the card to exactly cover the view, turning upright on portrait screens', () => {
    const cover = coverSize(35, 390 / 844);
    const h = 2 * COVER_DISTANCE * Math.tan((35 * Math.PI) / 360);
    expect(cover[1]).toBeGreaterThan(h);
    expect(cover[0] / cover[1]).toBeCloseTo(390 / 844, 6);
    expect(cardScale(0, cover, true)).toEqual([CARD.width, CARD.height]);
    const [x, y] = cardScale(1, cover, true);
    expect(x).toBeCloseTo(cover[1], 9); // the card's long side runs up the phone
    expect(y).toBeCloseTo(cover[0], 9);
    const [dx, dy] = cardScale(1, coverSize(35, 16 / 9), false);
    expect(dx / dy).toBeCloseTo(16 / 9, 6);
  });

  it('frames the gate and follows the card up', () => {
    expect(evaluateTrack(TRACK, 0)).toEqual(GATE_SHOT);
    expect(evaluateTrack(TRACK, INTRO)).toEqual(LIFT_SHOT);
    expect(ambientShot(0, 0).target).toEqual(LIFT_SHOT.target);
  });

  it('drapes a pearl string between two points, sagging in the middle', () => {
    const pts = hangingString([0, 0], [1, 0], 0.1, 11);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[10]![0]).toBeCloseTo(1, 9);
    expect(pts[5]![1]).toBeCloseTo(-0.1, 9);
  });
});

describe('old-money programme icons', () => {
  it('reads the moment from its title, in Arabic or English', () => {
    expect(iconFor('استقبال الضيوف')).toBe('welcome');
    expect(iconFor('عقد القران')).toBe('rings');
    expect(iconFor('الزفّة')).toBe('music');
    expect(iconFor('العشاء')).toBe('dinner');
    expect(iconFor('قطع الكيك')).toBe('cake');
    expect(iconFor('Cocktail hour')).toBe('toast');
    expect(iconFor('Ceremony')).toBe('rings');
    expect(iconFor('لحظة خاصة')).toBe('heart');
    expect(normalizeTitle('الزفّـة')).toBe('الزفة');
  });
});
