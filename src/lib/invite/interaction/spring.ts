/**
 * A damped spring, stepped with small fixed sub-steps so it stays stable at any frame rate.
 * Used for tilt, the segmented control indicator and anything that should feel physical.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    initial = 0,
    public stiffness = 120,
    public damping = 14,
  ) {
    this.value = initial;
    this.target = initial;
  }

  step(dt: number): number {
    let remaining = Math.min(dt, 0.1); // a long pause shouldn't fling the value
    while (remaining > 0) {
      const h = Math.min(remaining, 1 / 240);
      const force = this.stiffness * (this.target - this.value) - this.damping * this.velocity;
      this.velocity += force * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    return this.value;
  }

  get settled(): boolean {
    return Math.abs(this.target - this.value) < 1e-3 && Math.abs(this.velocity) < 1e-3;
  }
}
