import { biquad, buffer, mix, noise, pad, pitch, pluck, SAMPLE_RATE, tone } from './dsp';

/**
 * Placeholder music, one loop per template mood, until licensed tracks are added to
 * /public/music. Written as note events and rendered in small chunks during loading.
 * Maqam scales use real quarter tones where the maqam has them (Rast).
 */
type Kind = 'pluck' | 'tone' | 'pad' | 'dum' | 'tak' | 'shaker';

interface NoteEvent {
  at: number; // seconds
  kind: Kind;
  freq?: number;
  freqs?: number[];
  dur?: number;
  gain: number;
  pan: number; // -1 left … 1 right
  brightness?: number;
  decay?: number;
  partials?: [number, number][];
}

interface Piece {
  seconds: number;
  events: NoteEvent[];
}

const TAIL = 3; // seconds of ring-out folded back onto the start so the loop is seamless

function beats(bpm: number) {
  const beat = 60 / bpm;
  return { beat, at: (bar: number, b: number, beatsPerBar = 4) => (bar * beatsPerBar + b) * beat };
}

const NAHAWAND = [0, 2, 3, 5, 7, 8, 11];
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const RAST = [0, 2, 3.5, 5, 7, 9, 10.5]; // E and B half-flat

const degree = (scale: number[], d: number) => scale[((d % 7) + 7) % 7]! + 12 * Math.floor(d / 7);

function harpNahawand(): Piece {
  const { beat, at } = beats(66);
  const root = 130.81; // C3
  const chords = [0, 3, 4, 0]; // i iv V i
  const events: NoteEvent[] = [];
  for (let bar = 0; bar < 8; bar++) {
    const c = chords[Math.floor(bar / 2)]!;
    events.push({ at: at(bar, 0), kind: 'pad', freqs: [pitch(root, degree(NAHAWAND, c) - 12), pitch(root, degree(NAHAWAND, c + 4) - 12)], dur: beat * 4.2, gain: 0.05, pan: 0 });
    const shape = [0, 2, 4, 7, 9, 7, 4, 2];
    shape.forEach((d, i) =>
      events.push({ at: at(bar, i / 2), kind: 'pluck', freq: pitch(root, degree(NAHAWAND, c + d) + 12), gain: 0.16, pan: i % 2 ? 0.35 : -0.35, brightness: 0.7, decay: 0.997 }),
    );
  }
  return { seconds: at(8, 0), events };
}

function oudHijaz(): Piece {
  const { at } = beats(80);
  const root = 146.83; // D3
  const events: NoteEvent[] = [];
  // A short taqsim-like phrase, answered an octave lower.
  const phrase: [number, number][] = [
    [0, 0], [1, 0.5], [2, 1], [3, 1.5], [2, 2], [1, 2.5], [0, 3],
    [4, 4], [3, 4.75], [2, 5.5], [1, 6], [0, 7],
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const [d, b] of phrase) {
      events.push({ at: at(rep * 4, b), kind: 'pluck', freq: pitch(root, degree(HIJAZ, d) - rep * 12 + 12), gain: 0.2, pan: -0.15, brightness: 0.35, decay: 0.995 });
    }
  }
  for (let bar = 0; bar < 8; bar++) {
    events.push({ at: at(bar, 0), kind: 'dum', gain: 0.35, pan: 0 });
    events.push({ at: at(bar, 2.5), kind: 'dum', gain: 0.22, pan: 0 });
    events.push({ at: at(bar, 1), kind: 'tak', gain: 0.12, pan: 0.3 });
    events.push({ at: at(bar, 3), kind: 'tak', gain: 0.12, pan: 0.3 });
  }
  events.push({ at: 0, kind: 'pad', freqs: [root / 2, pitch(root / 2, 7)], dur: at(8, 0) + 1, gain: 0.035, pan: 0 });
  return { seconds: at(8, 0), events };
}

