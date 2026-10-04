import { Quaternion, Vector3 } from 'three';
import type { ObservationEvent, PropagationModel } from './models';

export interface SignalPacket {
  sequence: number;
  sent: number;
  sentProper: number;
  relayArrival: number;
  returnStart: number;
  received: number | null;
  receivedProper: number | null;
  outboundDelay: number | null;
  receivedFrequency: number | null;
  phase: 'outbound' | 'relay' | 'inbound' | 'received';
}
/** One pulse in flight. Return arrival is solved against the moving receiver, not pre-scheduled. */
export class SignalExperiment {
  packet: SignalPacket | null = null;
  private sequence = 0;
  private readonly point = new Vector3();
  constructor(readonly beacon: Vector3, readonly propagation: PropagationModel, private readonly relayDelay: number, private readonly emit: (event: ObservationEvent) => void = () => {}) {}
  get busy(): boolean { return this.packet !== null && this.packet.phase !== 'received'; }
  transmit(time: number, proper: number, position: Vector3): boolean {
    if (this.busy) return false;
    const arrival = time + this.propagation.travelTime(position, this.beacon);
    this.packet = { sequence: ++this.sequence, sent: time, sentProper: proper, relayArrival: arrival, returnStart: arrival + this.relayDelay, received: null, receivedProper: null, phase: 'outbound', outboundDelay: this.propagation.flatTravelTime ? arrival-time-this.propagation.flatTravelTime(position,this.beacon) : null, receivedFrequency: null };
    this.emit({ type: 'transmitted', sequence: this.sequence, referenceTime: time });
    return true;
  }
  update(fromTime: number, time: number, fromPosition: Vector3, position: Vector3, fromProper: number, proper: number): void {
    const p = this.packet;
    if (!p || !this.busy || time <= fromTime) return;
    if (p.phase === 'outbound' && time >= p.relayArrival) {
      p.phase = 'relay';
      this.emit({ type: 'relay-received', sequence: p.sequence, referenceTime: p.relayArrival });
    }
    if (p.phase === 'relay' && time >= p.returnStart) {
      p.phase = 'inbound';
      this.emit({ type: 'relay-replied', sequence: p.sequence, referenceTime: p.returnStart });
    }
    const reached = (t: number) => {
      this.point.lerpVectors(fromPosition, position, Math.max(0, Math.min(1, (t - fromTime) / (time - fromTime))));
      return t - p.returnStart >= this.propagation.travelTime(this.beacon, this.point);
    };
    if (p.phase === 'inbound' && reached(time)) {
      let low = Math.max(fromTime, p.returnStart), high = time;
      for (let i = 0; i < 36; i++) { const mid = (low + high) / 2; if (reached(mid)) high = mid; else low = mid; }
      p.received = high;
      p.receivedProper = fromProper + (proper - fromProper) * ((high - fromTime) / (time - fromTime));
      if(this.propagation.frequencyRatio){
        this.point.lerpVectors(fromPosition,position,(high-fromTime)/(time-fromTime));
        const velocity=position.clone().sub(fromPosition).divideScalar(time-fromTime);
        p.receivedFrequency=this.propagation.frequencyRatio(this.beacon,{position:this.point,velocity,orientation:new Quaternion()});
      }
      p.phase = 'received';
      this.emit({ type: 'received', sequence: p.sequence, referenceTime: high });
    }
  }
  progress(time: number, position: Vector3): number {
    const p = this.packet;
    if (!p) return 0;
    if (p.phase === 'received') return 1;
    if (p.phase === 'outbound') return 0.45 * Math.min(1, (time - p.sent) / Math.max(0.0001, p.relayArrival - p.sent));
    if (p.phase === 'relay') return 0.45 + 0.1 * (time - p.relayArrival) / this.relayDelay;
    return 0.55 + 0.45 * Math.min(1, (time - p.returnStart) / Math.max(0.0001, this.propagation.travelTime(this.beacon, position)));
  }
}
