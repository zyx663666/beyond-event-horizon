import { Vector3 } from 'three';
import type { ObserverState } from '../core/contracts';
/** Shared static exterior model. A horizon-regular chart must replace this at crossing. */
export class SchwarzschildSpacetime {
  readonly label = 'Schwarzschild / prescribed observer';
  rate(observer: ObserverState): number { return this.properRate(observer); }
  readonly chart = 'Schwarzschild exterior';
  constructor(readonly rs: number, readonly c: number) {
    if (!(rs > 0 && c > 0 && Number.isFinite(rs+c))) throw new Error('Invalid spacetime scale');
  }
  lapse(radius: number): number {
    const f = 1-this.rs/radius;
    if (!(f>0 && Number.isFinite(f))) throw new Error('Static chart requires r > Rs');
    return f;
  }
  localBeta(observer: ObserverState, result = new Vector3()): Vector3 {
    const r=observer.position.length(),f=this.lapse(r),outward=observer.position.clone().divideScalar(r);
    const vr=observer.velocity.dot(outward);
    result.copy(observer.velocity).addScaledVector(outward,-vr).divideScalar(this.c*Math.sqrt(f)).addScaledVector(outward,vr/(this.c*f));
    if(!Number.isFinite(result.lengthSq()) || result.lengthSq()>=1)throw new Error('Observer is not timelike');
    return result;
  }
  properRate(observer: ObserverState): number { return Math.sqrt(this.lapse(observer.position.length())*(1-this.localBeta(observer).lengthSq())); }
  circularBeta(radius: number): number {
    if(radius<3*this.rs)throw new Error('Stable thin-disk orbit requires r >= 3 Rs');
    return Math.sqrt(this.rs/(2*(radius-this.rs)));
  }
  /** sight points toward the source; boost maps camera-rest rays to static-local rays. */
  aberrate(sight: Vector3, beta: Vector3, inverse=false): Vector3 {
    const b=inverse?beta.clone().negate():beta, b2=b.lengthSq();
    if(b2<1e-12)return sight.clone();
    const gamma=1/Math.sqrt(1-b2),dot=b.dot(sight);
    return sight.clone().addScaledVector(b,(gamma-1)*dot/b2-gamma).divideScalar(gamma*(1-dot)).normalize();
  }
  receiverFactor(staticSight: Vector3, beta: Vector3): number { return (1+beta.dot(staticSight))/Math.sqrt(1-beta.lengthSq()); }
}
