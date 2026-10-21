import { describe, expect, it } from 'vitest';
import { decideCapability, readQueryOverrides, type CapabilityInputs } from '@/lib/invite/capability';
import { readCapture } from '@/lib/invite/capture';
import { createInviteStore, totalProgress, type IntroController } from '@/lib/invite/machine';
import { scaledCount, stepTier, tierFromGpu } from '@/lib/invite/quality/tiers';
import { isBlackFrame, samplePoints } from '@/lib/invite/stage/black-frame';
import { bakeGradeData, gradeColor, NEUTRAL_GRADE } from '@/lib/invite/stage/grade';
import { evaluateTrack, fitDistance, framedPosition, lerpShot, type Shot } from '@/lib/invite/stage/rig';

const base: CapabilityInputs = {
  force2d: false,
  tierOverride: null,
  reducedMotion: false,
  optIn3d: false,
  webgl: true,
  softwareRenderer: false,
  gpuTier: 2,
  isMobile: true,
  saveData: false,
};

describe('capability decision', () => {
  it('maps detect-gpu tiers', () => {
    const desktop = { ...base, isMobile: false };
    expect(decideCapability(desktop)).toEqual({ path: '3d', tier: 'medium' });
    expect(decideCapability({ ...desktop, gpuTier: 3 })).toEqual({ path: '3d', tier: 'high' });
    expect(decideCapability({ ...desktop, gpuTier: 1 })).toEqual({ path: '3d', tier: 'low' });
    expect(decideCapability({ ...base, gpuTier: 0 })).toMatchObject({ path: '2d', reason: 'gpu-blocklisted' });
  });

  it('runs phones one tier below their GPU tier', () => {
    expect(decideCapability({ ...base, isMobile: true, gpuTier: 3 })).toEqual({ path: '3d', tier: 'medium' });
    expect(decideCapability({ ...base, isMobile: true, gpuTier: 2 })).toEqual({ path: '3d', tier: 'low' });
    expect(decideCapability({ ...base, isMobile: true, gpuTier: 1 })).toEqual({ path: '3d', tier: 'low' });
  });

  it('falls back to 2D without WebGL, when forced, or with reduced motion', () => {
    expect(decideCapability({ ...base, webgl: false })).toMatchObject({ path: '2d', reason: 'no-webgl' });
    expect(decideCapability({ ...base, force2d: true })).toMatchObject({ path: '2d', reason: 'forced' });
    expect(decideCapability({ ...base, reducedMotion: true })).toMatchObject({ path: '2d', reason: 'reduced-motion' });
    expect(decideCapability({ ...base, reducedMotion: true, optIn3d: true })).toMatchObject({ path: '3d' });
  });

  it('keeps software WebGL (SwiftShader, llvmpipe) on the 2D path', async () => {
    const { isSoftwareRenderer } = await import('@/lib/invite/capability');
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe(false);
    expect(isSoftwareRenderer('Adreno (TM) 650')).toBe(false);
    expect(decideCapability({ ...base, softwareRenderer: true })).toMatchObject({ path: '2d', reason: 'gpu-blocklisted' });
    expect(decideCapability({ ...base, softwareRenderer: true, tierOverride: 'low' })).toEqual({ path: '3d', tier: 'low' });
  });

  it('honours a tier override (QA and screenshots on software GPUs)', () => {
    expect(decideCapability({ ...base, gpuTier: 0, tierOverride: 'high' })).toEqual({ path: '3d', tier: 'high' });
    expect(readQueryOverrides('?tier=low&force2d=1')).toEqual({ force2d: true, tierOverride: 'low' });
    expect(readQueryOverrides('?tier=ultra')).toEqual({ force2d: false, tierOverride: null });
  });

  it('is careful when the GPU is unknown or data saving is on', () => {
    expect(decideCapability({ ...base, gpuTier: null })).toEqual({ path: '3d', tier: 'low' });
    expect(decideCapability({ ...base, gpuTier: null, isMobile: false })).toEqual({ path: '3d', tier: 'medium' });
    expect(decideCapability({ ...base, gpuTier: 3, saveData: true })).toEqual({ path: '3d', tier: 'low' });
  });
});

describe('quality tiers', () => {
  it('steps within bounds and scales particle counts', () => {
    expect(stepTier('high', 1)).toBe('high');
    expect(stepTier('high', -1)).toBe('medium');
    expect(stepTier('low', -1)).toBe('low');
    expect(tierFromGpu(0)).toBeNull();
    expect(scaledCount(240, 'high')).toBe(240);
    expect(scaledCount(240, 'medium')).toBe(120);
    expect(scaledCount(240, 'low')).toBe(60);
  });
});

