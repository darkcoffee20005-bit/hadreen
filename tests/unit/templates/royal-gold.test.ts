import { describe, expect, it } from 'vitest';
import { evaluateTrack } from '@/lib/invite/stage/rig';
import { ambientShot, END_SHOT, TRACK } from '@/templates/royal-gold/camera';
import {
  archOffset,
  coupleZ,
  domeProfile,
  flapOutline,
  insetPolygon,
  lanternProfiles,
  minaretProfile,
  pendulumAngle,
  pointedArch,
  signedArea,
  wallOutline,
} from '@/templates/royal-gold/geometry';
import { iconFor } from '@/templates/royal-gold/icons';
import { CUT, FLAP_STAGGER, flapProgress, INTRO, introState } from '@/templates/royal-gold/timeline';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('royal-gold geometry', () => {
  it('draws a symmetric two-centred pointed arch with an exact apex', () => {
    const pts = pointedArch(4.4, 3.75, 6.55, 24);
    expect(pts[0]).toEqual([-2.2, 0]);
    expect(pts[pts.length - 1]).toEqual([2.2, 0]);
    const apex = pts.reduce((m, p) => (p[1] > m[1] ? p : m));
    expect(apex[0]).toBeCloseTo(0, 9);
    expect(apex[1]).toBeCloseTo(6.55, 9);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]!;
      const [mx, my] = pts[pts.length - 1 - i]!;
      expect(close(x, -mx) && close(y, my)).toBe(true);
    }
    // Rises monotonically up the left side.
    const half = pts.slice(0, Math.ceil(pts.length / 2));
    half.slice(1).forEach((p, i) => expect(p[1]).toBeGreaterThanOrEqual(half[i]![1]));
  });

  it('pushes the extrados outward and higher', () => {
    const out = archOffset(4.4, 3.75, 6.55, 0.43);
    expect(out[0]![0]).toBeCloseTo(-2.63, 6);
    expect(Math.max(...out.map((p) => p[1]))).toBeGreaterThan(6.55);
  });

  it('insets polygons of either winding', () => {
    const square: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    for (const poly of [square, [...square].reverse()]) {
      const inner = insetPolygon(poly, 0.25);
      expect(Math.abs(signedArea(inner))).toBeCloseTo(1.5 * 1.5, 6);
    }
  });

  it('shapes a flap from its hinge to a single point', () => {
    const f = flapOutline(2.4, 1.344);
    expect(f[0]).toEqual([-1.2, 0]);
    expect(f[1]).toEqual([1.2, 0]);
    expect(f.some(([x, y]) => x === 0 && close(y, -1.344))).toBe(true);
    const inner = insetPolygon(f, 0.03);
    expect(Math.abs(signedArea(inner))).toBeLessThan(Math.abs(signedArea(f)));
  });

  it('outlines the wall around the arch with merlons on top', () => {
    const pts = wallOutline({ width: 21, height: 11, archWidth: 4.4, spring: 3.75, apex: 6.55, merlon: 1.05 });
    expect(Math.max(...pts.map((p) => p[1]))).toBeGreaterThan(11);
    expect(pts.some(([x, y]) => x === 0 && close(y, 6.55))).toBe(true);
    expect(Math.abs(signedArea(pts))).toBeGreaterThan(21 * 11 - 4.4 * 6.55);
  });

  it('builds lathe profiles that climb and join up', () => {
    const { base, body, cap } = lanternProfiles(1.3);
    for (const prof of [base, body, cap, domeProfile(3, 4.7), minaretProfile(12.5, 0.36)])
      prof.slice(1).forEach((p, i) => expect(p[1]).toBeGreaterThanOrEqual(prof[i]![1]));
    expect(base[base.length - 1]).toEqual(body[0]);
    expect(body[body.length - 1]).toEqual(cap[0]);
  });

  it('swings lanterns as damped pendulums that keep a gentle sway', () => {
    const s = { amp: 0.2, period: 2.9, decay: 3.2, sway: 0.035, phase: 0.5 };
    expect(pendulumAngle(0, s)).toBe(0);
    expect(pendulumAngle(-1, s)).toBe(0);
    const peak = (t0: number) => Math.max(...Array.from({ length: 300 }, (_, i) => Math.abs(pendulumAngle(t0 + i * 0.01, s))));
    expect(peak(0)).toBeGreaterThan(peak(10));
    expect(peak(60)).toBeGreaterThan(0.02);
    expect(peak(60)).toBeLessThan(0.05);
  });

  it('walks the couple away from the arch toward the mosque', () => {
    expect(coupleZ(0)).toBeLessThan(0);
    expect(coupleZ(1)).toBeLessThan(coupleZ(0));
  });
});

