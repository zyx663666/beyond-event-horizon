import { defineConfig } from 'vite';
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPLOY_ASSETS, HAS_SCORE, AUDIO_SETTINGS, HAS_OFFLINE_VIDEO } from './scripts/deploy-assets.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dev-only companion for the on-page "SAVE VIDEO" button: starts
 * scripts/render-video.mjs in the background, reports progress on /status
 * and streams the finished MP4 from /file as a browser download.
 * Production builds ship no such endpoint; the button then tells the user
 * to run render-video.bat instead.
 */
function localRenderEndpoint() {
  return {
    name: 'local-render-endpoint',
    apply: 'serve',
    configureServer(server) {
      let child = null, state = 'idle', exitCode = null, outFile = null, lines = [];
      const ALLOWED = new Set(['quality', 'fps', 'crf', 'preset', 'max-seconds', 't0', 't1']);
      const safe = value => /^[\w.:-]+$/.test(value);
      server.middlewares.use('/api/render', (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://local');
        const json = body => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
        if (req.method === 'POST') {
          if (child) { res.statusCode = 409; json({ state, message: 'A render is already running.' }); return; }
          const args = [path.join(projectRoot, 'scripts', 'render-video.mjs')];
          for (const [key, value] of url.searchParams) if (ALLOWED.has(key) && safe(value)) args.push(`--${key}`, value);
          lines = []; outFile = null; exitCode = null; state = 'recording';
          child = spawn(process.execPath, args, { cwd: projectRoot });
          const push = text => { lines.push(...String(text).split(/\r?\n/).filter(Boolean)); if (lines.length > 16) lines = lines.slice(-16); };
          child.stdout.on('data', push);
          child.stderr.on('data', push);
          child.on('close', code => {
            exitCode = code ?? 0;
            state = code === 0 ? 'done' : 'error';
            outFile = lines.join('\n').match(/→\s*(.+\.mp4)/)?.[1] ?? null;
            child = null;
          });
          json({ state });
        } else if (url.pathname === '/status') {
          if (state === 'recording' && lines.some(line => line.includes('encoding MP4'))) state = 'encoding';
          const file = outFile && existsSync(outFile) ? outFile : null;
          json({ state, exitCode, running: Boolean(child), message: lines.at(-1) ?? '',
            lines: lines.slice(-6), file: file ? basename(file) : null, size: file ? statSync(file).size : null });
        } else if (url.pathname === '/file') {
          if (!outFile || !existsSync(outFile)) { res.statusCode = 404; json({ error: 'No finished render yet.' }); return; }
          res.setHeader('content-type', 'video/mp4');
          res.setHeader('content-disposition', `attachment; filename="${basename(outFile)}"`);
          createReadStream(outFile).pipe(res);
        } else next();
      });
    },
  };
}

function deploymentBase(value = '/') {
  const base = value === '' ? '/' : value;
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\]/.test(base)) {
    throw new Error('VITE_BASE_PATH must be / or a pathname such as /beh/');
  }
  return base.endsWith('/') ? base : `${base}/`;
}

export default defineConfig(({ command, isPreview }) => ({
  define: { __BEH_HAS_SCORE__: JSON.stringify(HAS_SCORE), __BEH_HAS_OFFLINE_VIDEO__: JSON.stringify(HAS_OFFLINE_VIDEO) },
  // Normal local development always stays at /. Actions supplies the Pages pathname.
  base: command === 'serve' && !isPreview ? '/' : deploymentBase(process.env.VITE_BASE_PATH),
  // Browser diagnostics can contain locked files and are never application inputs.
  server: { watch: { ignored: ['**/artifacts/**'] } },
  build: { copyPublicDir: false, sourcemap: false },
  plugins: [localRenderEndpoint(), {
    name: 'runtime-assets-only',
    apply: 'build',
    generateBundle() {
      if(HAS_SCORE&&!AUDIO_SETTINGS.publishAllowed)throw new Error('Confirm the score redistribution rights in src/content/audio.config.json before publishing.');
      for (const fileName of DEPLOY_ASSETS) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(`./public/${fileName}`, import.meta.url)) });
      }
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
  }],
}));
