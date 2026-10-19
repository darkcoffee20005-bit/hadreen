import { impulseResponse, resample, SAMPLE_RATE } from './dsp';
import { FOLEY, synthesizeFoley, type FoleyName } from './foley';
import { hasPlaceholder, renderMusic } from './music';

const MUTE_KEY = 'hadreen:muted';
const MUSIC_LEVEL = 0.42;

interface LicensedTrack {
  id: string;
  file: string;
}

/**
 * The invitation's sound. Everything is prepared silently while the page loads; the
 * AudioContext is created only inside the guest's first tap (browsers require a gesture).
 *
 * Graph: sources → music | sfx bus → master → compressor → speakers, with the sfx bus also
 * feeding a convolution reverb built from a synthetic impulse response.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private foleyData = new Map<FoleyName, Float32Array>();
  private foleyBuffers = new Map<FoleyName, AudioBuffer>();
  private musicData: [Float32Array, Float32Array] | null = null;
  private musicSource: AudioScheduledSourceNode | null = null;
  private musicElement: HTMLAudioElement | null = null;
  private licensedUrl: string | null = null;
  private musicReady: Promise<void> | null = null;
  private wantsMusic = false;
  muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = localStorage.getItem(MUTE_KEY) === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  /**
   * Synthesize the foley (needed by the opening; reports progress 0..1), then keep preparing the
   * music in the background: it fades in whenever it's ready, so it never holds up the gate.
   */
  async prepare(trackId: string, onProgress?: (p: number) => void): Promise<void> {
    const worker = this.startWorker();
    if (!worker) {
      // No workers (very old browsers, tests): synthesize here, yielding between sounds.
      for (const [i, name] of FOLEY.entries()) {
        if (!this.foleyData.has(name)) this.foleyData.set(name, synthesizeFoley(name));
        onProgress?.((i + 1) / FOLEY.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } else {
      await new Promise<void>((resolve) => {
        worker.addEventListener('message', (e: MessageEvent) => {
          const m = e.data as { kind: string; name?: FoleyName; data?: Float32Array };
          if (m.kind === 'foley' && m.name && m.data) {
            this.foleyData.set(m.name, m.data);
            onProgress?.(this.foleyData.size / FOLEY.length);
          } else if (m.kind === 'foley-done') resolve();
        });
        worker.postMessage({ kind: 'foley' });
      });
    }
    this.musicReady ??= (async () => {
      this.licensedUrl = await findLicensedTrack(trackId);
      if (this.licensedUrl) return;
      const id = hasPlaceholder(trackId) ? trackId : 'harp-nahawand';
      this.musicData = worker
        ? await new Promise<[Float32Array, Float32Array]>((resolve) => {
            worker.addEventListener('message', (e: MessageEvent) => {
              const m = e.data as { kind: string; left?: Float32Array; right?: Float32Array };
              if (m.kind === 'music' && m.left && m.right) resolve([m.left, m.right]);
            });
            worker.postMessage({ kind: 'music', id });
          })
        : await renderMusic(id);
      if (this.wantsMusic) this.startMusic();
    })();
  }

  private worker: Worker | null = null;
  private startWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') return null;
    try {
      this.worker = new Worker(new URL('./synth.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      this.worker = null;
    }
    return this.worker;
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  /** Call synchronously inside a pointer or key handler. Safe to call more than once. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    void ctx.resume();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(compressor);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    const reverb = ctx.createConvolver();
    // Unlike buffer sources, a convolver won't resample: its impulse must match the context rate.
    const [left, right] = impulseResponse();
    reverb.buffer = this.toBuffer([resample(left, SAMPLE_RATE, ctx.sampleRate), resample(right, SAMPLE_RATE, ctx.sampleRate)], ctx.sampleRate);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    this.sfxBus.connect(reverb);
    reverb.connect(wet);
    wet.connect(this.master);
  }

  private toBuffer(channels: Float32Array | [Float32Array, Float32Array], rate = SAMPLE_RATE): AudioBuffer {
    const list = Array.isArray(channels) ? channels : [channels];
    const buf = this.ctx!.createBuffer(list.length, list[0]!.length, rate);
    list.forEach((data, i) => buf.copyToChannel(data as Float32Array<ArrayBuffer>, i));
    return buf;
  }

  /** Play a one-shot. Silent (no error) before unlock or when the sound isn't ready. */
  sfx(name: FoleyName, options: { gain?: number; pan?: number; rate?: number } = {}) {
    if (!this.ctx || !this.sfxBus) return;
    let buf = this.foleyBuffers.get(name);
    if (!buf) {
      const data = this.foleyData.get(name);
      if (!data) return;
      buf = this.toBuffer(data);
      this.foleyBuffers.set(name, buf);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = options.rate ?? 1;
    const gain = this.ctx.createGain();
    gain.gain.value = options.gain ?? 1;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = options.pan ?? 0;
    src.connect(gain).connect(panner).connect(this.sfxBus);
    src.start();
  }

  /** Fade the music in, from the licensed track or the placeholder loop (whenever it's ready). */
  startMusic(fadeSeconds = 2.5) {
    this.wantsMusic = true;
    if (!this.ctx || !this.musicBus || this.musicSource || this.musicElement) return;
    if (this.licensedUrl) {
      const el = new Audio(this.licensedUrl);
      el.loop = true;
      el.crossOrigin = 'anonymous';
      this.ctx.createMediaElementSource(el).connect(this.musicBus);
      void el.play().catch(() => {});
      this.musicElement = el;
    } else if (this.musicData) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.toBuffer(this.musicData);
      src.loop = true;
      src.connect(this.musicBus);
      src.start();
      this.musicSource = src;
    } else {
      return; // still rendering; prepare() calls back here when it's done
    }
    // setTargetAtTime only: unlike value curves, it can be interrupted at any moment safely.
    const g = this.musicBus.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(MUSIC_LEVEL, this.ctx.currentTime, fadeSeconds / 3);
  }

  /** Duck the music under a moment (e.g. the RSVP stamp), then bring it back. */
  duck(depth = 0.5, seconds = 1.2) {
    if (!this.ctx || !this.musicBus || (!this.musicSource && !this.musicElement)) return;
    const g = this.musicBus.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(MUSIC_LEVEL * depth, now, 0.03);
    g.setTargetAtTime(MUSIC_LEVEL, now + 0.25, seconds / 3);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // remembered for this page only
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
    }
    if (!muted && this.wantsMusic) this.startMusic();
  }

  /** Tab hidden: stop everything; visible again: carry on. */
  setVisible(visible: boolean) {
    if (!this.ctx) return;
    if (visible) void this.ctx.resume();
    else void this.ctx.suspend();
    if (this.musicElement) {
      if (visible) void this.musicElement.play().catch(() => {});
      else this.musicElement.pause();
    }
  }
}

async function findLicensedTrack(id: string): Promise<string | null> {
  try {
    const res = await fetch('/music/manifest.json', { cache: 'force-cache' });
    if (!res.ok) return null;
    const manifest = (await res.json()) as { tracks?: LicensedTrack[] };
    const track = manifest.tracks?.find((t) => t.id === id);
    return track ? `/music/${track.file}` : null;
  } catch {
    return null;
  }
}

export const audio = new AudioEngine();
