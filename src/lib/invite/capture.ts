/**
 * Capture mode drives screenshots, preview videos and the budget script deterministically:
 *   ?capture=gate | mid | content
 * The page publishes its state on window.__hadreen so scripts know when a frame is ready.
 */
export const CAPTURE_MOMENTS = ['gate', 'mid', 'content'] as const;
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
