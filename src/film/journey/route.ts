import { radiusAt } from '../model';
export type Vec3 = readonly [number, number, number];
export type JourneyNodeId = 'earth' | 'solar' | 'galactic' | 'nebula' | 'binary' | 'pulsar' | 'target' | 'blackhole' | 'horizon' | 'lastEcho' | 'art' | 'credits';
export const JOURNEY_NODES = [
  { id: 'earth', start: 0, end: 32 }, { id: 'solar', start: 32, end: 57 },
  { id: 'galactic', start: 57, end: 76 }, { id: 'nebula', start: 76, end: 94 },
  { id: 'binary', start: 94, end: 110 }, { id: 'pulsar', start: 110, end: 126 },
  { id: 'target', start: 126, end: 144 }, { id: 'blackhole', start: 144, end: 291 },
  { id: 'horizon', start: 291, end: 304 }, { id: 'lastEcho', start: 304, end: 334 },
  { id: 'art', start: 334, end: 390 }, { id: 'credits', start: 390, end: 426 },
] as const;
export const BH_CENTER: Vec3 = [0, 0, -2500];
const norm = Math.hypot(.18, .34, .923);
export const RADIAL: Vec3 = [.18 / norm, .34 / norm, .923 / norm];
export const ease = (x: number) => { const p = Math.max(0, Math.min(1, x)); return p * p * p * (10 + p * (-15 + 6 * p)); };
const edge = (a: number, b: number, t: number) => ease((t - a) / (b - a));
type Key = { t: number; p: Vec3; look: Vec3; fov: number };
const far: Vec3 = RADIAL.map((v, i) => v * 84 * 8 + BH_CENTER[i]) as unknown as Vec3;
const KEYS: Key[] = [
  { t: 0, p: [0, 1.07, .25], look: [0, .86, -1.6], fov: 58 },
  { t: 8, p: [0, 1.8, 1.6], look: [0, .25, 0], fov: 55 },
  { t: 28, p: [.65, 2, 5], look: [0, .1, 0], fov: 52 },
  { t: 48, p: [4, 10, 35], look: [-14, 0, 8], fov: 52 },
  { t: 66, p: [25, 30, 120], look: [-90, 20, -700], fov: 56 },
  { t: 76, p: [20, 15, 20], look: [0, 0, -400], fov: 58 },
  { t: 85, p: [5, 10, -280], look: [0, 0, -400], fov: 56 },
  { t: 92, p: [9, 12, -410], look: [30, 0, -730], fov: 56 },
  { t: 98, p: [20, 8, -800], look: [50, 0, -1080], fov: 54 },
  { t: 104, p: [24, 6, -1030], look: [50, 0, -1080], fov: 54 },
  { t: 110, p: [60, 115, -1410], look: [80, 140, -1820], fov: 56 },
  { t: 118, p: [90, 190, -1690], look: [80, 140, -1820], fov: 55 },
  { t: 126, p: far, look: BH_CENTER, fov: 52 },
];
const REST = new Set([0,85,104,118,126]);
function tangent(i:number,track:'p'|'look'):Vec3 {
 if(REST.has(KEYS[i].t)||i===0||i===KEYS.length-1)return [0,0,0];
 const prev=KEYS[i-1],next=KEYS[i+1];
 return next[track].map((v,j)=>(v-prev[track][j])/(next.t-prev.t)*.55) as unknown as Vec3;
}
function hermite(a:Vec3,b:Vec3,ma:Vec3,mb:Vec3,x:number,h:number):Vec3 {
 return a.map((v,j)=>(2*x*x*x-3*x*x+1)*v+(x*x*x-2*x*x+x)*h*ma[j]+(-2*x*x*x+3*x*x)*b[j]+(x*x*x-x*x)*h*mb[j]) as unknown as Vec3;
}
export function journeyPose(t: number) {
 const at=Math.max(0,Math.min(126,t));let i=0;while(i<KEYS.length-2&&at>KEYS[i+1].t)i++;
 const a=KEYS[i],b=KEYS[i+1],h=b.t-a.t,x=(at-a.t)/h,p=ease(x),ma=tangent(i,'p'),mb=tangent(i+1,'p');
 const base=hermite(a.p,b.p,ma,mb,x,h),span=Math.hypot(...b.p.map((v,j)=>v-a.p[j]));
 const drift=Math.sin(Math.PI*x)**2*Math.min(span*.004,.9)*(1-edge(118,126,t));
 const position:Vec3=[base[0]+drift*.62,base[1]+drift*.24,base[2]+drift*.13];
 const target=hermite(a.look,b.look,tangent(i,'look'),tangent(i+1,'look'),x,h);
 const speed=Math.hypot(...a.p.map((v,j)=>((6*x*x-6*x)*v+(3*x*x-4*x+1)*h*ma[j]+(-6*x*x+6*x)*b.p[j]+(3*x*x-2*x)*h*mb[j])/h));
 return {position,target,fov:a.fov+(b.fov-a.fov)*p,transit:Math.min(1,speed/65)*edge(55,76,t)*(1-edge(118,130,t))};
}
const arrivalSlope=(radiusAt(.001)-32)/.001*60/34;
export const acquisitionRadius=(t:number)=>{const x=Math.max(0,Math.min(1,(t-126)/18));return (2*x*x*x-3*x*x+1)*84+(-2*x*x*x+3*x*x)*32+(x*x*x-x*x)*18*arrivalSlope;};
export const nodeAt = (t: number) => JOURNEY_NODES.find(n => t >= n.start && t < n.end) ?? JOURNEY_NODES.at(-1)!;
export const JOURNEY_CUES = [
  { t: 78, id: 'nebula:observe' }, { t: 93, id: 'nebula:depart' },
  { t: 99, id: 'binary:observe' }, { t: 109, id: 'binary:depart' },
  { t: 114, id: 'pulsar:observe' }, { t: 124, id: 'target:acquire' },
  { t: 150, id: 'disruption:observe' }, { t: 291, id: 'horizon:cross' },
] as const;
export class JourneyController {
  time = 0; playing = true; rate = 1;
  setRate(rate:number) { if(Number.isFinite(rate)&&rate>=0&&rate<=4)this.rate=rate; }
  private readonly listeners = new Set<(cue: typeof JOURNEY_CUES[number]) => void>();
  constructor(private readonly duration: number,private readonly offset=0) {}
  seek(t: number) { if (Number.isFinite(t)) this.time = Math.max(0, Math.min(this.duration, t)); }
  navigate(id: JourneyNodeId, play = false) { const node = JOURNEY_NODES.find(n => n.id === id); if (!node) return; this.seek(node.start+this.offset); this.playing = play; }
  hold() { this.playing = false; }
  replay(id: JourneyNodeId) { this.navigate(id, true); }
  onCue(fn: (cue: typeof JOURNEY_CUES[number]) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  advance(dt: number) { if (!this.playing || !Number.isFinite(dt) || dt <= 0) return; const before = this.time; this.seek(this.time + dt*this.rate); for (const cue of JOURNEY_CUES) if (cue.t+this.offset > before && cue.t+this.offset <= this.time) this.listeners.forEach(fn => fn(cue)); if (this.time === this.duration) this.hold(); }
}