function mandolinMajor(): Piece {
  const { at } = beats(96);
  const root = 196; // G3
  const chords = [0, 4, 5, 3]; // I V vi IV
  const events: NoteEvent[] = [];
  for (let bar = 0; bar < 8; bar++) {
    const c = chords[bar % 4]!;
    for (let s = 0; s < 16; s++) {
      const d = [0, 2, 4][Math.floor(s / 2) % 3]!;
      events.push({ at: at(bar, s / 4), kind: 'pluck', freq: pitch(root, degree(MAJOR, c + d) + 12), gain: s % 2 ? 0.07 : 0.11, pan: 0.2, brightness: 0.85, decay: 0.993 });
      events.push({ at: at(bar, s / 4), kind: 'shaker', gain: s % 4 === 2 ? 0.05 : 0.025, pan: -0.3 });
    }
    events.push({ at: at(bar, 0), kind: 'pluck', freq: pitch(root, degree(MAJOR, c) - 12), gain: 0.18, pan: 0, brightness: 0.4, decay: 0.996 });
  }
  return { seconds: at(8, 0), events };
}

function stringsQanun(): Piece {
  const { beat, at } = beats(70);
  const root = 130.81; // C3, maqam Rast
  const events: NoteEvent[] = [];
  const chords = [0, 3, 4, 0];
  for (let bar = 0; bar < 8; bar += 2) {
    const c = chords[bar / 2]!;
    events.push({ at: at(bar, 0), kind: 'pad', freqs: [0, 2, 4].map((d) => pitch(root, degree(RAST, c + d))), dur: beat * 8.4, gain: 0.07, pan: 0 });
  }
  // Qanun runs climbing through the maqam, quarter tones included.
  for (let bar = 0; bar < 8; bar++) {
    const run = bar % 2 === 0 ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    run.forEach((d, i) =>
      events.push({ at: at(bar, 2 + i / 4), kind: 'pluck', freq: pitch(root, degree(RAST, d) + 12), gain: 0.11, pan: 0.4, brightness: 0.9, decay: 0.996 }),
    );
  }
  return { seconds: at(8, 0), events };
}

function pianoWaltz(): Piece {
  const { at } = beats(84);
  const root = 174.61; // F3
  const chords = [0, 5, 3, 4]; // F Dm Bb C
  const piano: [number, number][] = [
    [1, 1],
    [2, 0.35],
    [3, 0.12],
  ];
  const events: NoteEvent[] = [];
  for (let bar = 0; bar < 12; bar++) {
    const c = chords[Math.floor(bar / 3)]!;
    events.push({ at: at(bar, 0, 3), kind: 'tone', freq: pitch(root, degree(MAJOR, c) - 12), gain: 0.2, pan: -0.2, decay: 1.6, partials: piano, dur: 2.5 });
    for (const b of [1, 2]) {
      for (const d of [2, 4]) {
        events.push({ at: at(bar, b, 3), kind: 'tone', freq: pitch(root, degree(MAJOR, c + d)), gain: 0.06, pan: 0.15, decay: 3, partials: piano, dur: 1.2 });
      }
    }
    const melody = [4, 5, 4, 2, 4, 7, 6, 4, 5, 4, 2, 0];
    events.push({ at: at(bar, 0, 3), kind: 'tone', freq: pitch(root, degree(MAJOR, melody[bar]!) + 12), gain: 0.1, pan: 0.25, decay: 1.2, partials: piano, dur: 3 });
  }
  events.push({ at: 0, kind: 'pad', freqs: [root / 2], dur: at(12, 0, 3) + 1, gain: 0.04, pan: 0 });
  return { seconds: at(12, 0, 3), events };
}

function arpTravel(): Piece {
  const { at } = beats(100);
  const root = 220; // A3
  const chords: number[][] = [
    [0, 4, 7, 11], // Amaj7
    [-3, 0, 4, 7], // F#m7
    [-7, -3, 0, 4], // Dmaj7
    [-5, -1, 2, 7], // E
  ];
  const events: NoteEvent[] = [];
  for (let bar = 0; bar < 8; bar++) {
    const ch = chords[Math.floor(bar / 2) % 4]!;
    for (let s = 0; s < 16; s++) {
      events.push({ at: at(bar, s / 4), kind: 'tone', freq: pitch(root, ch[s % 4]! + (s >= 8 ? 12 : 0)), gain: 0.05, pan: Math.sin(s) * 0.4, decay: 7, partials: [[1, 1], [3, 0.1]], dur: 0.6 });
    }
    events.push({ at: at(bar, 0), kind: 'dum', gain: 0.25, pan: 0 });
    events.push({ at: at(bar, 2), kind: 'dum', gain: 0.18, pan: 0 });
    for (let s = 1; s < 8; s += 2) events.push({ at: at(bar, s / 2), kind: 'shaker', gain: 0.03, pan: 0.3 });
  }
  return { seconds: at(8, 0), events };
}

