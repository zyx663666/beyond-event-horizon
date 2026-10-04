import type { Vector3 } from 'three';
import type { ObserverState } from '../core/contracts';

export interface ClockModel { readonly label: string; rate(observer: ObserverState): number }
export interface PropagationModel { readonly label: string; travelTime(from: Vector3, to: Vector3): number; flatTravelTime?(from: Vector3, to: Vector3): number; incomingSight?(from: Vector3, to: Vector3): Vector3; frequencyRatio?(from: Vector3, receiver: ObserverState): number }
export type ObservationEventType = 'transmitted' | 'relay-received' | 'relay-replied' | 'received';
export interface ObservationEvent { type: ObservationEventType; sequence: number; referenceTime: number }

/** Evaluate proper-time rate along a prescribed timelike path in Schwarzschild coordinates.
 * XYZ represents areal-radius spherical coordinates, not a Euclidean physical ruler.
 * The path is directed/accelerated, not a geodesic. Visual shadow radius is independent.
 */
export class SchwarzschildClock implements ClockModel {
  readonly label = 'Schwarzschild / prescribed path';
  constructor(private readonly rs: number, private readonly c: number) {
    if (!(rs > 0 && c > 0 && Number.isFinite(rs + c))) throw new Error('Invalid clock scale');
  }
  rate(observer: ObserverState): number {
    const r = observer.position.length();
    const f = 1 - this.rs / r;
    const radial = observer.velocity.dot(observer.position) / r;
    const transverse2 = Math.max(0, observer.velocity.lengthSq() - radial * radial);
    const rate2 = f - radial * radial / (this.c * this.c * f) - transverse2 / (this.c * this.c);
    if (!(f > 0 && rate2 > 0 && Number.isFinite(rate2))) throw new Error('Observer path is outside the clock model’s timelike domain');
    return Math.sqrt(rate2);
  }
}

/** Separate flat-space transport experiment. No Shapiro delay, redshift or bent rays. */
export class StraightLinePropagation implements PropagationModel {
  readonly label = 'Straight-line / constant coordinate speed';
  constructor(private readonly speed: number) {
    if (!(speed > 0 && Number.isFinite(speed))) throw new Error('Invalid signal speed');
  }
  travelTime(from: Vector3, to: Vector3): number { return from.distanceTo(to) / this.speed; }
}
