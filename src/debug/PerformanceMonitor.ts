export interface PerformanceSnapshot { fps: number; mean: number; p95: number; cpu: number }

/** RAF intervals and CPU update + submission time; neither is a GPU timer. */
export class PerformanceMonitor {
  private previous: number | null = null;
  private readonly intervals: number[] = [];
  private readonly costs: number[] = [];
  private cursor = 0;
  reset(): void { this.previous = null; this.intervals.length = 0; this.costs.length = 0; this.cursor = 0; }
  record(now: number, cpu: number): void {
    if (this.previous !== null) {
      const interval = now - this.previous;
      if (interval > 0) {
        this.intervals[this.cursor] = interval;
        this.costs[this.cursor] = cpu;
        this.cursor = (this.cursor + 1) % 120;
      }
    }
    this.previous = now;
  }
  snapshot(): PerformanceSnapshot | null {
    if (!this.intervals.length) return null;
    const mean = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
    const sorted = [...this.intervals].sort((a, b) => a - b);
    return { fps: 1000 / mean, mean, p95: sorted[Math.ceil(sorted.length * 0.95) - 1], cpu: this.costs.reduce((a, b) => a + b, 0) / this.costs.length };
  }
}
