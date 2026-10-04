import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
function load(file){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','exports','module',code)(name=>load(path.resolve(path.dirname(file),name+'.ts')),m.exports,m);return m.exports;}
const p=load(path.resolve('src/experience/presentation.ts'));
const timeline=load(path.resolve('src/film/timeline.ts'));
const route=load(path.resolve('src/film/journey/route.ts'));
const opening=load(path.resolve('src/experience/OpeningSequence.ts'));
test('prelude observations remain monotone and reach all original landmarks',()=>{
 for(let t=0;t<144;t+=.02){assert.ok(p.preludeRate(t)>.54);assert.ok(p.preludeRate(t)<1.5);}
 for(const t of [0,32,57,76,94,110,126,144]){assert.equal(p.preludeTime(t),t);assert.ok(Math.abs(p.preludeRate(t)-1)<.001);}
 for(const t of [12.5,23,47,66,115])assert.ok(Math.abs(p.preludeRate(t)-.55)<.001);
});
test('credits are independent of the 390-second journey and end on black',()=>{
 assert.equal(timeline.CUT_DURATION,390);assert.equal(p.EXPERIENCE_DURATION,462);
 assert.equal(p.creditStage(389.999),'none');assert.equal(p.creditStage(390),'complete');
 assert.equal(p.creditStage(397),'message');assert.equal(p.creditStage(410),'authors');assert.equal(p.creditStage(420),'closed');assert.equal(p.creditStage(426),'black');
 const c=new route.JourneyController(p.EXPERIENCE_DURATION,p.INTRO_DURATION);c.navigate('credits',true);assert.equal(c.time,426);c.advance(50);assert.equal(c.time,462);assert.equal(c.playing,false);
 c.navigate('lastEcho');assert.equal(c.time,340);assert.equal(c.playing,false);
});
test('opening layers appear in order and preserve a clean Earth interval before HUD',()=>{
 const black=opening.openingState(0);assert.equal(black.title,0);assert.equal(black.rim,0);assert.equal(black.surface,0);assert.equal(black.chapter,0);
 const title=opening.openingState(9);assert.equal(title.title,1);assert.equal(title.rim,0);assert.equal(title.chapter,0);
 const rim=opening.openingState(12);assert.ok(rim.rim>0);assert.equal(rim.surface,0);
 const clean=opening.openingState(24);assert.equal(clean.title,0);assert.equal(clean.surface,1);assert.equal(clean.online,0);assert.equal(clean.chapter,0);assert.ok(clean.metrics.every(v=>v===0));
 assert.equal(opening.openingState(36).active,false);assert.ok(opening.openingState(36).metrics.every(v=>v===1));
});
test('an inbound final acknowledgment never implies a restored outbound path',()=>{
 const before=timeline.cutState(280),cross=timeline.cutState(291),echo=timeline.cutState(305),after=timeline.cutState(312);
 assert.equal(p.relayState(280,before.r,before.received),'delayed');assert.equal(p.relayState(291,cross.r,cross.received),'noPath');
 assert.equal(p.relayState(305,echo.r,echo.received),'lastAck');assert.ok(echo.r<1);assert.equal(p.relayState(312,after.r,after.received),'noPath');
});
test('editable credits remain literal text, including markup characters',()=>{
 assert.equal(p.escapeHtml('<A & B>'), '&lt;A &amp; B&gt;');
});
