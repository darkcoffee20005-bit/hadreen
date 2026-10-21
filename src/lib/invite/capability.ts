import { isTier, stepTier, tierFromGpu, type Tier } from './quality/tiers';

export type Reason2D =
  | 'forced'
  | 'reduced-motion'
  | 'no-webgl'
  | 'gpu-blocklisted'
  | 'chunk-failed'
  | 'context-lost'
  | 'timeout';

export interface Capability {
  path: '3d' | '2d';
  tier: Tier;
  reason?: Reason2D;
}

export interface CapabilityInputs {
  force2d: boolean;
  /** ?tier=… forces the 3D path at that tier (QA, screenshots on software GPUs). */
  tierOverride: Tier | null;
  reducedMotion: boolean;
  /** The guest pressed "شغّلوا النسخة ثلاثية الأبعاد" despite reduced motion. */
  optIn3d: boolean;
  webgl: boolean;
  /** WebGL runs on a CPU rasteriser (SwiftShader, llvmpipe…): far too slow for the opening. */
  softwareRenderer: boolean;
  /** detect-gpu tier, or null when detection failed or timed out. */
  gpuTier: number | null;
  isMobile: boolean;
  saveData: boolean;
}

/** Pure decision, unit-tested. The order matters: explicit choices first, then the device. */
export function decideCapability(i: CapabilityInputs): Capability {
  if (i.force2d) return { path: '2d', tier: 'low', reason: 'forced' };
  if (!i.webgl) return { path: '2d', tier: 'low', reason: 'no-webgl' };
  if (i.tierOverride) return { path: '3d', tier: i.tierOverride };
  if (i.reducedMotion && !i.optIn3d) return { path: '2d', tier: 'low', reason: 'reduced-motion' };
  if (i.softwareRenderer) return { path: '2d', tier: 'low', reason: 'gpu-blocklisted' };

  let tier: Tier;
  if (i.gpuTier === null) {
    tier = i.isMobile ? 'low' : 'medium'; // unknown GPU: be careful on phones
  } else {
    const mapped = tierFromGpu(i.gpuTier);
    if (!mapped) return { path: '2d', tier: 'low', reason: 'gpu-blocklisted' };
    // Phones run a step lower than detect-gpu suggests: their screens are dense, they heat up
    // and throttle, and the page scrolls over the canvas.
    tier = i.isMobile ? stepTier(mapped, -1) : mapped;
  }
  if (i.saveData) tier = 'low';
  return { path: '3d', tier };
}

export function readQueryOverrides(search: string) {
  const params = new URLSearchParams(search);
  const tier = params.get('tier');
  return { force2d: params.get('force2d') === '1', tierOverride: isTier(tier) ? tier : null };
}

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RENDERER.test(renderer);
}

export function probeWebGL(): { webgl: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return { webgl: false, renderer: '' };
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl: true, renderer };
  } catch {
    return { webgl: false, renderer: '' };
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const OPT_IN_KEY = 'hadreen:3d-opt-in';

export function readOptIn3d(): boolean {
  try {
    return localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveOptIn3d() {
  try {
    localStorage.setItem(OPT_IN_KEY, '1');
  } catch {
    // private mode: the choice lasts for this page only
  }
}

/** What the last capability check saw, for the ?debug=1 overlay. */
export const diagnostics: { renderer: string; gpuTier: number | null; isMobile: boolean; reducedMotion: boolean; ms: number } = {
  renderer: '',
  gpuTier: null,
  isMobile: false,
  reducedMotion: false,
  ms: 0,
};

/** Runs on the client after hydration. detect-gpu benchmarks are self-hosted under /detect-gpu. */
export async function detectCapability(search: string, optIn3d = readOptIn3d()): Promise<Capability> {
  const started = performance.now();
  const overrides = readQueryOverrides(search);
  const reducedMotion = prefersReducedMotion();
  const { webgl, renderer } = probeWebGL();
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };

  let gpuTier: number | null = null;
  let isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const needsGpu = webgl && !overrides.force2d && !overrides.tierOverride && !(reducedMotion && !optIn3d);
  if (needsGpu) {
    try {
      const { getGPUTier } = await import('detect-gpu');
      const result = await Promise.race([
        getGPUTier({ benchmarksURL: '/detect-gpu' }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      if (result) {
        gpuTier = result.tier;
        isMobile = result.isMobile ?? isMobile;
      }
    } catch {
      gpuTier = null;
    }
  }

  Object.assign(diagnostics, { renderer, gpuTier, isMobile, reducedMotion, ms: Math.round(performance.now() - started) });
  return decideCapability({
    ...overrides,
    reducedMotion,
    optIn3d,
    webgl,
    softwareRenderer: isSoftwareRenderer(renderer),
    gpuTier,
    isMobile,
    saveData: Boolean(nav.connection?.saveData),
  });
}