describe('invitation state machine', () => {
  function fakeIntro() {
    let done: (() => void) | null = null;
    const intro: IntroController = {
      duration: 8,
      play: (onComplete) => (done = onComplete),
      skip: () => done?.(),
      seek: () => {},
    };
    return { intro, finish: () => done?.() };
  }

  it('walks the 3D path: loading → gate → opening → handoff → content', () => {
    const store = createInviteStore();
    const s = () => store.getState();
    s().choosePath('3d', 'medium');
    expect(s().phase).toBe('loading');
    s().open(); // not yet: still loading
    expect(s().phase).toBe('loading');
    s().completeLoading();
    const { intro, finish } = fakeIntro();
    s().registerIntro(intro);
    s().open();
    expect(s().phase).toBe('opening');
    finish();
    expect(s().phase).toBe('handoff');
    s().finishHandoff();
    expect(s().phase).toBe('content');
  });

  it('skips the opening and falls back to 2D without losing the guest', () => {
    const store = createInviteStore();
    const s = () => store.getState();
    s().choosePath('3d', 'high');
    s().completeLoading();
    s().registerIntro(fakeIntro().intro);
    s().open();
    s().skip();
    expect(s().phase).toBe('handoff');

    const lost = createInviteStore();
    lost.getState().choosePath('3d', 'high');
    lost.getState().fallBackTo2d('chunk-failed');
    expect(lost.getState()).toMatchObject({ path: '2d', phase: 'gate', reason2d: 'chunk-failed' });
  });

  it('weights real progress and never goes backwards', () => {
    const store = createInviteStore();
    store.getState().setProgress('chunk', 1);
    store.getState().setProgress('assets', 0.5);
    store.getState().setProgress('assets', 0.2);
    expect(totalProgress(store.getState().progress)).toBeCloseTo(0.25 + 0.2, 5);
  });

  it('lab controls: pinned tier, scrubbing and replay', () => {
    const store = createInviteStore();
    const s = () => store.getState();
    const seeks: number[] = [];
    const intro: IntroController = { duration: 8, play: () => {}, skip: () => {}, seek: (t) => seeks.push(t) };
    s().choosePath('3d', 'high');
    s().forceTier('low');
    s().shiftTier(1);
    expect(s().tier).toBe('low'); // pinned: the monitor can't move it

    s().completeLoading();
    s().registerIntro(intro);
    s().scrubIntro(3);
    expect(s().phase).toBe('opening');
    s().scrubIntro(99);
    expect(seeks).toEqual([3, 8]);
    s().replay();
    expect(s().phase).toBe('gate');
    expect(seeks.at(-1)).toBe(0);
  });

  it('reads capture moments', () => {
    expect(readCapture('?capture=mid&tier=high')).toBe('mid');
    expect(readCapture('?capture=nope')).toBeNull();
  });
});

describe('grade', () => {
  it('is an identity with neutral settings', () => {
    expect(gradeColor([0.2, 0.5, 0.9], NEUTRAL_GRADE).map((v) => Number(v.toFixed(5)))).toEqual([0.2, 0.5, 0.9]);
    const data = bakeGradeData(NEUTRAL_GRADE, 4);
    expect(data.length).toBe(4 ** 3 * 4);
    expect(data[(3 + 0 * 4 + 0 * 16) * 4]).toBeCloseTo(1); // pure red stays red
  });

  it('warms highlights with split toning', () => {
    const warm = { ...NEUTRAL_GRADE, highlightTint: [0.8, 0.6, 0.4] as [number, number, number], splitAmount: 0.4 };
    const [r, , b] = gradeColor([0.8, 0.8, 0.8], warm);
    expect(r).toBeGreaterThan(b);
  });
});

describe('camera framing', () => {
  const shot: Shot = { position: [0, 0, 4], target: [0, 0, 0], fov: 40, fit: [3, 2] };

  it('backs the camera off on narrow screens so the subject fits', () => {
    const wide = framedPosition(shot, 16 / 9);
    const phone = framedPosition(shot, 390 / 844);
    expect(wide).toEqual([0, 0, 4]);
    expect(phone[2]).toBeCloseTo(fitDistance([3, 2], 40, 390 / 844), 5);
    expect(phone[2]).toBeGreaterThan(4);
  });

  it('interpolates shots', () => {
    const mid = lerpShot(shot, { position: [2, 2, 6], target: [0, 1, 0], fov: 30 }, 0.5);
    expect(mid.position).toEqual([1, 1, 5]);
    expect(mid.fov).toBe(35);
  });
});

