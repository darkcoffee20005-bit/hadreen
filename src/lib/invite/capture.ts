/**
 * Capture mode drives screenshots, preview videos and the budget script deterministically:
 *   ?capture=gate | mid | content | video
 * `video` hands the clock to the recorder: window.__hadreen.frame(seconds) renders exactly that
 * moment (gate before `open()`, the opening after), so slow software rendering can't stutter.
 * The page publishes its state on window.__hadreen so scripts know when a frame is ready.
 */
export const CAPTURE_MOMENTS = ['gate', 'mid', 'content', 'video'] as const;
export type CaptureMoment = (typeof CAPTURE_MOMENTS)[number];

export interface HadreenProbe {
  path?: string;
  phase?: string;
  tier?: string;
  /** The 3D stage (or 2D gate) is ready for the guest to open it. */
  introReady?: boolean;
  /** Capture mode: the requested moment is on screen. */
  ready?: boolean;
  /** renderer.info snapshot (draw calls, triangles, textures, geometries). */
  renderInfo?: () => Record<string, number>;
  /** Video capture: start the opening (once), and render the frame at a stage clock time. */
  open?: () => void;
  frame?: (introSeconds: number | null, clockSeconds: number) => void;
  introDuration?: number;
}

declare global {
  interface Window {
    __hadreen?: HadreenProbe;
  }
}

export function readCapture(search: string): CaptureMoment | null {
  const value = new URLSearchParams(search).get('capture');
  return (CAPTURE_MOMENTS as readonly string[]).includes(value ?? '') ? (value as CaptureMoment) : null;
}

export function publishProbe(patch: Partial<HadreenProbe>) {
  if (typeof window === 'undefined') return;
  window.__hadreen = { ...window.__hadreen, ...patch };
}
