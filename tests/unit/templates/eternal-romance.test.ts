import { describe, expect, it } from 'vitest';
import { evaluateTrack, length, sub } from '@/lib/invite/stage/rig';
import { ambientShot, CARD, END_SHOT, GATE_SHOT, TABLE, TRACK } from '@/templates/eternal-romance/camera';
import {
  buildRibbons,
  CANDLES,
  clothProfile,
  CURTAIN,
  curtainPoint,
  facadeLights,
  facadeStrokes,
  flicker,
  folds,
  hemHeight,
  petalShape,
  pointedHalfArch,
  roseCluster,
  roseHead,
  strokeProgress,
  swagShape,
} from '@/templates/eternal-romance/geometry';
import { INTRO, introState, LIFT_END, liftAt, swagAt } from '@/templates/eternal-romance/timeline';

const allFinite = (a: ArrayLike<number>) => Array.from(a).every(Number.isFinite);

describe('eternal-romance timeline', () => {
  it('starts closed and dark, and ends with everything settled', () => {
    const a = introState(0);
    expect(a.lift).toBe(0);
    expect(a.swag).toBe(0);
    expect(a.draw).toBe(0);
    expect(a.names).toBe(0);
    expect(a.spot).toBe(0);
    expect(a.petals).toBeLessThan(0);
    const z = introState(INTRO);
    expect(z.lift).toBe(1);
    expect(z.swag).toBe(1);
    expect(z.spot).toBe(1);
    expect(z.draw).toBe(1);
    expect(z.sketch).toBe(1);
    expect(z.names).toBe(1);
    expect(z.date).toBe(1);
    expect(z.hemSwing).toBeLessThan(0.01);
  });

  it('lifts the curtain monotonically within the first beat', () => {
    let prev = -1;
    for (let t = 0; t <= INTRO; t += 0.05) {
      const l = liftAt(t);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
    expect(liftAt(LIFT_END)).toBe(1);
  });

  it('never gathers swags before the hem leaves the floor (the fabric cannot stretch)', () => {
    expect(swagAt(0)).toBe(0);
    for (let lift = 0; lift <= 1; lift += 0.01) {
      const swag = swagAt(lift);
      for (let x = -CURTAIN.width / 2; x <= CURTAIN.width / 2; x += 0.37) {
        expect(hemHeight(x, lift, swag)).toBeGreaterThanOrEqual(CURTAIN.top - CURTAIN.length - 1e-9);
      }
    }
  });
});

describe('eternal-romance camera', () => {
  it('opens on the curtain and ends on the façade shot, in time order', () => {
    expect(TRACK[0]!.shot).toBe(GATE_SHOT);
    expect(TRACK[TRACK.length - 1]!.at).toBe(INTRO);
    expect(evaluateTrack(TRACK, INTRO)).toEqual(END_SHOT);
    for (let i = 1; i < TRACK.length; i++) expect(TRACK[i]!.at).toBeGreaterThan(TRACK[i - 1]!.at);
  });

  it('dollies close to the name card in S2', () => {
    const s = evaluateTrack(TRACK, 5.2);
    expect(length(sub(s.position, CARD))).toBeLessThan(1.4);
    expect(s.fov).toBeCloseTo(27, 5);
  });

  it('hands off without a jump and drifts down to the table as the guest scrolls', () => {
    expect(ambientShot(0, 12, true)).toEqual({ ...END_SHOT, fit: END_SHOT.fit });
    const near = ambientShot(1, 12, true);
    expect(length(sub(near.position, TABLE))).toBeLessThan(4);
    expect(near.position[1]).toBeGreaterThan(0.9);
  });
});

describe('eternal-romance curtain', () => {
  it('hangs to its resting hem and keeps the rod fixed while lifting', () => {
    const hem0 = CURTAIN.top - CURTAIN.length;
    expect(curtainPoint(0.3, 0, 0, 0)[1]).toBeCloseTo(hem0, 9);
    for (const lift of [0, 0.4, 1]) {
      expect(curtainPoint(1.1, CURTAIN.length, lift, swagAt(lift))[1]).toBeCloseTo(CURTAIN.top, 9);
    }
  });

  it('gathers into swags: highest at the cords, lowest mid-swag', () => {
    expect(swagShape(0, CURTAIN.spacing)).toBeCloseTo(0, 9);
    expect(swagShape(CURTAIN.spacing / 2, CURTAIN.spacing)).toBeCloseTo(1, 9);
    expect(curtainPoint(0, 0, 1, 1)[1]).toBeCloseTo(CURTAIN.raised, 9);
    expect(curtainPoint(CURTAIN.spacing / 2, 0, 1, 1)[1]).toBeCloseTo(CURTAIN.raised - CURTAIN.sag, 9);
  });

  it('never stretches the fabric vertically', () => {
    for (const lift of [0, 0.3, 0.7, 1]) {
      const swag = swagAt(lift);
      for (let s = 0; s < CURTAIN.length; s += 0.25) {
        const a = curtainPoint(0.8, s, lift, swag);
        const b = curtainPoint(0.8, s + 0.25, lift, swag);
        expect(b[1] - a[1]).toBeLessThanOrEqual(0.25 + 1e-9);
        expect(b[1]).toBeGreaterThanOrEqual(a[1] - 1e-9);
      }
    }
  });

  it('keeps the pleats bounded and hangs the fringe straight below the hem', () => {
    for (let x = -10; x <= 10; x += 0.01) expect(Math.abs(folds(x))).toBeLessThanOrEqual(1);
    const hem = curtainPoint(2, 0, 0.5, swagAt(0.5));
    const tip = curtainPoint(2, -CURTAIN.fringe, 0.5, swagAt(0.5));
    expect(hem[1] - tip[1]).toBeCloseTo(CURTAIN.fringe, 9);
  });
});

describe('eternal-romance façade drawing', () => {
  const strokes = facadeStrokes();

  it('draws every stroke inside the opening window, within the façade', () => {
    expect(strokes.length).toBeGreaterThan(60);
    for (const s of strokes) {
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.end).toBeLessThanOrEqual(1);
      expect(s.end).toBeGreaterThan(s.start);
      expect(s.pts.length).toBeGreaterThanOrEqual(2);
      for (const [x, y] of s.pts) {
        expect(Math.abs(x)).toBeLessThanOrEqual(7.5);
        expect(y).toBeGreaterThanOrEqual(-1e-9);
        expect(y).toBeLessThanOrEqual(11.05);
      }
    }
  });

  it('is symmetric about the centre line', () => {
    const key = (x: number, y: number) => `${(Math.abs(x) < 5e-4 ? 0 : x).toFixed(3)},${y.toFixed(3)}`;
    const pts = new Set(strokes.flatMap((s) => s.pts.map(([x, y]) => key(x, y))));
    for (const s of strokes) for (const [x, y] of s.pts) expect(pts.has(key(-x, y))).toBe(true);
  });

  it('builds the pointed arch from the springer to an exact apex', () => {
    const arch = pointedHalfArch(1.72, 4.3, 6.05);
    expect(arch[0]).toEqual([-1.72, 4.3]);
    expect(arch[arch.length - 1]).toEqual([0, 6.05]);
    for (let i = 1; i < arch.length; i++) expect(arch[i]![1]).toBeGreaterThan(arch[i - 1]![1]);
  });

  it('turns strokes into ribbons with arc-length progress and a glow layer', () => {
    const r = buildRibbons(strokes, 6);
    const points = strokes.reduce((n, s) => n + s.pts.length, 0);
    expect(r.side.length).toBe(points * 4);
    expect(allFinite(r.position)).toBe(true);
    expect(Math.max(...Array.from(r.index))).toBeLessThan(points * 4);
    expect(Array.from(r.glow).filter((g) => g === 1).length).toBe(points * 2);
    // Along each stroke, u runs 0 → 1.
    expect(r.u[0]).toBe(0);
    const n0 = strokes[0]!.pts.length;
    expect(r.u[n0 * 2 - 1]).toBeCloseTo(1, 9);
  });

  it('lights the garlands only once the pen has passed', () => {
    const lights = facadeLights();
    expect(lights.length).toBeGreaterThan(20);
    for (const l of lights) expect(l.t).toBeGreaterThan(0.5);
    expect(strokeProgress({ start: 0.2, end: 0.4 }, 0.1)).toBe(0);
    expect(strokeProgress({ start: 0.2, end: 0.4 }, 0.3)).toBeCloseTo(0.5, 9);
    expect(strokeProgress({ start: 0.2, end: 0.4 }, 0.9)).toBe(1);
  });
});

