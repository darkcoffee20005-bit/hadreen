/** Sample points on a 5×5 grid inside the canvas, as [x, y] in drawing-buffer pixels. */
export function samplePoints(width: number, height: number, n = 5): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      points.push([Math.floor(((i + 0.5) / n) * width), Math.floor(((j + 0.5) / n) * height)]);
    }
  }
  return points;
}

/**
 * A frame is "black" when most of the samples are: every template's gate has a lit backdrop, so a
 * mostly black gate means the driver failed to render it (post-processing targets on some GPUs).
 * The median ignores a few lit pixels (particles, edges) that survive such failures.
 */
export function isBlackFrame(luma: number[], threshold = 8): boolean {
  if (luma.length === 0) return false;
  const sorted = [...luma].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]! < threshold;
}
