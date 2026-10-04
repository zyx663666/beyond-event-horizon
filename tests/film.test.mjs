import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/film/model.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod);const m=mod.exports;
test('PG journey crosses smoothly at 200 seconds; model stops before singularity',()=>{
 assert.ok(Math.abs(m.radiusAt(200)-1)<1e-12);
 let prev=32;for(let t=.1;t<=244;t+=.1){const r=m.radiusAt(t);assert.ok(r<prev);assert.ok(Number.isFinite(m.properAt(t)));prev=r;}
 assert.equal(m.radiusAt(300),.25);assert.ok(Math.abs(m.radiusAt(200.001)-m.radiusAt(199.999))<.0001);
 for(const t of [0,80,190,200,220,244])assert.ok(Math.abs(m.radiusAtProper(m.properAt(t))-m.radiusAt(t))<1e-11);
});
test('radial null cone is regular at horizon and all future radial directions decrease r inside',()=>{
 assert.equal(m.nullSpeeds(1).outward,0);assert.equal(m.nullSpeeds(1).inward,-2);
 assert.ok(m.nullSpeeds(1.01).outward>0);assert.ok(m.nullSpeeds(.99).outward<0);
 for(const r of [.3,.8,1.1,3,30]){const h=1e-6;const di=(m.incomingPrimitive(r+h)-m.incomingPrimitive(r-h))/(2*h);assert.ok(Math.abs(di+1/m.nullSpeeds(r).inward)<1e-6);if(r>1){const dout=(m.outgoingPrimitive(r+h)-m.outgoingPrimitive(r-h))/(2*h);assert.ok(Math.abs(dout-1/m.nullSpeeds(r).outward)<1e-5);}}
});
test('last echo is a pre-horizon emission received after crossing; later inside pulses never reach relay',()=>{
 const echo=m.ECHOES[4];assert.ok(echo.radius>1);assert.ok(echo.sent<echo.relay&&echo.relay<echo.reply&&echo.reply<echo.received);
 assert.ok(Math.abs(echo.received-m.properAt(213))<1e-10);assert.ok(m.radiusAtProper(echo.received)<1);
 assert.equal(m.filmState(212).received,4);assert.equal(m.filmState(214).received,5);
 assert.equal(m.ECHOES.at(-1).relay,null);assert.equal(m.ECHOES.at(-1).received,null);
 assert.ok(m.outgoingRelayFrequency(1.001)<m.outgoingRelayFrequency(2));
 console.log('Echo schedule',m.ECHOES);
});
