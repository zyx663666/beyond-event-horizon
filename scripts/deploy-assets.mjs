import { existsSync, readFileSync } from 'node:fs';
export const AUDIO_SETTINGS=JSON.parse(readFileSync(new URL('../src/content/audio.config.json',import.meta.url),'utf8'));
if(!/^audio\/[a-zA-Z0-9_./-]+\.(mp3|ogg|wav|m4a)$/.test(AUDIO_SETTINGS.file)||AUDIO_SETTINGS.file.includes('..'))throw new Error('Invalid local audio file path');
export const HAS_SCORE=existsSync(new URL('../public/'+AUDIO_SETTINGS.file,import.meta.url));
/** Only runtime files enter the production site. Local proof images remain local. */
export const DEPLOY_ASSETS = [
  ...(HAS_SCORE?[AUDIO_SETTINGS.file]:[]),
  'favicon.svg',
  'cosmos/earth-blue-marble.png',
  'cosmos/CREDITS.md',
  'lensing/metadata.json',
  'lensing/schwarzschild.bin',
  'lensing/orbits.json',
  'lensing/orbits.dat',
];
