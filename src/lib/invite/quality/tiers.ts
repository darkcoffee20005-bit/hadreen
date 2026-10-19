export const TIERS = ['low', 'medium', 'high'] as const;
export type Tier = (typeof TIERS)[number];

export interface TierSettings {
  /** Pixel-ratio cap. */
  dpr: number;
  /** MSAA samples on the composer's render target (WebGL2). */
  msaa: number;
  /** SMAA pass when MSAA is off. */
  smaa: boolean;
  /** Run the post-processing composer at all (grade, bloom, grain). */
  post: boolean;
  bloom: 'full' | 'half' | 'off';
  shadows: boolean;
  shadowMapSize: number;
  /** Multiplier for particle counts written for the high tier. */
  particles: number;
  /** Planar reflection render-target size; 0 = fake it with the environment. */
  reflection: number;
  envResolution: number;
  dof: boolean;
  /** Frame cap once the guest is reading the content and not interacting. */
  idleFps: number;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: {
    dpr: 2,
    msaa: 4,
    smaa: false,
    post: true,
    bloom: 'full',
    shadows: true,
    shadowMapSize: 2048,
    particles: 1,
    reflection: 1024,
    envResolution: 256,
    dof: true,
    idleFps: 30,
  },
  medium: {
    dpr: 1.5,
    msaa: 0,
    smaa: true,
    post: true,
    bloom: 'half',
    shadows: true,
    shadowMapSize: 1024,
    particles: 0.5,
    reflection: 512,
    envResolution: 128,
    dof: false,
    idleFps: 30,
  },
  low: {
    dpr: 1,
    msaa: 0,
    smaa: false,
    post: false,
    bloom: 'off',
    shadows: false,
    shadowMapSize: 512,
    particles: 0.25,
    reflection: 0,
    envResolution: 64,
    dof: false,
    idleFps: 24,
  },
};

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

export function stepTier(tier: Tier, direction: -1 | 1): Tier {
  const i = TIERS.indexOf(tier) + direction;
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, i))]!;
}

/** detect-gpu tiers: 0 = blocklisted or too slow (2D), 1 low, 2 medium, 3 high. */
export function tierFromGpu(gpuTier: number): Tier | null {
  if (gpuTier <= 0) return null;
  if (gpuTier === 1) return 'low';
  if (gpuTier === 2) return 'medium';
  return 'high';
}

export function scaledCount(base: number, tier: Tier): number {
  return Math.max(1, Math.round(base * TIER_SETTINGS[tier].particles));
}
