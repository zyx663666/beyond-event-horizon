/**
 * Offline render for Beyond the Light Cone.
 *
 * Two modes:
 *  realtime (default) — plays the film live in a headless browser and captures
 *    the full page (canvas + HUD + subtitles + controls, exactly as presented)
 *    as a timestamped JPEG frame stream, then muxes it with the score into one
 *    MP4. Wall time ≈ film length (7:06) + encoding, i.e. ~15-25 min total.
 *  frame (--frame) — seeks deterministically frame by frame at a fixed
 *    timestep. Slower (every frame waits for the GPU and a full screenshot),
 *    but pixel-exact pacing; use it for a master copy when time is no issue.
 *
 * Usage:
 *   node scripts/render-video.mjs                        # realtime, 2560x1440, full film
 *   node scripts/render-video.mjs --quality ultra        # realtime at 3840x2160 canvas
 *   node scripts/render-video.mjs --frame                # deterministic per-frame master
 *   node scripts/render-video.mjs --frame --t0 150 --t1 160   # 10 s range test
 *   node scripts/render-video.mjs --max-seconds 10       # realtime test/benchmark
 *
 * Ctrl+C stops cleanly between frames (frame mode) or aborts capture (realtime).
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);

// ---------- arguments ----------
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = name => args.includes(`--${name}`);

const mode = has('frame') ? 'frame' : 'realtime';
const fps = Number(flag('fps', 60)); // frame mode only
const quality = flag('quality', mode === 'frame' ? 'ultra' : 'target');
const crf = Number(flag('crf', 17));
const x264preset = flag('preset', 'fast'); // medium trades CPU time for size; crf 17 keeps quality
const port = Number(flag('port', 5179));
const keepFrames = has('keep-frames');
const out = path.resolve(flag('out', path.join(root, 'render-output', `beyond-light-cone-${quality}${mode === 'frame' ? `-${fps}fps` : ''}.mp4`)));
const VIEWPORTS = { preview: [1280, 720], target: [2560, 1440], ultra: [3840, 2160] };
if (!VIEWPORTS[quality]) throw new Error(`Unknown --quality ${quality}; use preview|target|ultra`);
const [width, height] = VIEWPORTS[quality];

// Film length comes from the single source of truth in presentation.ts.
const presentation = readFileSync(path.join(root, 'src/experience/presentation.ts'), 'utf8');
const journey = Number(presentation.match(/JOURNEY_DURATION\s*=\s*([\d.]+)/)?.[1]);
const intro = Number(presentation.match(/INTRO_DURATION\s*=\s*([\d.]+)/)?.[1]);
const FILM_END = intro + journey;
if (![intro, journey].every(Number.isFinite)) throw new Error('Could not read durations from presentation.ts');
const maxSeconds = Math.min(Number(flag('max-seconds', 0)) || Infinity, FILM_END + 30);
const t0 = Math.max(0, Number(flag('t0', 0)));
const t1 = Math.min(Number(flag('t1', FILM_END)), FILM_END);

const audioConfig = JSON.parse(readFileSync(path.join(root, 'src/content/audio.config.json'), 'utf8'));
const scorePath = path.join(root, 'public', audioConfig.file);

// ---------- toolchain ----------
function resolveEdge() {
  const candidates = [flag('edge', ''), process.env.EDGE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  const where = spawnSync('where', ['msedge'], { encoding: 'utf8' });
  if (where.status === 0) return where.stdout.trim().split(/\r?\n/)[0];
  throw new Error('Edge not found; pass --edge "C:/path/to/msedge.exe"');
}
function resolveFfmpeg() {
  const explicit = flag('ffmpeg', '');
  if (explicit) return explicit;
  try { const p = require_('ffmpeg-static'); if (p && existsSync(p)) return p; } catch { /* fall through */ }
  return 'ffmpeg';
}

if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.log('dist/ missing — building production bundle first…');
  spawnSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: root, stdio: 'inherit' });
}

