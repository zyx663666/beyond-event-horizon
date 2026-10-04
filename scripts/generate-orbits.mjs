import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { DataUtils } from 'three';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
function load(filename) {
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>name==='three'?{DataUtils}:load(path.resolve(path.dirname(filename),name+'.ts')),module,module.exports);
  return module.exports;
}
const { ORBIT, orbitAlpha, orbitSamples } = load(path.resolve('src/lensing/orbit.ts'));
const data = new Uint16Array(ORBIT.width * ORBIT.height * ORBIT.layers * 2);
for(let layer=0;layer<ORBIT.layers;layer++) {
  const inverse = ORBIT.minInverseRadius + (ORBIT.maxInverseRadius-ORBIT.minInverseRadius)*layer/(ORBIT.layers-1);
  for(let x=0;x<ORBIT.width;x++) {
    const orbit = orbitSamples(1/inverse,orbitAlpha(1/inverse,x/(ORBIT.width-1)));
    for(let y=0;y<ORBIT.height;y++) {
      const offset = ((layer*ORBIT.height+y)*ORBIT.width+x)*2;
      data[offset]=DataUtils.toHalfFloat(orbit[y*2]); data[offset+1]=DataUtils.toHalfFloat(orbit[y*2+1] - 1/inverse - Math.log(1/inverse-1));
    }
  }
  if(layer%8===0) console.log(`Orbit layer ${layer+1}/${ORBIT.layers}`);
}
const bytes=Buffer.from(data.buffer), compressed=gzipSync(bytes,{level:9});
fs.writeFileSync('public/lensing/orbits.dat',compressed);
fs.writeFileSync('public/lensing/orbits.json',JSON.stringify({...ORBIT,channels:['Rs/r','c*lookback/Rs - observer tortoise radius'],encoding:'RG16F little-endian gzip',bytes:bytes.length,compressedBytes:compressed.length,sha256:createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');
console.log(`Saved ${(compressed.length/1048576).toFixed(1)} MiB orbit asset`);
