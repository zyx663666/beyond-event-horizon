import { SCENES } from '../content/chapters';
export { SCENES } from '../content/chapters';
export { ANNOTATIONS as EXPLAINS } from '../content/annotations';
export { POETRY } from '../content/quotes';
import { filmState } from './model';
import { preludeTime } from '../experience/presentation';
export const CUT_DURATION=390;
export const ARRIVAL=144;
export const INTERPRETATION=334;
export const TARGET_LY=1200;
export const TARGET='BH–A17';
export const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export const envelope=(t:number,a:number,b:number,fade=1)=>smooth(a,a+fade,t)*(1-smooth(b-fade,b,t));
export const CUT_KEYS=[[144,0],[177,57.5],[185,62.5],[201,97.5],[209,102.5],[220,121.5],[228,126.5],[256,166.5],[264,171.5],[275,187.5],[283,192.5],[291,200],[304,213],[330,244]];
const slopes=CUT_KEYS.slice(1).map(([t,v],i)=>(v-CUT_KEYS[i][1])/(t-CUT_KEYS[i][0]));
const tangents=CUT_KEYS.map((_,i)=>i===0?60/34:i===CUT_KEYS.length-1?0:2*slopes[i-1]*slopes[i]/(slopes[i-1]+slopes[i]));
/** C1 monotone Hermite clock. Scientific observations slow down without holds.
 * Arrival, crossing, final acknowledgment and the model endpoint are fixed.
 */
export function coreTime(t:number){
 if(t<144)return 0;if(t>=330)return 244;
 let i=0;while(i<CUT_KEYS.length-2&&t>CUT_KEYS[i+1][0])i++;
 const [a,x]=CUT_KEYS[i],[b,y]=CUT_KEYS[i+1],h=b-a,p=(t-a)/h;
 return (2*p**3-3*p*p+1)*x+(p**3-2*p*p+p)*h*tangents[i]+(-2*p**3+3*p*p)*y+(p**3-p*p)*h*tangents[i+1];
}
export const coreRate=(t:number)=>(coreTime(t+.001)-coreTime(t-.001))/.002;
export function onHold(_t:number){return false;}
export function shotAt(t:number){return SCENES.find(s=>t>=s.start&&t<s.end)??SCENES.at(-1)!;}
const ARCHIVE=[[0,0,0],[34,.00001,.002],[58,.00048,.08],[82,260,1300],[106,700,3500],[126,1120,5600],[144,1200,6000]];
export function archiveAt(t:number){let i=0;while(i<ARCHIVE.length-2&&t>ARCHIVE[i+1][0])i++;const [a,d,y]=ARCHIVE[i],[b,e,z]=ARCHIVE[i+1];const p=smooth(a,b,t);const distance=d+(e-d)*p,years=y+(z-y)*p;return{distance,years,remaining:Math.max(0,TARGET_LY-distance),homeRtt:distance*2};}
export function cutState(t:number){const local=coreTime(t);return{...filmState(local),local,shot:shotAt(t),archive:archiveAt(preludeTime(t)),hold:onHold(t),art:t>=INTERPRETATION,model:t>=ARRIVAL&&t<INTERPRETATION};}




