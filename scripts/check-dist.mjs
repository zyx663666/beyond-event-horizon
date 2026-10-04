import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { DEPLOY_ASSETS } from './deploy-assets.mjs';

const base = `${(process.env.VITE_BASE_PATH || '/').replace(/\/$/, '')}/`;
const html = readFileSync('dist/index.html', 'utf8');
for (const file of DEPLOY_ASSETS) assert.ok(existsSync(path.join('dist', file)), `Missing runtime asset: ${file}`);
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(url.startsWith(base), `Asset escapes the deployment pathname: ${url}`);
  assert.ok(existsSync(path.join('dist', url.slice(base.length))), `Broken entry asset: ${url}`);
}
function walk(dir) { return readdirSync(dir).flatMap(name => { const p = path.join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p.replaceAll('\\', '/')]; }); }
const files = walk('dist');
assert.ok(files.every(file => !/stills|artifacts|\.log$|\.map$|carina-webb|crab-webb/.test(file)), 'Debug / retired visual assets entered the deployment');
const scripts = files.filter(file => file.endsWith('.js')).map(file => readFileSync(file, 'utf8')).join('\n');
assert.ok(scripts.includes(`${base}cosmos/`), 'Texture loader did not inherit Vite base');
assert.ok(scripts.includes(`${base}lensing/`), 'Lookup-table loader did not inherit Vite base');
assert.ok(!scripts.includes('QA 音频测试信号')&&!scripts.includes('QA 重建 WebGL'), 'Developer media/context harness entered production');
console.log(`Production paths checked: ${base} · ${files.length} files · runtime assets only`);
