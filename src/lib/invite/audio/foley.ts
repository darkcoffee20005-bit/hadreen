import { biquad, buffer, envelope, mix, mulberry32, noise, normalize, pitch, SAMPLE_RATE, tone } from './dsp';

/** One-shots used by the scenes' opening timelines and the content page. */
export const FOLEY = ['paper', 'waxCrack', 'water', 'chimes', 'whoosh', 'cloth', 'plane', 'stamp', 'tick'] as const;
export type FoleyName = (typeof FOLEY)[number];

function paper(): Float32Array {
  const rand = mulberry32(11);
  const out = biquad(noise(0.7, 12), 'bandpass', 3200, 0.8);
  // Crinkles: short random spikes riding a soft swell.
  const crinkle = new Float32Array(out.length);
  for (let k = 0; k < 26; k++) {
    const at = Math.floor(rand() * out.length * 0.85);
    const len = Math.floor(SAMPLE_RATE * (0.004 + rand() * 0.02));
    for (let i = 0; i < len && at + i < out.length; i++) crinkle[at + i] = Math.max(crinkle[at + i]!, (1 - i / len) * (0.4 + rand() * 0.6));
  }
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    out[i] = out[i]! * (0.25 * Math.sin(Math.PI * t) + crinkle[i]!);
  }
  return normalize(out, 0.7);
}

function waxCrack(): Float32Array {
  const out = buffer(0.4);
  const snap = biquad(envelope(noise(0.06, 21), (t) => Math.pow(1 - t, 6)), 'highpass', 1800);
  mix(out, biquad(snap.slice(), 'bandpass', 2400, 6), 0, 1.4);
  mix(out, biquad(snap.slice(), 'bandpass', 900, 5), 0, 1);
  tone(out, 0, 95, { gain: 0.9, decay: 18, seconds: 0.3 }); // the thump of the seal giving way
  return normalize(out, 0.85);
}

function water(): Float32Array {
  const rand = mulberry32(31);
  const out = biquad(envelope(noise(1.4, 32), (t) => 0.15 * Math.sin(Math.PI * t)), 'lowpass', 900);
  for (let k = 0; k < 7; k++) {
    const at = Math.floor((0.05 + rand() * 0.9) * out.length * 0.9);
    const f0 = 500 + rand() * 500;
    const len = Math.floor(SAMPLE_RATE * 0.05);
    for (let i = 0; i < len && at + i < out.length; i++) {
      const t = i / SAMPLE_RATE;
      const f = f0 + (f0 * 1.6 * i) / len; // a droplet rises in pitch
      out[at + i] = out[at + i]! + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 70) * 0.5;
    }
  }
  return normalize(out, 0.6);
}

function chimes(): Float32Array {
  const out = buffer(2.8);
  const bell: [number, number][] = [
    [1, 1],
    [2.76, 0.45],
    [5.4, 0.25],
    [8.93, 0.12],
  ];
  [0, 4, 7, 12].forEach((step, i) => tone(out, Math.floor(i * 0.14 * SAMPLE_RATE), pitch(1046, step), { gain: 0.35, decay: 2.2, seconds: 2.4, partials: bell }));
  return normalize(out, 0.55);
}

function whoosh(): Float32Array {
  const n = noise(1.1, 41);
  const len = n.length;
  biquad(n, 'bandpass', (i) => 300 + 2400 * Math.sin((Math.PI * i) / len), 1.2);
  return normalize(envelope(n, (t) => Math.pow(Math.sin(Math.PI * t), 2)), 0.6);
}

function cloth(): Float32Array {
  const rand = mulberry32(51);
  const n = biquad(noise(0.9, 52), 'lowpass', 700);
  let am = 0;
  for (let i = 0; i < n.length; i++) {
    if (i % 400 === 0) am = 0.3 + rand() * 0.7; // rustle
    n[i] = n[i]! * am * Math.sin((Math.PI * i) / n.length);
  }
  return normalize(n, 0.55);
}

function plane(): Float32Array {
  const out = biquad(noise(2.6, 61), 'lowpass', (i) => 400 + 900 * Math.sin((Math.PI * i) / (2.6 * SAMPLE_RATE)));
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = 110 * (1 - 0.08 * Math.max(0, t - 1.6)); // Doppler drop as it passes
    out[i] = out[i]! * 0.7 + 0.08 * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.01 * t));
  }
  return normalize(envelope(out, (t) => Math.sin(Math.PI * t)), 0.5);
}

function stamp(): Float32Array {
  const out = buffer(0.5);
  tone(out, 0, 70, { gain: 1, decay: 14, seconds: 0.4 });
  mix(out, biquad(envelope(noise(0.08, 71), (t) => Math.pow(1 - t, 4)), 'lowpass', 1600), 0, 0.6);
  return normalize(out, 0.8);
}

function tick(): Float32Array {
  const out = buffer(0.05);
  tone(out, 0, 2200, { gain: 1, decay: 120, seconds: 0.05 });
  return normalize(out, 0.4);
}

const MAKERS: Record<FoleyName, () => Float32Array> = { paper, waxCrack, water, chimes, whoosh, cloth, plane, stamp, tick };

export function synthesizeFoley(name: FoleyName): Float32Array {
  return MAKERS[name]();
}
