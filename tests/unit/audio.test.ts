import { describe, expect, it } from 'vitest';
import { biquad, impulseResponse, mulberry32, noise, SAMPLE_RATE } from '@/lib/invite/audio/dsp';
import { FOLEY, synthesizeFoley } from '@/lib/invite/audio/foley';
import { hasPlaceholder, pieceFor, renderMusic } from '@/lib/invite/audio/music';
import { PLACEHOLDER_TRACKS } from '@/lib/music';

const peak = (d: Float32Array) => d.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const finite = (d: Float32Array) => d.every((v) => Number.isFinite(v));

describe('dsp', () => {
  it('is deterministic for a seed', () => {
    expect(noise(0.01, 3)).toEqual(noise(0.01, 3));
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect([a(), a()]).toEqual([b(), b()]);
  });

  it('low-pass filtering removes energy and stays stable', () => {
    const n = noise(0.5, 9);
    const before = n.reduce((s, v) => s + v * v, 0);
    biquad(n, 'lowpass', 300);
    expect(finite(n)).toBe(true);
    expect(n.reduce((s, v) => s + v * v, 0)).toBeLessThan(before * 0.2);
  });

  it('builds a decaying stereo impulse response', () => {
    const [l, r] = impulseResponse(1);
    expect(l.length).toBe(SAMPLE_RATE);
    expect(peak(l.slice(-1000))).toBeLessThan(peak(l.slice(1000, 3000)));
    expect(l).not.toEqual(r);
  });
});

describe('foley', () => {
  it.each(FOLEY)('%s is audible, finite and never clips', (name) => {
    const s = synthesizeFoley(name);
    expect(s.length).toBeGreaterThan(SAMPLE_RATE * 0.04);
    expect(finite(s)).toBe(true);
    expect(peak(s)).toBeGreaterThan(0.3);
    expect(peak(s)).toBeLessThanOrEqual(0.9);
  });
});

describe('placeholder music', () => {
  it('has a loop for every placeholder track offered in the admin', () => {
    for (const t of PLACEHOLDER_TRACKS) expect(hasPlaceholder(t.id)).toBe(true);
  });

  it('keeps every note inside the loop', () => {
    for (const t of PLACEHOLDER_TRACKS) {
      const piece = pieceFor(t.id);
      expect(piece.seconds).toBeGreaterThan(15);
      expect(piece.seconds).toBeLessThan(35);
      for (const e of piece.events) expect(e.at).toBeLessThan(piece.seconds);
    }
  });

  it('renders a seamless, finite stereo loop at a sane level', async () => {
    const started = performance.now();
    const [l, r] = await renderMusic('oud-hijaz');
    const ms = performance.now() - started;
    expect(l.length).toBe(Math.floor(pieceFor('oud-hijaz').seconds * SAMPLE_RATE));
    expect(r.length).toBe(l.length);
    expect(finite(l) && finite(r)).toBe(true);
    expect(peak(l)).toBeGreaterThan(0.05);
    expect(peak(l)).toBeLessThan(1.5); // the master compressor catches the rest
    expect(ms).toBeLessThan(4000);
  });
});

describe('resample', () => {
  it('keeps duration and shape across rates', async () => {
    const { resample } = await import('@/lib/invite/audio/dsp');
    const ramp = Float32Array.from({ length: 32 }, (_, i) => i / 31);
    const up = resample(ramp, 32_000, 48_000);
    expect(up.length).toBe(48);
    expect(up[0]).toBe(0);
    expect(up[24]).toBeCloseTo(ramp[16]!, 5);
    expect(resample(ramp, 44_100, 44_100)).toBe(ramp);
  });
});
