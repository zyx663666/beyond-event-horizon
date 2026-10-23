import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const module={exports:{}};
const code=ts.transpileModule(fs.readFileSync('src/core/AppLifecycle.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports',code)(module.exports);
const {AppLifecycle}=module.exports;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function pending(){
 let resolve,reject;
 const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
 return {start:()=>promise,dispose(){this.disposals++;},disposals:0,resolve,reject};
}

test('a canceled old startup cannot report an error or dispose the replacement page',async()=>{
 const errors=[],runtime=new AppLifecycle(error=>errors.push(error)),old=pending(),current=pending();
 runtime.launch(()=>old);runtime.launch(()=>current);
 old.reject(new DOMException('signal is aborted without reason','AbortError'));await flush();
 assert.equal(old.disposals,1);assert.equal(current.disposals,0);assert.deepEqual(errors,[]);
 current.resolve();await flush();assert.equal(current.disposals,0);runtime.dispose();
});

test('page departure invalidates pending startup before a restored page is launched',async()=>{
 const errors=[],runtime=new AppLifecycle(error=>errors.push(error)),old=pending(),restored=pending();
 runtime.launch(()=>old);runtime.dispose();runtime.launch(()=>restored);
 old.reject(new Error('late response from the departed page'));await flush();
 assert.equal(restored.disposals,0);assert.deepEqual(errors,[]);restored.resolve();runtime.dispose();
});

test('a genuine current startup failure is reported once and allows a later launch',async()=>{
 const errors=[],runtime=new AppLifecycle(error=>errors.push(error)),failed=pending(),next=pending();
 const error=new Error('Missing scientific asset');runtime.launch(()=>failed);failed.reject(error);await flush();
 assert.deepEqual(errors,[error]);assert.equal(failed.disposals,1);
 runtime.launch(()=>next);next.resolve();await flush();assert.equal(next.disposals,0);runtime.dispose();
});

test('an active AbortError is not silently swallowed as an obsolete cancellation',async()=>{
 const errors=[],runtime=new AppLifecycle(error=>errors.push(error)),app=pending();
 const error=new DOMException('current load interrupted','AbortError');runtime.launch(()=>app);app.reject(error);await flush();
 assert.deepEqual(errors,[error]);assert.equal(app.disposals,1);
});

test('constructor failures and repeated disposal leave no live old page',async()=>{
 const errors=[],runtime=new AppLifecycle(error=>errors.push(error)),old=pending(),failure=new Error('WebGL unavailable');
 runtime.launch(()=>old);runtime.launch(()=>{throw failure;});runtime.dispose();runtime.dispose();
 old.reject(new Error('obsolete'));await flush();assert.deepEqual(errors,[failure]);assert.equal(old.disposals,1);
});
