import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { DEPLOY_ASSETS, HAS_SCORE, AUDIO_SETTINGS } from './scripts/deploy-assets.mjs';

function deploymentBase(value = '/') {
  const base = value === '' ? '/' : value;
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\]/.test(base)) {
    throw new Error('VITE_BASE_PATH must be / or a pathname such as /beyond-event-horizon/');
  }
  return base.endsWith('/') ? base : `${base}/`;
}

export default defineConfig(({ command, isPreview }) => ({
  define: { __BEH_HAS_SCORE__: JSON.stringify(HAS_SCORE) },
  // Normal local development always stays at /. Actions supplies the Pages pathname.
  base: command === 'serve' && !isPreview ? '/' : deploymentBase(process.env.VITE_BASE_PATH),
  build: { copyPublicDir: false, sourcemap: false },
  plugins: [{
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
