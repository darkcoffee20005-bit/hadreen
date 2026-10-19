import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merge any mix of geometries into one (positions + normals only), disposing the parts. */
export function mergeAll(parts: BufferGeometry[]): BufferGeometry {
  const clean = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    return g;
  });
  const merged = mergeGeometries(clean, false)!;
  parts.forEach((p) => p.dispose());
  clean.forEach((p) => p.dispose());
  return merged;
}
