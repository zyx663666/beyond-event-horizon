export interface AudioSettings {
 volume:number; fadeIn:number; fadeOut:number; offsetSeconds:number;
 loop:boolean; highSpeedGain:number; credits:string;
}
type State='missing'|'muted'|'online'|'paused'|'blocked'|'ended'|'error';
/** The film clock is authoritative. Media never advances the scene or emits cues. */
export class FilmAudio {
 readonly element:HTMLAudioElement;
 private enabled=false;private blocked=false;private failed=false;private disposed=false;
 private pending=false;private generation=0;private source:string|null;
 private time=0;private running=false;private rate=1;private ready=false;
 private readonly metadata=()=>this.sync(true);
 private readonly failure=()=>{this.failed=true;this.element.pause();};
 constructor(private readonly config:AudioSettings,source:string|null,private readonly duration:number,private readonly creditsAt:number,media?:HTMLAudioElement){
  this.element=media??new Audio();this.source=source;
  this.element.preload='metadata';this.element.preservesPitch=true;this.element.id='film-audio';
  this.element.addEventListener('loadedmetadata',this.metadata);this.element.addEventListener('error',this.failure);
  if(source)this.element.src=source;
 }
 get state():State {
  if(!this.source)return 'missing';if(this.failed)return 'error';if(this.blocked)return 'blocked';if(!this.enabled)return 'muted';
  if(this.targetTime()===null)return 'ended';return this.running&&this.ready&&!this.element.paused?'online':'paused';
 }
 /** Must be called synchronously from a real click; no autoplay on refresh. */
 enableFromGesture(){
  if(!this.source||this.disposed)return;
  this.enabled=true;this.blocked=false;this.failed=false;
  this.element.volume=0;this.align();this.requestPlay();
 }
 toggleFromGesture(){if(this.enabled&&!this.blocked){this.enabled=false;this.stop();}else this.enableFromGesture();}
 update(time:number,playing:boolean,rate:number,ready:boolean,force=false){
  this.time=time;this.running=playing&&rate>0;this.rate=rate;this.ready=ready;this.sync(force);
 }
 private targetTime(){
  const t=Math.max(0,this.time-this.config.offsetSeconds),duration=this.element.duration;
  if(Number.isFinite(duration)&&duration>0){if(this.config.loop)return t%duration;if(t>=duration)return null;}
  return t;
 }
 private align(force=false){
  const target=this.targetTime();if(target===null)return;
  if(force||Math.abs(this.element.currentTime-target)>.16){try{this.element.currentTime=target;}catch{/* Metadata may still be loading. */}}
 }
 private sync(force=false){
  if(this.disposed||!this.source)return;
  if(force||!this.element.seeking)this.align(force);
  const rate=this.rate>0?this.rate:1;if(this.element.playbackRate!==rate)this.element.playbackRate=rate;
  const end=this.config.credits==='fade-at-credits'?this.creditsAt:this.duration;
  const fadeIn=this.config.fadeIn>0?Math.min(1,Math.max(0,(this.time-this.config.offsetSeconds)/this.config.fadeIn)):1;
  const fadeOut=this.config.fadeOut>0?Math.min(1,Math.max(0,(end-this.time)/this.config.fadeOut)):Number(this.time<end);
  const transit=1+(this.config.highSpeedGain-1)*Math.max(0,Math.min(1,(rate-1)/3));
  this.element.volume=Math.max(0,Math.min(1,this.config.volume*fadeIn*fadeOut*transit));
  if(!this.enabled||!this.running||!this.ready||this.time<this.config.offsetSeconds||this.targetTime()===null){this.stop();return;}
  if(!this.blocked&&!this.failed&&this.element.paused)this.requestPlay();
 }
 private requestPlay(){
  if(this.pending||this.disposed)return;
  this.pending=true;const token=++this.generation;
  void this.element.play().then(()=>{
   if(this.disposed||!this.enabled||!this.running||!this.ready)this.element.pause();
  }).catch((error:unknown)=>{
   if(token===this.generation&&(error as {name?:string}).name!=='AbortError')this.blocked=true;
  }).finally(()=>{if(token===this.generation)this.pending=false;});
 }
 private stop(){this.element.pause();/* Invalidate pending play results without retrying a rejected autoplay. */this.generation++;this.pending=false;}
 /** Developer harness supplies a generated tone; never included in production. */
 replaceSource(source:string){this.stop();this.source=source;this.failed=false;this.blocked=false;this.element.src=source;this.enabled=false;}
 dispose(){this.disposed=true;this.enabled=false;this.stop();this.element.removeEventListener('loadedmetadata',this.metadata);this.element.removeEventListener('error',this.failure);this.element.removeAttribute('src');this.element.load();this.element.remove();}
}
