import type { FrameState } from './contracts';

/** Explicit elapsed time; hidden tabs do not advance the experiment. */
export class FrameClock {
  private previous: number | null = null;
  private elapsed = 0;
  constructor(private readonly frozenTime: number | null = null) {}

  tick(now: number): FrameState {
    const delta = this.previous === null ? 0 : Math.max(0, (now - this.previous) / 1000);
    this.previous = now;
    if (this.frozenTime !== null) return { elapsed: this.frozenTime, delta: 0 };
    this.elapsed += delta;
    return { elapsed: this.elapsed, delta };
  }
  suspend(): void { this.previous = null; }
}
