import { BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { evaluateTrack } from '@/lib/invite/stage/rig';
import { balusterXs, ridgePath, villaScatter } from '@/templates/dolce-vita/art2d';
import { ambientShot, END_SHOT, GATE_SHOT, TRACK } from '@/templates/dolce-vita/camera';
import { flapOutline, pocketOutline, polygonGeometry, roseGeometry, worldBoxUV } from '@/templates/dolce-vita/geometry';
import { boatX, INTRO, introState, letterRise } from '@/templates/dolce-vita/timeline';
import {
  clouds,
  fbm1,
  LAKE_Y,
  layerFront,
  MOUNTAINS,
  mountainHeight,
  ridgeHeight,
  roseCluster,
  slopeY,
  SLOPE,
  villas,
  wrapX,
} from '@/templates/dolce-vita/world';

describe('dolce-vita opening timeline', () => {
  it('starts closed and ends with the flap open, the letter peeking and the names up', () => {
    const a = introState(0);
    expect(a.flap).toBe(0);
    expect(a.peek).toBe(0);
    expect(a.names).toBe(0);
    expect(a.boat).toBe(0);
    const z = introState(INTRO);
    expect(z.flap).toBeCloseTo(1, 6);
    expect(z.peek).toBeCloseTo(1, 6);
    expect(z.names).toBeCloseTo(1, 6);
    expect(z.boat).toBeCloseTo(1, 6);
  });

  it('is monotonic where it should be (seeking anywhere lands on a consistent frame)', () => {
    let prev = introState(0);
    for (let t = 0.05; t <= INTRO; t += 0.05) {
      const s = introState(t);
      expect(s.boat).toBeGreaterThanOrEqual(prev.boat - 1e-9);
      expect(s.flap).toBeGreaterThanOrEqual(prev.flap - 1e-9);
      expect(s.names).toBeGreaterThanOrEqual(prev.names - 1e-9);
      expect(s.glitter).toBeGreaterThan(0);
      prev = s;
    }
  });

  it('keeps the boat inside its wrap lane and drifting left', () => {
    for (let d = 0; d < 4000; d += 37) {
      const x = boatX(1, d);
      expect(x).toBeGreaterThanOrEqual(-150);
      expect(x).toBeLessThan(60);
    }
    expect(boatX(1, 10)).toBeLessThan(boatX(1, 0));
  });

  it('raises the letter from tucked-in to nearly out with the scroll', () => {
    expect(letterRise(0, 0)).toBe(0);
    expect(letterRise(1, 0)).toBeCloseTo(0.16, 6);
    expect(letterRise(1, 1)).toBeCloseTo(1, 6);
    expect(letterRise(1, 0.3)).toBeGreaterThan(letterRise(1, 0.1));
  });
});

describe('dolce-vita camera', () => {
  it('opens on the gate shot and lands on the end shot', () => {
    expect(evaluateTrack(TRACK, 0)).toEqual(GATE_SHOT);
    expect(evaluateTrack(TRACK, INTRO)).toEqual(END_SHOT);
    for (let i = 1; i < TRACK.length; i++) expect(TRACK[i]!.at).toBeGreaterThan(TRACK[i - 1]!.at);
    expect(TRACK[TRACK.length - 1]!.at).toBe(INTRO);
  });

  it('keeps the ambient shot still in capture mode and moves it with the scroll', () => {
    expect(ambientShot(0.3, 1, true)).toEqual(ambientShot(0.3, 99, true));
    const a = ambientShot(0, 0, true);
    const b = ambientShot(1, 0, true);
    expect(b.target[1]).toBeLessThan(a.target[1]); // tilts down to the letter
    for (const v of [...a.position, ...b.position, ...a.target, ...b.target]) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('dolce-vita world', () => {
  it('makes deterministic noise in 0..1', () => {
    for (let x = -50; x < 50; x += 0.7) {
      const v = fbm1(x, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(fbm1(x, 3)).toBe(v);
    }
  });

  it('builds mountains that meet the lake at the shore and rise behind it', () => {
    for (const l of MOUNTAINS) {
      for (let x = -l.halfWidth; x <= l.halfWidth; x += 37) {
        expect(mountainHeight(l, x, 0)).toBeCloseTo(0, 9);
        expect(mountainHeight(l, x, l.depth)).toBeGreaterThan(l.base * 0.7);
        expect(ridgeHeight(l, x)).toBeGreaterThanOrEqual(l.base);
      }
      // The shore bends toward us at the sides.
      expect(layerFront(l, 300)).toBeGreaterThan(layerFront(l, 0));
    }
    // Layers are ordered near to far.
    expect(MOUNTAINS[0]!.z0).toBeGreaterThan(MOUNTAINS[1]!.z0);
    expect(MOUNTAINS[1]!.z0).toBeGreaterThan(MOUNTAINS[2]!.z0);
  });

  it('runs the slope from under the balcony down into the lake', () => {
    expect(slopeY(0, SLOPE.zTop)).toBeCloseTo(SLOPE.top, 6);
    expect(slopeY(0, SLOPE.zLake)).toBeLessThan(LAKE_Y);
  });

  it('places villas above the water, facing the lake', () => {
    const list = villas();
    expect(list.length).toBeGreaterThan(40);
    for (const v of list) {
      expect(v.position[1]).toBeGreaterThan(LAKE_Y - 3);
      expect(v.size.every((s) => s > 0)).toBe(true);
      expect(Math.abs(v.rotation)).toBeLessThan(Math.PI);
    }
    expect(villas()).toEqual(list);
  });

  it('grows rose clusters around their centre, deterministically', () => {
    const a = roseCluster([0, 1, 0], 0.2, 8, 5);
    expect(a.roses).toHaveLength(8);
    expect(a.leaves.length).toBeGreaterThan(8);
    for (const r of a.roses) expect(Math.hypot(r.position[0], r.position[2])).toBeLessThanOrEqual(0.21);
    expect(roseCluster([0, 1, 0], 0.2, 8, 5)).toEqual(a);
  });

  it('sorts clouds far-first and wraps drift', () => {
    const c = clouds(12);
    for (let i = 1; i < c.length; i++) expect(c[i]!.position[2]).toBeGreaterThanOrEqual(c[i - 1]!.position[2]);
    expect(wrapX(705, 700)).toBeCloseTo(-695, 9);
    expect(wrapX(-705, 700)).toBeCloseTo(695, 9);
  });
});

describe('dolce-vita geometry', () => {
  it('builds a fuller rose with more petal layers', () => {
    const lo = roseGeometry(2);
    const hi = roseGeometry(4);
    expect(hi.getAttribute('position').count).toBeGreaterThan(lo.getAttribute('position').count);
    expect(hi.getAttribute('color').count).toBe(hi.getAttribute('position').count);
  });

  it('outlines the envelope flap and pocket inside the envelope', () => {
    const [w, h] = [0.36, 0.25];
    const flap = flapOutline(w, h);
    expect(Math.min(...flap.map((p) => p[1]))).toBeCloseTo(-h * 0.58, 9);
    for (const [x, y] of pocketOutline(w, h)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(w / 2 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(h / 2 + 1e-9);
    }
    const g = polygonGeometry(flap);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
    }
  });

  it('scales box UVs to world units', () => {
    const g = worldBoxUV(new BoxGeometry(4, 1, 2), 4, 1, 2, 0.5);
    const uv = g.getAttribute('uv');
    let max = 0;
    for (let i = 0; i < uv.count; i++) max = Math.max(max, uv.getX(i));
    expect(max).toBeCloseTo(8, 6);
  });
});

describe('dolce-vita 2D art', () => {
  it('draws closed ridge paths and stays deterministic', () => {
    const d = ridgePath(1000, 640, 520, 150, 0.006, 23);
    expect(d.startsWith('M0 640')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(villaScatter(0, 100, 50, 5, 10, 3)).toEqual(villaScatter(0, 100, 50, 5, 10, 3));
  });

  it('spaces balusters evenly inside the width', () => {
    const xs = balusterXs(1000, 42);
    expect(xs.length).toBe(23);
    expect(xs[0]!).toBeGreaterThan(0);
    expect(xs[xs.length - 1]!).toBeLessThan(1000);
  });
});
