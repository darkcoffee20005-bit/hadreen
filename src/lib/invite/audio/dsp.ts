/**
 * Tiny offline DSP toolkit. Foley and placeholder music are synthesized into plain Float32Arrays
 * while the page loads: no sound files to download or license, and the same seed always gives
 * the same sound.
 */
export const SAMPLE_RATE = 32_000;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buffer(seconds: number): Float32Array {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

/** RBJ biquad, applied in place. */
export function biquad(
  data: Float32Array,
  type: 'lowpass' | 'highpass' | 'bandpass',
  freq: number | ((i: number) => number),
  q = 0.707,
): Float32Array {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  const dynamic = typeof freq === 'function';
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let a1 = 0;
  let a2 = 0;
  const design = (f: number) => {
    const w = (2 * Math.PI * Math.min(f, SAMPLE_RATE * 0.45)) / SAMPLE_RATE;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2 / a0;
      b1 = (1 - cos) / a0;
      b2 = b0;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2 / a0;
      b1 = -(1 + cos) / a0;
      b2 = b0;
    } else {
      b0 = alpha / a0;
      b1 = 0;
      b2 = -alpha / a0;
    }
    a1 = (-2 * cos) / a0;
    a2 = (1 - alpha) / a0;
  };
  if (!dynamic) design(freq);
  for (let i = 0; i < data.length; i++) {
    if (dynamic && i % 64 === 0) design(freq(i));
    const x = data[i]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    data[i] = y;
  }
  return data;
}

/** Karplus-Strong plucked string: oud, harp, mandolin and qanun stand-ins. */
export function pluck(
  out: Float32Array,
  start: number,
  freq: number,
  options: { gain?: number; decay?: number; brightness?: number; seconds?: number; seed?: number } = {},
) {
  const { gain = 0.3, decay = 0.996, brightness = 0.5, seconds = 2.5, seed = 1 } = options;
  const rand = mulberry32(seed);
  const period = Math.max(2, Math.round(SAMPLE_RATE / freq));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = rand() * 2 - 1;
  // Pre-filter the excitation: darker strings start with less high-frequency energy.
  for (let i = 1; i < period; i++) ring[i] = ring[i]! * brightness + ring[i - 1]! * (1 - brightness);
  const length = Math.min(out.length - start, Math.round(seconds * SAMPLE_RATE));
  let p = 0;
  for (let i = 0; i < length; i++) {
    const next = (p + 1) % period;
    const v = ring[p]!;
    ring[p] = decay * 0.5 * (v + ring[next]!);
    const fadeIn = Math.min(1, i / 32); // no click
    out[start + i] = out[start + i]! + v * gain * fadeIn;
    p = next;
  }
}

/** A sine "bell" or FM tone with exponential decay. */
export function tone(
  out: Float32Array,
  start: number,
  freq: number,
  options: { gain?: number; decay?: number; seconds?: number; partials?: [ratio: number, amp: number][]; attack?: number } = {},
) {
  const { gain = 0.2, decay = 3, seconds = 2, partials = [[1, 1]], attack = 0.004 } = options;
  const length = Math.min(out.length - start, Math.round(seconds * SAMPLE_RATE));
  const norm = partials.reduce((s, [, a]) => s + a, 0);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t);
    let v = 0;
    for (const [ratio, amp] of partials) v += amp * Math.sin(2 * Math.PI * freq * ratio * t);
    out[start + i] = out[start + i]! + (v / norm) * env * gain;
  }
}

/** Slow sine-stack pad (attack and release in seconds). */
export function pad(out: Float32Array, start: number, freqs: number[], seconds: number, gain = 0.06, attack = 1.2, release = 1.5) {
  const length = Math.min(out.length - start, Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, t / attack) * Math.min(1, (seconds - t) / release);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.003 * t);
    out[start + i] = out[start + i]! + (v / freqs.length) * env * gain;
  }
}

export function noise(seconds: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const out = buffer(seconds);
  for (let i = 0; i < out.length; i++) out[i] = rand() * 2 - 1;
  return out;
}

export function envelope(data: Float32Array, shape: (t: number) => number): Float32Array {
  for (let i = 0; i < data.length; i++) data[i] = data[i]! * shape(i / data.length);
  return data;
}

export function mix(into: Float32Array, from: Float32Array, at = 0, gain = 1): Float32Array {
  const n = Math.min(from.length, into.length - at);
  for (let i = 0; i < n; i++) into[at + i] = into[at + i]! + from[i]! * gain;
  return into;
}

/** Peak-normalise to `peak`, so every sound sits at a known level before mixing. */
export function normalize(data: Float32Array, peak = 0.9): Float32Array {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]!));
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] = (data[i]! / max) * peak;
  return data;
}

/** Equal-temperament (or microtonal) pitch: semitones above a root frequency. */
export const pitch = (root: number, semitones: number) => root * Math.pow(2, semitones / 12);

/** Stereo impulse response for the convolution reverb: decaying, slightly dark noise. */
export function impulseResponse(seconds = 2.2, preDelay = 0.02, seed = 7): [Float32Array, Float32Array] {
  const channels = [noise(seconds, seed), noise(seconds, seed + 1)] as [Float32Array, Float32Array];
  const pre = Math.round(preDelay * SAMPLE_RATE);
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) ch[i] = i < pre ? 0 : ch[i]! * Math.pow(1 - (i - pre) / (ch.length - pre), 3.2);
    biquad(ch, 'lowpass', 5200);
  }
  return channels;
}

/** Linear-interpolation resample (a ConvolverNode needs its impulse at the context's own rate). */
export function resample(data: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return data;
  const out = new Float32Array(Math.max(1, Math.round((data.length * to) / from)));
  const step = from / to;
  for (let i = 0; i < out.length; i++) {
    const x = i * step;
    const i0 = Math.floor(x);
    const i1 = Math.min(data.length - 1, i0 + 1);
    const f = x - i0;
    out[i] = (data[i0] ?? 0) * (1 - f) + (data[i1] ?? 0) * f;
  }
  return out;
}
