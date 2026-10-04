import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
function load(file){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','exports','module',code)(name=>load(path.resolve(path.dirname(file),name+'.ts')),m.exports,m);return m.exports;}
const route=load(path.resolve('src/film/journey/route.ts'));
const timeline=load(path.resolve('src/film/timeline.ts'));
const model=load(path.resolve('src/film/model.ts'));
const length=a=>Math.hypot(...a),diff=(a,b)=>a.map((v,i)=>v-b[i]);
test('the cinematic route is deterministic, finite and smooth through every camera waypoint',()=>{
 for(let t=0;t<=126;t+=.1){const p=route.journeyPose(t);assert.ok([...p.position,...p.target,p.fov,p.transit].every(Number.isFinite));assert.ok(length(diff(p.target,p.position))>.1);assert.ok(p.fov>=45&&p.fov<=60);assert.deepEqual(route.journeyPose(t),p);}
 for(const t of [8,28,48,66,76,85,92,98,104,110,118,126]){const a=route.journeyPose(t-.0001),b=route.journeyPose(t+.0001);assert.ok(length(diff(a.position,b.position))<.03);assert.ok(length(diff(a.target,b.target))<.03);
  for(const key of ['position','target']){const center=route.journeyPose(t)[key],left=route.journeyPose(t-.001)[key],right=route.journeyPose(t+.001)[key];const vl=diff(center,left).map(v=>v/.001),vr=diff(right,center).map(v=>v/.001);assert.ok(length(diff(vl,vr))<.08,'camera velocity must be continuous at '+t+' '+key);}}
 assert.ok(length(route.journeyPose(0).position)>1,'near-orbit camera starts outside Earth');
});
test('target acquisition meets the black hole position, direction and approach speed without a cut',()=>{
 const p=route.journeyPose(126),expected=route.RADIAL.map((v,i)=>v*84*8+route.BH_CENTER[i]);assert.ok(length(diff(p.position,expected))<1e-8);assert.deepEqual(p.target,route.BH_CENTER);
 assert.equal(route.acquisitionRadius(144),32);let previous=84;for(let t=126;t<=144;t+=.01){const r=route.acquisitionRadius(t);assert.ok(r<=previous+1e-9&&r>=32);previous=r;}
 const left=(32-route.acquisitionRadius(144-.001))/.001,right=(model.radiusAt(timeline.coreTime(144+.001))-32)/.001;assert.ok(Math.abs(left-right)<.01);
 assert.equal(timeline.cutState(291).r,1);assert.equal(timeline.cutState(305).received,5);
});
test('node navigation, hold, replay and time cues support later observation control',()=>{
 const c=new route.JourneyController(390),cues=[];c.onCue(cue=>cues.push(cue.id));c.navigate('binary');assert.equal(c.time,94);assert.equal(c.playing,false);c.advance(20);assert.equal(c.time,94);
 c.replay('binary');c.advance(8);assert.equal(c.time,102);assert.deepEqual(cues,['binary:observe']);c.advance(1);assert.equal(cues.length,1);c.hold();c.advance(50);assert.equal(c.time,103);
 c.seek(288);c.playing=true;c.advance(5);assert.equal(cues.at(-1),'horizon:cross');c.seek(NaN);assert.equal(c.time,293);c.seek(388);c.advance(10);assert.equal(c.time,390);assert.equal(c.playing,false);
});
