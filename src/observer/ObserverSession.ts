import { Quaternion, Vector3 } from 'three';
import type { ObserverState } from '../core/contracts';
import type { ClockModel, ObservationEvent } from './models';
import { SignalExperiment } from './SignalExperiment';

/** Session time excludes hidden-tab time. Events are data hooks for future narrative/signal consumers. */
export class ObserverSession {
  referenceTime = 0;
  properTime = 0;
  rate = 1;
  readonly events: ObservationEvent[] = [];
  readonly state: ObserverState = { position: new Vector3(), orientation: new Quaternion(), velocity: new Vector3() };
  private initialized = false;
  constructor(private readonly clockModel: ClockModel, readonly signal: SignalExperiment) {}
  record = (event: ObservationEvent): void => {
    this.events.push(event);
    if (this.events.length > 12) this.events.shift();
  };
  update(delta: number, observer: ObserverState): void {
    if (!Number.isFinite(delta) || delta < 0) throw new Error('Session delta must be finite and non-negative');
    const rate = this.clockModel.rate(observer);
    if (!this.initialized) { this.rate = rate; this.state.position.copy(observer.position); this.initialized = true; }
    const oldTime = this.referenceTime, oldProper = this.properTime;
    this.referenceTime += delta;
    this.properTime += delta * (this.rate + rate) / 2;
    this.signal.update(oldTime, this.referenceTime, this.state.position, observer.position, oldProper, this.properTime);
    this.rate = rate;
    this.state.position.copy(observer.position);
    this.state.orientation.copy(observer.orientation);
    this.state.velocity.copy(observer.velocity);
  }
  transmit(): boolean { return this.signal.transmit(this.referenceTime, this.properTime, this.state.position); }
}
