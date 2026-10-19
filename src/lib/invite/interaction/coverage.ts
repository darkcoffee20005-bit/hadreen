/**
 * Coarse coverage tracking for scratch surfaces: marks grid cells touched by a round brush.
 * Cheaper and steadier than reading pixels back from a canvas or render target.
 */
export class Coverage {
  private cells: Uint8Array;
  private hits = 0;

  constructor(
    private cols = 24,
    private rows = 12,
  ) {
    this.cells = new Uint8Array(cols * rows);
  }

  /** u, v and radius in 0..1 of the surface (radius relative to width). */
  paint(u: number, v: number, radius: number, aspect = 2) {
    const rCols = radius * this.cols;
    const rRows = radius * aspect * this.rows;
    const cx = u * this.cols;
    const cy = v * this.rows;
    for (let y = Math.floor(cy - rRows); y <= Math.ceil(cy + rRows); y++) {
      for (let x = Math.floor(cx - rCols); x <= Math.ceil(cx + rCols); x++) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
        const dx = (x + 0.5 - cx) / rCols;
        const dy = (y + 0.5 - cy) / rRows;
        if (dx * dx + dy * dy > 1) continue;
        const i = y * this.cols + x;
        if (!this.cells[i]) {
          this.cells[i] = 1;
          this.hits += 1;
        }
      }
    }
  }

  get ratio(): number {
    return this.hits / this.cells.length;
  }

  reset() {
    this.cells.fill(0);
    this.hits = 0;
  }
}
