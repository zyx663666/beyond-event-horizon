import { ANNOTATIONS } from '../content/annotations';

/** A bounded editorial warp, not a change to physical units or travelled distance.
 * Endpoint position and velocity are unchanged. The center runs at 0.55x;
 * neighbouring footage recovers the time, preserving every chapter landmark.
 */
export function preludeTime(t:number):number {
 for(const a of ANNOTATIONS){
  if(a.start>=126)break;
  const start=a.start-1,end=a.end+1;
  if(t>start&&t<end){const x=(t-start)/(end-start);return t+.45*(end-start)/(2*Math.PI)*Math.sin(2*Math.PI*x)*Math.sin(Math.PI*x)**2;}
 }
 return t;
}
export const preludeRate=(t:number)=>(preludeTime(t+.001)-preludeTime(t-.001))/.002;
export const CREDITS_DURATION=36;
export const INTRO_DURATION=36;
export const EXPERIENCE_DURATION=INTRO_DURATION+390+CREDITS_DURATION;
export function creditStage(t:number){
 const x=t-390;
 return x<0?'none':x<6?'complete':x<14?'message':x<29?'authors':x<34?'closed':'black';
}
export function relayState(t:number,r:number,received:number){
 if(t>=304&&t<310&&received>=5)return 'lastAck';
 if(r<=1)return 'noPath';
 return t>=230?'delayed':'active';
}
export const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