describe('royal-gold opening', () => {
  it('starts at rest and ends settled', () => {
    const a = introState(0);
    expect(a.seal).toBe(0);
    expect(a.flaps).toEqual([0, 0, 0, 0]);
    expect(a.flash).toBe(0);
    expect(a.gate).toBe(true);
    expect(a.names).toBe(0);
    const z = introState(INTRO);
    expect(z.seal).toBe(1);
    expect(z.flaps).toEqual([1, 1, 1, 1]);
    expect(z.flash).toBe(0);
    expect(z.gate).toBe(false);
    expect(z.names).toBe(1);
    expect(z.walk).toBeCloseTo(1, 6);
  });

  it('unfolds the four flaps 0.15 s apart', () => {
    for (let i = 1; i < 4; i++) {
      for (const t of [0.5, 0.7, 0.9, 1.1]) expect(flapProgress(t + FLAP_STAGGER * i, i)).toBeCloseTo(flapProgress(t, 0), 9);
    }
    expect(introState(1.6).flaps.every((f) => f === 1)).toBe(true);
  });

  it('hides the cut between worlds inside the white-gold flash', () => {
    expect(introState(CUT - 0.03).flash).toBeGreaterThan(0.97);
    expect(introState(CUT + 0.03).flash).toBeGreaterThan(0.97);
    expect(introState(4).flash).toBeLessThan(0.05);
  });

  it('keeps the walk monotonic', () => {
    let last = -1;
    for (let t = 0; t <= INTRO; t += 0.05) {
      const w = introState(t).walk;
      expect(w).toBeGreaterThanOrEqual(last - 1e-12);
      last = w;
    }
  });
});

describe('royal-gold camera', () => {
  it('runs the track in order and ends on the end shot', () => {
    TRACK.slice(1).forEach((k, i) => expect(k.at).toBeGreaterThan(TRACK[i]!.at));
    expect(TRACK[TRACK.length - 1]!.at).toBe(INTRO);
    expect(evaluateTrack(TRACK, Infinity)).toEqual(END_SHOT);
  });

  it('hands off without a jump and pushes toward the mosque on scroll', () => {
    const a = ambientShot(0, 0, true);
    expect(a.position).toEqual(END_SHOT.position);
    expect(a.target).toEqual(END_SHOT.target);
    expect(a.fov).toBe(END_SHOT.fov);
    const b = ambientShot(1, 0, true);
    expect(b.position[2]).toBeLessThan(a.position[2]);
    expect(ambientShot(0.5, 123, true)).toEqual(ambientShot(0.5, 456, true));
  });
});

describe('royal-gold programme wire icons', () => {
  it('matches programme titles to icons in Arabic and English', () => {
    expect(iconFor('الزفّة')).toBe('zaffa');
    expect(iconFor('العشاء')).toBe('dinner');
    expect(iconFor('قطع الكيك')).toBe('cake');
    expect(iconFor('عقد القران')).toBe('rings');
    expect(iconFor('استقبال الضيوف')).toBe('welcome');
    expect(iconFor('Dinner')).toBe('dinner');
    expect(iconFor('فقرة فنية')).toBeNull();
  });
});
