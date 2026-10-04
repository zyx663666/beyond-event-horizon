import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
function load(file){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','exports','module',code)(name=>load(path.resolve(path.dirname(file),name+'.ts')),m.exports,m);return m.exports;}
const {FilmAudio}=load(path.resolve('src/audio/FilmAudio.ts'));
const {JourneyController,JOURNEY_CUES}=load(path.resolve('src/film/journey/route.ts'));
const {DRIVE_LEVELS}=load(path.resolve('src/content/flight.ts'));
const {cutState}=load(path.resolve('src/film/timeline.ts'));
const {creditStage}=load(path.resolve('src/experience/presentation.ts'));
const config=JSON.parse(fs.readFileSync('src/content/audio.config.json'));
class Media extends EventTarget {
 currentTime=0;duration=462;paused=true;seeking=false;volume=1;playbackRate=1;preservesPitch=false;plays=0;rejection=null;
 play(){this.plays++;if(this.rejection)return Promise.reject(this.rejection);this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}removeAttribute(){}load(){}remove(){}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('direct entry never autoplays, missing score is not fetched, gesture unlocks',async()=>{
 const missing=new Media(),a=new FilmAudio(config,null,462,426,missing);a.enableFromGesture();a.update(30,true,1,true);assert.equal(missing.plays,0);assert.equal(a.state,'missing');
 const m=new Media(),b=new FilmAudio(config,'score.mp3',462,426,m);b.update(40,true,1,true);assert.equal(m.plays,0);assert.equal(b.state,'muted');b.enableFromGesture();await flush();b.update(40,true,1,true);assert.equal(b.state,'online');assert.equal(m.currentTime,40);assert.equal(m.preservesPitch,true);
 b.toggleFromGesture();assert.equal(m.paused,true);b.update(100,true,1,true);assert.equal(b.state,'muted');b.dispose();
});
test('pause, context/visibility suspension, seek, rates and replay share film time',async()=>{
 const m=new Media(),a=new FilmAudio(config,'score.mp3',462,426,m);a.update(100,true,1,true);a.enableFromGesture();await flush();
 for(const rate of [.55,1,1.75,4]){a.update(220,true,rate,true,true);assert.equal(m.currentTime,220);assert.equal(m.playbackRate,rate);assert.equal(m.paused,false);}
 assert.ok(m.volume<config.volume*.3);a.update(220,false,4,true);assert.equal(m.paused,true);a.update(220.01,false,4,true,true);assert.equal(m.currentTime,220.01);
 a.update(221,true,1,false);assert.equal(m.paused,true);a.update(221,true,1,true);await flush();assert.equal(m.paused,false);
 a.update(0,true,1,true,true);assert.equal(m.currentTime,0);assert.equal(m.volume,0);a.update(462,false,1,true);assert.equal(m.paused,true);a.dispose();
});
test('autoplay rejection needs another gesture, not an endless retry',async()=>{
 const m=new Media(),a=new FilmAudio(config,'score.mp3',462,426,m);m.rejection={name:'NotAllowedError'};a.update(50,true,1,true);a.enableFromGesture();await flush();assert.equal(a.state,'blocked');
 for(let i=0;i<100;i++)a.update(50+i*.02,true,1,true);assert.equal(m.plays,1);m.rejection=null;a.enableFromGesture();await flush();assert.equal(a.state,'online');a.dispose();
});
test('late play resolution cannot restart a muted or disposed media element',async()=>{
 const m=new Media();let resolve;m.play=()=>new Promise(r=>resolve=r);const a=new FilmAudio(config,'score.mp3',462,426,m);a.update(50,true,1,true);a.enableFromGesture();a.toggleFromGesture();m.paused=false;resolve();await flush();assert.equal(m.paused,true);a.dispose();
});
test('short scores stop, optional looping and offset follow the film clock',async()=>{
 const m=new Media();m.duration=20;const a=new FilmAudio({...config,offsetSeconds:10,loop:true},'score.mp3',462,426,m);a.update(5,true,1,true);a.enableFromGesture();await flush();a.update(5,true,1,true);assert.equal(m.paused,true);a.update(35,true,1,true);await flush();assert.equal(m.currentTime,5);assert.equal(m.paused,false);a.dispose();
 const b=new FilmAudio(config,'score.mp3',462,426,new Media());b.element.duration=10;b.enableFromGesture();await flush();b.update(11,true,1,true);assert.equal(b.state,'ended');assert.equal(b.element.paused,true);b.dispose();
});
test('all drive levels preserve full journey cue order and causal landmarks',()=>{
 for(const level of DRIVE_LEVELS){const c=new JourneyController(462,36),cues=[];c.setRate(level.rate);c.onCue(cue=>cues.push(cue.id));if(level.rate===0){c.advance(999);assert.equal(c.time,0);continue;}
  for(let wall=0;c.playing&&wall<10000;wall++)c.advance(.2);
  assert.equal(c.time,462);assert.deepEqual(cues,JOURNEY_CUES.map(c=>c.id));
  c.seek(327);assert.equal(cutState(c.time-36).r,1);c.seek(341);assert.equal(cutState(c.time-36).received,5);c.seek(446);assert.equal(creditStage(c.time-36),'authors');
 }
});
test('negative and non-finite drive inputs cannot reverse causality',()=>{
 const c=new JourneyController(462);for(const rate of [-1,Infinity,NaN,10])c.setRate(rate);assert.equal(c.rate,1);c.advance(20);c.hold();c.advance(999);assert.equal(c.time,20);
});
