/** Optional synthesized temp soundtrack. Never autoplays; no external audio assets. */
export class TempSound {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private drones:OscillatorNode[]=[];
 enabled=false;
 async toggle(){
  if(!this.context){
   this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
   for(const [f,v] of [[43.65,.11],[65.41,.055],[130.81,.018]]){const o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(this.master);o.start();this.drones.push(o);}
  }
  await this.context.resume();this.enabled=!this.enabled;return this.enabled;
 }
 update(t:number,playing:boolean){if(!this.context||!this.master)return;const gain=this.enabled&&playing&&t<388?(t>304?.10:t<144?.16:.24):0;this.master.gain.setTargetAtTime(gain,this.context.currentTime,1.5);}
 pulse(receive:boolean){
  if(!this.context||!this.master||!this.enabled)return;
  const o=this.context.createOscillator(),g=this.context.createGain(),n=this.context.currentTime;
  o.frequency.value=receive?523.25:261.63;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.22,n+.012);g.gain.exponentialRampToValueAtTime(.0001,n+(receive?1.2:.35));
  o.connect(g);g.connect(this.master);o.start();o.stop(n+1.3);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 /** Low-level cues are optional and share the user-activated audio context. */
 cue(kind:'boot'|'lock'|'annotation'|'received'|'relay'|'slowdown'|'resume'|'horizon'|'no-reply'){
  if(!this.context||!this.master||!this.enabled)return;
  const notes={boot:[196,294],lock:[392,440],annotation:[330,330],received:[523,523],relay:[294,392],slowdown:[220,164],resume:[164,220],horizon:[110,98],'no-reply':[146,110]}[kind];
  const n=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();
  o.type='sine';o.frequency.setValueAtTime(notes[0],n);o.frequency.exponentialRampToValueAtTime(notes[1],n+.4);
  g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.07,n+.025);g.gain.exponentialRampToValueAtTime(.0001,n+.65);
  o.connect(g);g.connect(this.master);o.start();o.stop(n+.7);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 dispose(){this.drones.forEach(o=>o.stop());void this.context?.close();}
}

