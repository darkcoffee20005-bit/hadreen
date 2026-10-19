/**
 * Colour helpers for scenes. Mixing happens in sRGB (like CSS color-mix in srgb), which is how
 * designers think about "10 % gold": three's Color.lerp works in linear light and lets the
 * brighter colour dominate (10 % gold over emerald comes out olive).
 */
/** sRGB channels 0–255. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function format([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** `t` of the way from `a` to `b`, in sRGB. */
export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return format([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Scale the sRGB channels: 0.6 = 40 % darker, 1.2 = 20 % brighter. */
export function shadeHex(hex: string, k: number): string {
  const [r, g, b] = hexToRgb(hex);
  return format([r * k, g * k, b * k]);
}
