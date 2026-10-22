import { describe, expect, it } from 'vitest';
import { evaluateTrack, fitDistance } from '@/lib/invite/stage/rig';
import { PUBLIC_TEMPLATES, TEMPLATES } from '@/templates';
import { ambientShot, CARD, CHANDELIERS, DRAW, END_SHOT, G, HALL, SEAL_Y, TRACK } from '@/templates/white-house-hall/camera';
import { COLUMN, DOOR, ELEVATION_H, ELEVATION_W, facadeStrokes, facadeSvg, FANLIGHT, PORCH, WINDOWS } from '@/templates/white-house-hall/facade';
import { crystalLayout, fluteDepth } from '@/templates/white-house-hall/geometry';
import { HALL_NAME, whiteHouseHall } from '@/templates/white-house-hall/meta';
import { CUT, INTRO, introState, veilAt } from '@/templates/white-house-hall/timeline';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('white-house-hall façade', () => {
  it('keeps every stroke of the drawing inside its frame', () => {
    const strokes = facadeStrokes();
    expect(strokes.length).toBeGreaterThan(100);
    for (const s of strokes) {
      const n = numbers(s.d);
      for (let i = 0; i < n.length; i += 2) {
        expect(n[i]!).toBeGreaterThanOrEqual(0);
        expect(n[i]!).toBeLessThanOrEqual(ELEVATION_W);
        expect(n[i + 1]!).toBeGreaterThanOrEqual(0);
        expect(n[i + 1]!).toBeLessThanOrEqual(ELEVATION_H);
      }
      expect(s.w).toBeGreaterThan(0);
      expect(s.w).toBeLessThanOrEqual(1);
    }
  });

  it('leaves the doorway clear of the inner columns and the windows between the columns', () => {
    const inner = Math.min(...COLUMN.xs.filter((x) => x > 0));
    const outer = Math.max(...COLUMN.xs);
    expect(DOOR.halfWidth + 0.16).toBeLessThan(inner - COLUMN.radius * 1.45);
    for (const x of WINDOWS.xs.filter((v) => v > 0)) {
      expect(x - WINDOWS.halfWidth).toBeGreaterThan(inner + COLUMN.radius);
      expect(x + WINDOWS.halfWidth).toBeLessThan(outer - COLUMN.radius);
    }
    expect(FANLIGHT.r).toBeLessThan(DOOR.halfWidth);
    expect(FANLIGHT.cy).toBeGreaterThan(PORCH);
  });

  it('draws the hall’s name in the pediment, never a phone number', () => {
    const svg = facadeSvg('#000', 0.03, HALL_NAME);
    expect(svg).toContain(HALL_NAME);
    expect(svg).not.toMatch(/07\d{2}|\+964/);
  });

  it('flutes the shafts between the arrises', () => {
    expect(fluteDepth(0)).toBeCloseTo(1);
    expect(fluteDepth(Math.PI / 20)).toBeCloseTo(0);
    for (let a = 0; a < Math.PI * 2; a += 0.1) expect(fluteDepth(a)).toBeGreaterThanOrEqual(0);
  });
});

describe('white-house-hall opening', () => {
  it('matches the template meta and starts on the card', () => {
    expect(INTRO).toBe(whiteHouseHall.intro.duration);
    const s0 = introState(0);
    expect(s0.gate).toBe(true);
    expect(s0.veil).toBe(0);
    expect(s0.doors).toBe(0);
  });

  it('hides the cut under a full veil, then clears it', () => {
    expect(veilAt(CUT - 0.01)).toBeGreaterThan(0.99);
    expect(veilAt(CUT + 0.01)).toBe(1);
    expect(veilAt(3.5)).toBe(0);
    expect(introState(CUT + 0.01).gate).toBe(false);
  });

  it('opens the doors and lights the hall by the end', () => {
    const end = introState(INTRO);
    expect(end.doors).toBe(1);
    expect(end.lights).toBe(1);
    expect(end.sparkle).toBe(1);
    expect(end.ink).toBe(0);
    let last = 0;
    for (let t = 0; t <= INTRO; t += 0.05) {
      const d = introState(t).doors;
      expect(d).toBeGreaterThanOrEqual(last - 1e-9);
      last = d;
    }
  });
});

describe('white-house-hall camera', () => {
  it('frames the card’s drawing and the façade with the same aspect, so the cut is invisible', () => {
    expect(DRAW.w / DRAW.h).toBeCloseTo(ELEVATION_W / ELEVATION_H, 6);
    const before = evaluateTrack(TRACK, CUT - 1e-6);
    const after = evaluateTrack(TRACK, CUT + 1e-6);
    expect(before.target[1]).toBeLessThan(G[1] / 2); // still in the card world
    expect(after.target[1]).toBeGreaterThan(0); // already at the façade
    expect(before.fit![0] / before.fit![1]).toBeCloseTo(after.fit![0] / after.fit![1], 3);
  });

  it('keeps the card and its seal inside the opening shot on a phone', () => {
    const shot = TRACK[0]!.shot;
    expect(shot.fit![0]).toBeGreaterThanOrEqual(CARD.w);
    expect(shot.fit![1]).toBeGreaterThanOrEqual(CARD.h);
    expect(SEAL_Y).toBeGreaterThan(-CARD.h / 2);
    expect(fitDistance(shot.fit!, shot.fov, 390 / 844)).toBeGreaterThan(0);
  });

  it('ends inside the hall and hands off without a jump', () => {
    expect(evaluateTrack(TRACK, INTRO)).toEqual(END_SHOT);
    const a = ambientShot(0, 0, true);
    expect(a.position).toEqual(END_SHOT.position);
    expect(END_SHOT.position[2]).toBeLessThan(HALL.front);
    expect(ambientShot(1, 0, true).position[2]).toBeGreaterThan(HALL.back);
  });
});

describe('white-house-hall hall', () => {
  it('hangs every chandelier inside the hall, below the ceiling', () => {
    for (const [x, y, z, s] of CHANDELIERS) {
      expect(Math.abs(x) + 0.8 * s).toBeLessThan(HALL.halfWidth);
      expect(y + 0.4 * s).toBeLessThan(HALL.ceiling);
      expect(z).toBeLessThan(HALL.front);
      expect(z).toBeGreaterThan(HALL.back);
    }
  });

  it('scales the crystals with the tier', () => {
    expect(crystalLayout(1).length).toBeGreaterThan(crystalLayout(0.5).length);
    expect(crystalLayout(0.35).length).toBeGreaterThan(60);
  });
});

describe('exclusive designs', () => {
  it('is exclusive to the hall, selectable in the admin but not on the public site', () => {
    expect(whiteHouseHall.exclusive).toBe(HALL_NAME);
    expect(TEMPLATES.map((t) => t.id)).toContain('white-house-hall');
    expect(PUBLIC_TEMPLATES.map((t) => t.id)).not.toContain('white-house-hall');
    expect(PUBLIC_TEMPLATES).toHaveLength(6);
  });
});
