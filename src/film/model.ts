/** Schwarzschild in ingoing Painleve-Gullstrand coordinates, Rs=c=1.
 * T is proper time along the E=1 radial infaller. Film seconds reparameterize T.
 */
export const FILM_DURATION = 300;
export const MODEL_END = 244;
export const ART_START = 248;
export const RELAY_R = 36;
export const START_R = 32;
const KEYS = [[0,32],[40,23],[80,11],[120,4],[160,1.65],[190,1.08],[200,1],[220,.67],[244,.25]];
const P = KEYS.map(([t,r])=>[t, r ** 1.5]);
const slopes=P.slice(0,-1).map((p,i)=>(P[i+1][1]-p[1])/(P[i+1][0]-p[0]));
const tangents=P.map((_,i)=>i===0?slopes[0]:i===P.length-1?slopes[i-1]:2/(1/slopes[i-1]+1/slopes[i]));
export function radiusAt(seconds:number):number {
 const t=Math.max(0,Math.min(MODEL_END,seconds));
 let i=0;while(i<P.length-2&&t>P[i+1][0])i++;
 const [a,x]=P[i],[b,y]=P[i+1],h=b-a,s=(t-a)/h;
 return Math.pow((2*s**3-3*s*s+1)*x+(s**3-2*s*s+s)*h*tangents[i]+(-2*s**3+3*s*s)*y+(s**3-s*s)*h*tangents[i+1],2/3);
}
export const properAtRadius=(r:number)=>2/3*(START_R**1.5-r**1.5);
export const properAt=(t:number)=>properAtRadius(radiusAt(t));
export const radiusAtProper=(tau:number)=>Math.max(0,START_R**1.5-1.5*tau)**(2/3);
export const outgoingPrimitive=(r:number)=>r+2*Math.sqrt(r)+2*Math.log(Math.abs(Math.sqrt(r)-1));
export const incomingPrimitive=(r:number)=>r-2*Math.sqrt(r)+2*Math.log(Math.sqrt(r)+1);
export const nullSpeeds=(r:number)=>({outward:1-1/Math.sqrt(r),inward:-1-1/Math.sqrt(r)});
export const outgoingRelayFrequency=(r:number)=>r>1?(1-1/Math.sqrt(r))/Math.sqrt(1-1/RELAY_R):0;
export interface Echo { id:number; sent:number; radius:number; relay:number|null; reply:number|null; received:number|null; frequency:number; }
export function makeEcho(id:number,sent:number):Echo {
 const r=radiusAtProper(sent);
 if(r<=1)return{id,sent,radius:r,relay:null,reply:null,received:null,frequency:0};
 const relay=sent+outgoingPrimitive(RELAY_R)-outgoingPrimitive(r);
 const reply=relay+.12/Math.sqrt(1-1/RELAY_R);
 const residual=(tau:number)=>tau-reply-incomingPrimitive(RELAY_R)+incomingPrimitive(radiusAtProper(tau));
 const end=properAtRadius(0);
 let received:number|null=null;
 if(residual(end)>0){let lo=sent,hi=end;for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(residual(mid)>0)hi=mid;else lo=mid;}received=(lo+hi)/2;}
 return{id,sent,radius:r,relay,reply,received,frequency:outgoingRelayFrequency(r)};
}
// Mission schedule: tune the final acknowledged transmission to reach the observer after crossing.
// This sets a transmission time, not an invented reception event; makeEcho solves the return ray.
function finalTransmission():number {
 const target=properAt(213);
 const f=(sent:number)=>{const r=radiusAtProper(sent);return sent+outgoingPrimitive(RELAY_R)-outgoingPrimitive(r)+.12/Math.sqrt(1-1/RELAY_R)+incomingPrimitive(RELAY_R)-incomingPrimitive(radiusAtProper(target))-target;};
 let lo=0,hi=properAt(199);for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid;}return(lo+hi)/2;
}
const last=finalTransmission();
export const ECHOES=[0,last*.27,last*.55,last*.8,last,properAt(170),properAt(193),properAt(204)].map((t,i)=>makeEcho(i+1,t));
export function filmState(t:number){
 const r=radiusAt(t),tau=properAt(t);
 const emitted=ECHOES.filter(p=>p.sent<=tau+1e-9);
 const received=emitted.filter(p=>p.received!==null&&p.received<=tau+1e-9);
 return{r,tau,inside:r<1,art:t>=ART_START,latest:emitted.at(-1),echo:received.at(-1),received:received.length,emitted:emitted.length,cone:nullSpeeds(r)};
}
