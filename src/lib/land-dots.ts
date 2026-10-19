/**
 * Land dots for globes. A Fibonacci lattice covers the sphere evenly; a precomputed bitset
 * (scripts/land-dots.ts, Natural Earth land) marks which lattice points are on land. One lattice
 * per quality tier, so phones draw fewer dots.
 *
 * Orientation shared by every globe: latitude up the +Y axis, longitude 0 facing +Z, east to +X.
 */
export const LAND_LATTICE = { high: 40_000, medium: 20_000, low: 10_000 } as const;
export type LandTier = keyof typeof LAND_LATTICE;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** The i-th of n lattice points, in degrees. */
export function latticePoint(i: number, n: number): { lat: number; lon: number } {
  const y = 1 - (2 * (i + 0.5)) / n;
  const lat = (Math.asin(y) * 180) / Math.PI;
  let lon = ((i * GOLDEN_ANGLE * 180) / Math.PI) % 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/** Unit-sphere position for a latitude/longitude in degrees. */
export function latLonToVec3(lat: number, lon: number, radius = 1): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [radius * Math.cos(φ) * Math.sin(λ), radius * Math.sin(φ), radius * Math.cos(φ) * Math.cos(λ)];
}

function decode(base64: string): Uint8Array {
  if (typeof atob === 'function') return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/** Land dots as a flat xyz array on a sphere of `radius`, plus their latitudes/longitudes. */
export function landDots(bits: string, tier: LandTier, radius = 1): { positions: Float32Array; latLon: Float32Array } {
  const n = LAND_LATTICE[tier];
  const set = decode(bits);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) if (set[i >> 3]! & (1 << (i & 7))) idx.push(i);
  const positions = new Float32Array(idx.length * 3);
  const latLon = new Float32Array(idx.length * 2);
  idx.forEach((i, k) => {
    const { lat, lon } = latticePoint(i, n);
    const [x, y, z] = latLonToVec3(lat, lon, radius);
    positions.set([x, y, z], k * 3);
    latLon.set([lat, lon], k * 2);
  });
  return { positions, latLon };
}
