/**
 * A short music sting when a design comes forward: three soft plucked notes (Rast colours, the
 * third a neutral third) with a gentle tail. Synthesized on the spot, no download.
 */
let ctx: AudioContext | null = null;

export function playSting(seed = 0) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    void ctx.resume();
    const base = 293.66 * [1, 1.125, 1.2][seed % 3]!; // D, E, ~F (Rast)
    const notes = [1, 1.2247, 1.5, 2]; // root, neutral third, fifth, octave
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.18;
    out.connect(ctx.destination);
    notes.forEach((ratio, i) => {
      const t = now + i * 0.085;
      const osc = ctx!.createOscillator();
      const tone = ctx!.createOscillator();
      const env = ctx!.createGain();
      osc.type = 'triangle';
      tone.type = 'sine';
      osc.frequency.value = base * ratio;
      tone.frequency.value = base * ratio * 2;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.5 : 0.8, t + 0.012);
      env.gain.setTargetAtTime(0, t + 0.02, i === notes.length - 1 ? 0.5 : 0.22);
      osc.connect(env);
      tone.connect(env);
      env.connect(out);
      osc.start(t);
      tone.start(t);
      osc.stop(t + 2.2);
      tone.stop(t + 2.2);
    });
  } catch {
    // no sound is fine
  }
}
