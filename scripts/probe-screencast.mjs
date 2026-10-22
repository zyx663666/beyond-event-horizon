// Probe: measure Page.startScreencast frame pacing in headless Edge during live film playback.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const quality = process.argv[2] ?? 'preview';
const seconds = Number(process.argv[3] ?? 10);
const VIEWPORTS = { preview: [1280, 720], target: [2560, 1440], ultra: [3840, 2160] };
const [width, height] = VIEWPORTS[quality];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.json': 'application/json', '.bin': 'application/octet-stream', '.dat': 'application/octet-stream' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(root, 'dist', decodeURIComponent(url.pathname));
  if (statSync(file, { throwIfNoEntry: false })?.isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(5181, '127.0.0.1', r));

const puppeteer = require_('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio', '--use-angle=default',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', `--window-size=${width},${height}`],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:5181/?mode=film&quality=${quality}&debug=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('body.film-ready', { timeout: 300000 });
console.log(`gpu: ${await page.$eval('#cinematic', el => el.dataset.gpu)}`);

const cdp = await page.createCDPSession();
let frames = 0, bytes = 0;
const stamps = [];
let firstTs = null;
cdp.on('Page.screencastFrame', async ev => {
  const ts = ev.metadata.timestamp ?? performance.now() / 1000;
  if (firstTs === null) firstTs = ts;
  stamps.push(ts - firstTs);
  frames++; bytes += ev.data.length;
  try { await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch { /* ignore */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < seconds) await new Promise(r => setTimeout(r, 250));
await cdp.send('Page.stopScreencast');
const elapsed = (stamps.at(-1) ?? 0) || 1;
const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
const p = q => gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))].toFixed(3);
console.log(`frames: ${frames} in ${elapsed.toFixed(2)}s → avg ${(frames / elapsed).toFixed(1)} fps · ${(bytes / frames / 1024).toFixed(0)} KB/frame`);
console.log(`frame-gap p05=${p(0.05)}s p50=${p(0.5)}s p95=${p(0.95)}s max=${gaps.at(-1).toFixed(3)}s (target ${ (1/60).toFixed(3) }s)`);
await browser.close();
server.close();
process.exit(0);