// ---------- static server for dist/ ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown', '.mp3': 'audio/mpeg',
  '.json': 'application/json', '.bin': 'application/octet-stream', '.dat': 'application/octet-stream' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(root, 'dist', decodeURIComponent(url.pathname));
  if (!file.startsWith(path.join(root, 'dist'))) { res.writeHead(403).end(); return; }
  if (statSync(file, { throwIfNoEntry: false })?.isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
console.log(`serving dist/ at http://127.0.0.1:${port}/`);

// ---------- browser ----------
const puppeteer = require_('puppeteer-core');
const executablePath = resolveEdge();
const ffmpegBin = resolveFfmpeg();
console.log(`edge: ${executablePath}\nffmpeg: ${ffmpegBin}`);
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--mute-audio', '--use-angle=default',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', `--window-size=${width},${height}`],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', error => console.log(`[pageerror] ${error.message}`));
await page.goto(`http://127.0.0.1:${port}/?mode=film&quality=${quality}&debug=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('body.film-ready', { timeout: 300000 });
const gpu = await page.$eval('#cinematic', el => el.dataset.gpu);
const shaderErrors = await page.$eval('#cinematic', el => el.dataset.shaderErrors);
console.log(`gpu: ${gpu} · shaderErrors: ${shaderErrors}`);
if (/swiftshader|llvmpipe|software/i.test(gpu)) console.log('WARNING: software rasterizer in use; frames will be slow but correct.');
if (shaderErrors !== '0') throw new Error('Film shader compilation failed in the browser');

// ---------- shared ffmpeg helpers ----------
const hasScore = existsSync(scorePath);
if (!hasScore) console.log('score.mp3 not found — rendering video only');
const audioArgs = videoLengthSeconds => hasScore
  ? [...(audioConfig.loop ? ['-stream_loop', '-1'] : []), '-i', scorePath, '-filter_complex',
     `[1:a]volume=${audioConfig.volume},afade=t=in:st=0:d=${audioConfig.fadeIn},afade=t=out:st=${Math.max(0, videoLengthSeconds - audioConfig.fadeOut)}:d=${audioConfig.fadeOut}[a]`,
     '-map', '0:v', '-map', '[a]']
  : ['-an'];
const encodeArgs = videoLengthSeconds => [...audioArgs(videoLengthSeconds),
  '-c:v', 'libx264', '-preset', x264preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
  ...(hasScore ? ['-c:a', 'aac', '-b:a', '192k'] : []),
  '-t', String(videoLengthSeconds), '-shortest', '-movflags', '+faststart'];
const startFfmpeg = (inputArgs, videoLengthSeconds) => {
  const ffmpeg = spawn(ffmpegBin, ['-y', ...inputArgs, ...encodeArgs(videoLengthSeconds), out], { stdio: ['pipe', 'ignore', 'pipe'] });
  ffmpeg.stdin.setMaxListeners(0); // one write/error listener pair per frame; disable the warning
  let ffmpegTail = '';
  ffmpeg.stderr.on('data', chunk => { ffmpegTail = (ffmpegTail + chunk).slice(-2000); });
  const done = new Promise((resolve, reject) =>
    ffmpeg.on('close', code => code === 0 ? resolve(ffmpeg) : reject(new Error(`ffmpeg exited ${code}\n${ffmpegTail}`))));
  const writeFrame = buffer => new Promise((resolve, reject) => {
    if (ffmpeg.stdin.write(buffer)) resolve();
    else ffmpeg.stdin.once('drain', resolve);
    ffmpeg.stdin.once('error', reject);
  });
  return { ffmpeg, done, writeFrame };
};
const finish = async seconds => {
  await browser.close();
  server.close();
  console.log(`done in ${Math.round(seconds)}s → ${out} · ${(statSync(out).size / 1e9).toFixed(2)} GB`);
  process.exit(0);
};

const started = Date.now();
let interrupted = false;
process.on('SIGINT', () => { interrupted = true; console.log('\nstopping…'); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Sandboxed CLIs may inject fs shims that veto bulk rmSync; fall back to
// fs/promises.rm and finally to leaving temp frames in place — cleanup must
// never kill a finished render.
async function clearDir(dir, fs) {
  try { rmSync(dir, { recursive: true, force: true }); return true; }
  catch { try { await fs.rm(dir, { recursive: true, force: true }); return true; } catch { return false; } }
}

// ---------- realtime mode (default) ----------
if (mode === 'realtime') {
  const captureDir = path.join(root, 'render-output', '.capture');
  const fs = await import('node:fs/promises');
  if (!(await clearDir(captureDir, fs))) console.log(`note: could not clear ${captureDir} — leftover frames are overwritten and ignored`);
  await fs.mkdir(captureDir, { recursive: true });

  const cdp = await page.createCDPSession();
  let n = 0, firstTs = null, lastRel = 0;
  const stamps = [];
  let writes = Promise.resolve();
  cdp.on('Page.screencastFrame', ev => {
    const ts = typeof ev.metadata?.timestamp === 'number' ? ev.metadata.timestamp : performance.now() / 1000;
    if (firstTs === null) firstTs = ts;
    const rel = ts - firstTs;
    const name = `f${String(n).padStart(6, '0')}.jpg`;
    stamps.push(rel);
    lastRel = rel; n++;
    const data = Buffer.from(ev.data, 'base64');
    writes = writes.then(() => fs.writeFile(path.join(captureDir, name), data)).catch(() => {});
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: width, maxHeight: height, everyNthFrame: 1 });

  // The film autoplays from 0 in film mode; nudge it only if paused.
  await page.evaluate(() => {
    const rootEl = document.querySelector('#cinematic');
    if (rootEl?.dataset.paused === 'true') document.querySelector('#film-play')?.click();
  });

  console.log(`realtime capture: up to ${maxSeconds === Infinity ? `${FILM_END}s (full film)` : `${maxSeconds.toFixed(0)}s`} · ${width}×${height} page · recording while the film plays…`);
  let reported = 0;
  while (!interrupted) {
    const finished = await page.evaluate(() => document.querySelector('#cinematic')?.dataset.finished === 'true');
    if (finished || lastRel >= maxSeconds) break;
    if (lastRel - reported >= 30) {
      reported = lastRel;
      console.log(`recording ${lastRel.toFixed(0)}s · ${n} frames · ${(n / Math.max(0.001, lastRel)).toFixed(1)} fps avg`);
    }
    await sleep(500);
  }
  if (interrupted) { console.log('interrupted — capture aborted, nothing encoded.'); await browser.close(); server.close(); process.exit(130); }
  await sleep(1200); // tail frames after the finished flag
  await cdp.send('Page.stopScreencast').catch(() => {});
  await writes;
  if (n < 10) throw new Error(`only ${n} frames captured — screencast failed`);
  const tail = Math.max(0.033, (performance.now() / 1000 - firstTs) - lastRel);
  const videoLength = Math.min(lastRel + tail, FILM_END, maxSeconds);
  const outFps = 30;
  const totalOut = Math.max(2, Math.round(videoLength * outFps));
  console.log(`captured ${n} frames · ${(n / videoLength).toFixed(1)} fps avg · ${videoLength.toFixed(1)}s — encoding MP4 @ ${outFps} fps…`);
  // A concat list lets ffmpeg guess 25 fps and silently drop ~15% of the
  // capture, so resample the timeline ourselves onto a fixed grid and feed
  // the pipe: every moment of the film survives, with constant frame timing.
  const { ffmpeg, done, writeFrame } = startFfmpeg(['-f', 'image2pipe', '-framerate', String(outFps), '-i', '-'], videoLength);
  const frameFile = i => path.join(captureDir, `f${String(i).padStart(6, '0')}.jpg`);
  let pick = 0, fed = 0;
  for (let k = 0; k < totalOut; k++) {
    const t = k / outFps;
    while (pick + 1 < n && Math.abs(stamps[pick + 1] - t) <= Math.abs(stamps[pick] - t)) pick++;
    await writeFrame(await fs.readFile(frameFile(pick)));
    fed++;
    if (fed % 3000 === 0) console.log(`encoding ${fed}/${totalOut} frames`);
  }
  console.log(`fed ${fed} frames (from ${n} captures) — finalising…`);
  ffmpeg.stdin.end();
  await done;
  if (!keepFrames && !(await clearDir(captureDir, fs))) console.log(`note: temp frames left in ${captureDir}`);
  else if (keepFrames) console.log(`frames kept in ${captureDir}`);
  await finish((Date.now() - started) / 1000);
}

// ---------- deterministic frame mode (--frame) ----------
const totalFrames = Math.max(1, Math.round((t1 - t0) * fps));
const seekFrame = t => page.evaluate(time => window.dispatchEvent(
  new CustomEvent('journey:render-frame', { detail: { t: time } })), t);
const settled = () => page.evaluate(() => new Promise(requestAnimationFrame));
await seekFrame(t0);
await settled();
const screenshot = has('jpeg') ? { type: 'jpeg', quality: 95, captureBeyondViewport: false }
                               : { type: 'png', captureBeyondViewport: true, optimizeForSpeed: true };
console.log(`frame mode: ${totalFrames} frames · ${width}×${height} @ ${fps} fps · t ${t0}s → ${t1}s · ${has('jpeg') ? 'jpeg95' : 'png'}`);
const { ffmpeg, done: ffmpegDone, writeFrame } = startFfmpeg(
  ['-f', 'image2pipe', '-framerate', String(fps), '-i', '-'], t1 - t0);
for (let i = 0; i < totalFrames && !interrupted; i++) {
  const t = Math.min(t0 + i / fps, FILM_END - 1e-4);
  await seekFrame(t);
  await settled();
  await writeFrame(await page.screenshot(screenshot));
  if (i % 30 === 0 || i === totalFrames - 1) {
    const elapsed = (Date.now() - started) / 1000;
    const rate = (i + 1) / elapsed;
    const eta = (totalFrames - i - 1) / rate;
    const fmt = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
    console.log(`frame ${String(i + 1).padStart(String(totalFrames).length, '0')}/${totalFrames} · ${rate.toFixed(2)} fps · elapsed ${fmt(elapsed)} · ETA ${fmt(eta)}`);
  }
}
ffmpeg.stdin.end();
await ffmpegDone;
if (interrupted) process.exit(130);
await finish((Date.now() - started) / 1000);