const PIECES: Record<string, () => Piece> = {
  'harp-nahawand': harpNahawand,
  'oud-hijaz': oudHijaz,
  'mandolin-major': mandolinMajor,
  'strings-qanun': stringsQanun,
  'piano-waltz': pianoWaltz,
  'arp-travel': arpTravel,
};

export function hasPlaceholder(id: string): boolean {
  return id in PIECES;
}

export function pieceFor(id: string): Piece {
  return (PIECES[id] ?? harpNahawand)();
}

function renderEvent(e: NoteEvent, seed: number): Float32Array {
  switch (e.kind) {
    case 'pluck': {
      const out = buffer(2.6);
      pluck(out, 0, e.freq!, { gain: 1, brightness: e.brightness, decay: e.decay, seed });
      return out;
    }
    case 'tone': {
      const out = buffer((e.dur ?? 2) + 0.1);
      tone(out, 0, e.freq!, { gain: 1, decay: e.decay ?? 3, seconds: e.dur ?? 2, partials: e.partials });
      return out;
    }
    case 'pad': {
      const out = buffer(e.dur!);
      pad(out, 0, e.freqs!, e.dur!, 1);
      return out;
    }
    case 'dum': {
      const out = buffer(0.5);
      tone(out, 0, 62, { gain: 1, decay: 9, seconds: 0.45 });
      return mix(out, biquad(noise(0.12, seed), 'lowpass', 300), 0, 0.3);
    }
    case 'tak': {
      const n = noise(0.08, seed);
      for (let i = 0; i < n.length; i++) n[i] = n[i]! * Math.pow(1 - i / n.length, 5);
      return biquad(n, 'highpass', 2500);
    }
    case 'shaker': {
      const n = noise(0.06, seed);
      for (let i = 0; i < n.length; i++) n[i] = n[i]! * Math.sin((Math.PI * i) / n.length);
      return biquad(n, 'highpass', 6000);
    }
  }
}

/**
 * Renders a placeholder loop to stereo samples. Yields to the browser between notes so the
 * loader keeps animating; reports progress 0..1.
 */
export async function renderMusic(id: string, onProgress?: (p: number) => void): Promise<[Float32Array, Float32Array]> {
  const piece = pieceFor(id);
  const total = Math.ceil((piece.seconds + TAIL) * SAMPLE_RATE);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  let i = 0;
  for (const e of piece.events) {
    const note = renderEvent(e, 1000 + i);
    const start = Math.floor(e.at * SAMPLE_RATE);
    const l = e.gain * Math.cos(((e.pan + 1) * Math.PI) / 4);
    const r = e.gain * Math.sin(((e.pan + 1) * Math.PI) / 4);
    mix(left, note, start, l);
    mix(right, note, start, r);
    if (++i % 12 === 0) {
      onProgress?.(i / piece.events.length);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  // Fold the ring-out past the loop point back onto the start: a seamless loop.
  const loop = Math.floor(piece.seconds * SAMPLE_RATE);
  for (const ch of [left, right]) for (let k = loop; k < total; k++) ch[k - loop] = ch[k - loop]! + ch[k]!;
  const out: [Float32Array, Float32Array] = [left.slice(0, loop), right.slice(0, loop)];
  // Same loudness for every mood: peak at 0.35 before the music bus.
  let max = 0;
  for (const ch of out) for (let k = 0; k < ch.length; k++) max = Math.max(max, Math.abs(ch[k]!));
  if (max > 0) for (const ch of out) for (let k = 0; k < ch.length; k++) ch[k] = (ch[k]! / max) * 0.35;
  onProgress?.(1);
  return out;
}