describe('camera track', () => {
  const a: Shot = { position: [0, 0, 4], target: [0, 0, 0], fov: 32 };
  const b: Shot = { position: [0, 2, 8], target: [0, 1, 0], fov: 36 };
  const track = [
    { at: 0, shot: a },
    { at: 2, shot: b, ease: (t: number) => t },
  ];

  it('holds before and after the track and interpolates in between', () => {
    expect(evaluateTrack(track, -1)).toEqual(a);
    expect(evaluateTrack(track, 1).position).toEqual([0, 1, 6]);
    expect(evaluateTrack(track, 99)).toEqual(b);
  });
});

describe('scene colours', () => {
  it('mixes in sRGB, like CSS color-mix', async () => {
    const { mixHex, shadeHex } = await import('@/lib/invite/stage/color');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#0b3d2e', '#c9a96e', 0)).toBe('#0b3d2e');
    expect(mixHex('#0b3d2e', '#c9a96e', 1)).toBe('#c9a96e');
    expect(mixHex('#0B3D2E', '#C9A96E', 0.1)).toBe('#1e4834');
    expect(shadeHex('#808080', 0.5)).toBe('#404040');
    expect(shadeHex('#f0f0f0', 2)).toBe('#ffffff');
  });
});

describe('lab tweaks', () => {
  it('stores values only the lab sets', async () => {
    const { tweakStore, setTweak, activateTweaks } = await import('@/lib/invite/lab/tweaks');
    expect(tweakStore.getState().active).toBe(false);
    activateTweaks();
    setTweak('key light', 200);
    expect(tweakStore.getState()).toMatchObject({ active: true, values: { 'key light': 200 } });
  });
});

describe('globe land dots', () => {
  it('covers the land, not the sea, at every tier', async () => {
    const { LAND_BITS } = await import('@/lib/land-dots.data');
    const { landDots, latLonToVec3, latticePoint, LAND_LATTICE } = await import('@/lib/land-dots');
    for (const tier of ['low', 'medium', 'high'] as const) {
      const { positions, latLon } = landDots(LAND_BITS[tier], tier);
      const share = latLon.length / 2 / LAND_LATTICE[tier];
      expect(share).toBeGreaterThan(0.25); // land is ~29 % of the sphere
      expect(share).toBeLessThan(0.33);
      expect(positions.length).toBe((latLon.length / 2) * 3);
    }
    const near = (lat: number, lon: number) => {
      const { latLon } = landDots(LAND_BITS.high, 'high');
      for (let i = 0; i < latLon.length; i += 2) if (Math.abs(latLon[i]! - lat) < 2 && Math.abs(latLon[i + 1]! - lon) < 2) return true;
      return false;
    };
    expect(near(33.3, 44.4)).toBe(true); // Baghdad
    expect(near(0, -30)).toBe(false); // mid-Atlantic
    expect(latLonToVec3(0, 0)).toEqual([0, 0, 1]);
    expect(latticePoint(0, 100).lat).toBeGreaterThan(80);
  });
});

describe('live thumbnails (mini stores)', () => {
  it('loops the opening: play, hold the end, rewind, play again', async () => {
    const { vi } = await import('vitest');
    const { createMiniStore } = await import('@/lib/invite/machine');
    vi.useFakeTimers();
    const calls: string[] = [];
    let done: (() => void) | null = null;
    const intro: IntroController = {
      duration: 8,
      play: (onComplete) => {
        calls.push('play');
        done = onComplete;
      },
      skip: () => {},
      seek: (t) => calls.push(`seek ${t}`),
    };
    const mini = createMiniStore('low', { hold: 1000, delay: 200 });
    expect(mini.store.getState()).toMatchObject({ mode: 'mini', path: '3d', phase: 'opening', tier: 'low', tierLocked: true });
    mini.store.getState().registerIntro(intro);
    expect(calls).toEqual(['seek 0']);
    vi.advanceTimersByTime(200);
    expect(calls).toEqual(['seek 0', 'play']);
    done!();
    vi.advanceTimersByTime(1000);
    expect(calls.at(-1)).toBe('seek 0');
    vi.advanceTimersByTime(700);
    expect(calls.at(-1)).toBe('play');
    mini.dispose();
    done!();
    vi.advanceTimersByTime(5000);
    expect(calls.filter((c) => c === 'play')).toHaveLength(2);
    vi.useRealTimers();
  });
});

describe('black-frame guard', () => {
  it('samples a grid inside the buffer', () => {
    const points = samplePoints(100, 50);
    expect(points).toHaveLength(25);
    expect(points.every(([x, y]) => x >= 0 && x < 100 && y >= 0 && y < 50)).toBe(true);
  });

  it('calls a frame black by its median, ignoring a few lit pixels', () => {
    expect(isBlackFrame([0, 0, 1, 2, 200])).toBe(true);
    expect(isBlackFrame([0, 30, 40, 50, 60])).toBe(false);
    expect(isBlackFrame([])).toBe(false);
  });
});
