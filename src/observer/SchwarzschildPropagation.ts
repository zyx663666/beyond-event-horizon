import { Vector3 } from 'three';
import type { ObserverState } from '../core/contracts';
import type { PropagationModel } from './models';
import { connectRadii } from '../lensing/connection';
import type { SchwarzschildSpacetime } from './SchwarzschildSpacetime';
export class SchwarzschildPropagation implements PropagationModel {
  readonly label='Schwarzschild / primary null connection';
  constructor(readonly spacetime: SchwarzschildSpacetime) {}
  connection(from:Vector3,to:Vector3) {
    const rA=from.length(),rB=to.length(),angle=Math.acos(Math.max(-1,Math.min(1,from.dot(to)/(rA*rB))));
    const path=connectRadii(rA/this.spacetime.rs,rB/this.spacetime.rs,angle);
    return {...path,time:path.time*this.spacetime.rs/this.spacetime.c,impact:path.impact*this.spacetime.rs,pericenter:path.pericenter===null?null:path.pericenter*this.spacetime.rs};
  }
  flatTravelTime(from:Vector3,to:Vector3):number{return from.distanceTo(to)/this.spacetime.c;}
  frequencyRatio(from:Vector3,receiver:ObserverState):number {
    return Math.sqrt(this.spacetime.lapse(from.length())/this.spacetime.lapse(receiver.position.length()))*this.spacetime.receiverFactor(this.incomingSight(from,receiver.position),this.spacetime.localBeta(receiver));
  }
  travelTime(from:Vector3,to:Vector3):number { return this.connection(from,to).time; }
  /** Incoming sight in the static receiver tetrad, used for a received frequency readout. */
  incomingSight(from:Vector3,to:Vector3):Vector3 {
    const path=this.connection(from,to),outward=to.clone().normalize();
    const tangent=from.clone().addScaledVector(outward,-from.dot(outward)).normalize();
    const sin=path.impact*Math.sqrt(this.spacetime.lapse(to.length()))/to.length();
    const radial=path.turning||to.length()>from.length()?-Math.sqrt(Math.max(0,1-sin*sin)):Math.sqrt(Math.max(0,1-sin*sin));
    return outward.multiplyScalar(radial).addScaledVector(tangent,sin).normalize();
  }
}
