import { describe, expect, it } from 'vitest';
import { evaluateTrack } from '@/lib/invite/stage/rig';
import { ambientShot, END_SHOT, GATE_SHOT, PALACE_Z, TRACK } from '@/templates/blossom-oud/camera';
import { CRYSTALS, crystalLayout, frondLayout, lanternLayout, mistLayout, MIST, PALMS, palmLayout } from '@/templates/blossom-oud/layout';
import { CUT, flashAt, INTRO, introState, lanternOn } from '@/templates/blossom-oud/timeline';

describe('blossom-oud timeline', () => {
  it('starts closed and ends fully opened', () => {
    const a = introState(0);
    expect(a.gate).toBe(true);
    expect(a.flap).toBe(0);
    expect(a.open).toBe(0);
    expect(a.names).toBe(0);
    const b = introState(INTRO);
    expect(b.gate).toBe(false);
    expect(b.open).toBeCloseTo(1, 6);
    expect(b.names).toBeCloseTo(1, 6);
    expect(b.flash).toBe(0);
  });
  it('cuts inside a full bloom of light', () => {
    expect(flashAt(CUT - 1e-4)).toBeGreaterThan(0.99);
    expect(flashAt(CUT + 1e-4)).toBeGreaterThan(0.99);
    expect(flashAt(0.3)).toBe(0);
  });
  it('lights the lanterns in order down the avenue', () => {
    expect(lanternOn(0, 10, 5.6)).toBeGreaterThan(lanternOn(9, 10, 5.6));
    expect(lanternOn(9, 10, INTRO)).toBe(1);
  });
});

describe('blossom-oud camera', () => {
  it('opens on the gate shot and ends where the scroll path starts', () => {
    expect(evaluateTrack(TRACK, 0)).toEqual(GATE_SHOT);
    expect(evaluateTrack(TRACK, INTRO)).toEqual(END_SHOT);
    const a = ambientShot(0, 0, true);
    expect(a.position[2]).toBeCloseTo(END_SHOT.position[2], 6);
    expect(a.target[1]).toBeCloseTo(END_SHOT.target[1], 6);
  });
  it('dollies down the avenue to the palace gate', () => {
    let last = Infinity;
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const z = ambientShot(s, 0, true).position[2];
      expect(z).toBeLessThan(last + 1e-9);
      last = z;
    }
    expect(last).toBeGreaterThan(PALACE_Z + 10);
  });
  it('keeps the track keys in time order', () => {
    for (let i = 1; i < TRACK.length; i++) expect(TRACK[i]!.at).toBeGreaterThan(TRACK[i - 1]!.at);
  });
});

describe('blossom-oud layout', () => {
  it('hits the crystal counts per tier exactly', () => {
    for (const tier of ['high', 'medium', 'low'] as const) expect(crystalLayout(CRYSTALS[tier])).toHaveLength(CRYSTALS[tier]);
  });
  it('plants palms in two rows, and lays fronds and mist', () => {
    for (const tier of ['high', 'medium', 'low'] as const) {
      const palms = palmLayout(PALMS[tier]);
      expect(palms).toHaveLength(PALMS[tier]);
      expect(palms.filter((p) => p.x < 0)).toHaveLength(PALMS[tier] / 2);
      expect(frondLayout(palms, 9)).toHaveLength(PALMS[tier] * 9);
      expect(mistLayout(MIST[tier])).toHaveLength(MIST[tier]);
    }
    expect(lanternLayout(16)).toHaveLength(16);
  });
  it('is deterministic', () => {
    expect(palmLayout(20)).toEqual(palmLayout(20));
    expect(crystalLayout(140)).toEqual(crystalLayout(140));
  });
});
