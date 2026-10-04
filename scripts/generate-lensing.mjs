import fs from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
const source = fs.readFileSync(new URL('../src/lensing/geodesic.ts', import.meta.url), 'utf8');
const exports = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const { LUT, alphaForColumn, escapeAzimuth } = exports;
const data = new Float32Array(LUT.width * LUT.height);
for (let y = 0; y < LUT.height; y++) {
  const radius = 1 / (LUT.minInverseRadius + (LUT.maxInverseRadius - LUT.minInverseRadius) * y / (LUT.height - 1));
  for (let x = 0; x < LUT.width; x++) data[y * LUT.width + x] = escapeAzimuth(radius, alphaForColumn(radius, x / (LUT.width - 1)));
}
const directory = new URL('../public/lensing/', import.meta.url);
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(new URL('schwarzschild.bin', directory), Buffer.from(data.buffer));
fs.writeFileSync(new URL('metadata.json', directory), JSON.stringify({ ...LUT, integrator: 'RK4', step: 0.012, units: 'Rs=1', floats: data.length, sha256: createHash('sha256').update(Buffer.from(data.buffer)).digest('hex') }, null, 2) + '\n');
console.log(`Generated ${LUT.width} × ${LUT.height} unwrapped azimuths (${data.byteLength} bytes)`);