describe('eternal-romance table', () => {
  it('builds finite rose heads and petals of the expected size', () => {
    const rose = roseHead(16, 6, 5);
    expect(rose.position.length).toBe(16 * 7 * 6 * 3);
    expect(rose.index.length).toBe(16 * 6 * 5 * 6);
    expect(allFinite(rose.position)).toBe(true);
    for (let i = 0; i < rose.position.length; i += 3) {
      expect(Math.hypot(rose.position[i]!, rose.position[i + 2]!)).toBeLessThan(1.4);
      expect(rose.position[i + 1]!).toBeGreaterThan(-0.2);
    }
    const petal = petalShape(4, 5);
    expect(petal.position.length).toBe(5 * 6 * 3);
    expect(allFinite(petal.position)).toBe(true);
    expect(roseCluster(16)).toHaveLength(16);
    expect(roseCluster(7)).toHaveLength(7);
  });

  it('drapes the cloth from the centre of the top to the floor, flaring out', () => {
    const prof = clothProfile();
    expect(prof[0]).toEqual([0, 0.762]);
    expect(prof[prof.length - 1]![1]).toBeCloseTo(0, 9);
    for (let i = 7; i < prof.length; i++) expect(prof[i]![0]).toBeGreaterThanOrEqual(prof[i - 1]![0]);
  });

  it('flickers candles gently, never dark', () => {
    for (let t = 0; t < 30; t += 0.07) {
      const f = flicker(t, 0.4);
      expect(f).toBeGreaterThanOrEqual(0.76);
      expect(f).toBeLessThanOrEqual(1);
    }
    expect(CANDLES.every((c) => c.h > 0 && c.r > 0 && Math.hypot(c.x, c.z) < 0.75)).toBe(true);
  });
});
