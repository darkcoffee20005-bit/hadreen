/**
 * Colour grading as data: each template describes its look with lift/gamma/gain, saturation,
 * contrast and split-toning; the engine bakes that into a 3D LUT at runtime (no LUT files).
 * Values work on display (sRGB) colour, the way a colourist would think about them.
 */
export type RGB = [number, number, number];

export interface GradeParams {
  lift: RGB; // added to shadows (0 = neutral)
  gamma: RGB; // midtone power (1 = neutral)
  gain: RGB; // highlight multiplier (1 = neutral)
  saturation: number; // 1 = neutral
  contrast: number; // 1 = neutral, pivot 0.5
  shadowTint: RGB; // split-tone colour for shadows
  highlightTint: RGB; // split-tone colour for highlights
  splitAmount: number; // 0 = off
  /** Post-effect strengths that belong to the look. */
  bloom: number;
  vignette: number;
  grain: number;
}

export const NEUTRAL_GRADE: GradeParams = {
  lift: [0, 0, 0],
  gamma: [1, 1, 1],
  gain: [1, 1, 1],
  saturation: 1,
  contrast: 1,
  shadowTint: [0.5, 0.5, 0.5],
  highlightTint: [0.5, 0.5, 0.5],
  splitAmount: 0,
  bloom: 0.6,
  vignette: 0.45,
  grain: 0.035,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export function gradeColor(input: RGB, p: GradeParams): RGB {
  let c = input.map((v, i) => {
    const lifted = p.gain[i]! * (v + p.lift[i]! * (1 - v));
    return Math.pow(clamp01(lifted), 1 / p.gamma[i]!);
  }) as RGB;

  c = c.map((v) => clamp01((v - 0.5) * p.contrast + 0.5)) as RGB;

  const y = luma(c);
  c = c.map((v) => clamp01(y + (v - y) * p.saturation)) as RGB;

  if (p.splitAmount > 0) {
    const shadowW = (1 - y) * (1 - y) * p.splitAmount;
    const highW = y * y * p.splitAmount;
    // Overlay-style tint: 0.5 leaves a channel alone, above brightens, below darkens.
    c = c.map((v, i) => clamp01(v + (p.shadowTint[i]! - 0.5) * shadowW + (p.highlightTint[i]! - 0.5) * highW)) as RGB;
  }
  return c;
}

/** RGBA float data in the layout postprocessing's LookupTexture expects (r fastest, then g, then b). */
export function bakeGradeData(p: GradeParams, size = 32): Float32Array {
  const data = new Float32Array(size ** 3 * 4);
  const s = 1 / (size - 1);
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const out = gradeColor([r * s, g * s, b * s], p);
        const i = (r + g * size + b * size * size) * 4;
        data[i] = out[0];
        data[i + 1] = out[1];
        data[i + 2] = out[2];
        data[i + 3] = 1;
      }
    }
  }
  return data;
}
