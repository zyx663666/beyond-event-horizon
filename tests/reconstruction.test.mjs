import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
function load(file){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','exports','module',code)(name=>load(path.resolve(path.dirname(file),name+'.ts')),m.exports,m);return m.exports;}
const m=load(path.resolve('src/film/timeline.ts'));
test('reconstructed cut covers 390 seconds, Earth first and target acquisition before the physical core',()=>{
 assert.equal(m.CUT_DURATION,390);assert.equal(m.shotAt(0).id,'earth');assert.equal(m.shotAt(143).id,'target');assert.equal(m.shotAt(145).id,'blackhole');
 for(let i=0;i<m.SCENES.length-1;i++)assert.equal(m.SCENES[i].end,m.SCENES[i+1].start);
 let prev=0;for(let t=0;t<=390;t+=.1){const c=m.coreTime(t);assert.ok(Number.isFinite(c)&&c>=prev);prev=c;}
});
test('observations slow continuously without freezing, and crossing and echo survive the recut',()=>{
 for(const t of [179,203,222,258,277]){assert.equal(m.onHold(t),false);assert.ok(m.cutState(t+.5).tau>m.cutState(t).tau);assert.ok(m.coreRate(t)>0&&m.coreRate(t)<1.2);}
 assert.ok(Math.abs(m.cutState(291).r-1)<1e-12);assert.equal(m.cutState(303).received,4);assert.equal(m.cutState(305).received,5);
 assert.equal(m.cutState(333).art,false);assert.equal(m.cutState(334).art,true);
});
test('the model clock has continuous positive velocity at each editorial join',()=>{
 for(let t=144.01;t<329.99;t+=.025)assert.ok(m.coreRate(t)>0,'clock reversed or froze at '+t);
 for(const [t] of m.CUT_KEYS.slice(1,-1))assert.ok(Math.abs(m.coreRate(t-.0001)-m.coreRate(t+.0001))<.001,'velocity jump at '+t);
 assert.ok(Math.abs(m.coreRate(329.999))<.001);
});
test('archive distance, remaining distance and light time share one internally consistent source',()=>{
 let distance=0,years=0;for(let t=0;t<=145;t+=.1){const a=m.archiveAt(t);assert.ok(a.distance>=distance&&a.years>=years);assert.ok(Math.abs(a.distance+a.remaining-1200)<1e-9);assert.equal(a.homeRtt,2*a.distance);distance=a.distance;years=a.years;}
 assert.equal(m.archiveAt(144).years,6000);assert.equal(m.archiveAt(144).homeRtt,2400);
 // Every interstellar archive interval is slower than c; these are epochs, not screen seconds.
 for(const [a,b] of [[58,82],[82,106],[106,126],[126,144]]){const x=m.archiveAt(a),y=m.archiveAt(b);assert.ok((y.distance-x.distance)/(y.years-x.years)<1);}
});


