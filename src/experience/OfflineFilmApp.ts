import { title } from '../content/title';
import { ui } from '../content/uiText';
import { offlineVideoUrl } from '../content/video';
import { bilingual } from './bilingual';
import { escapeHtml as e } from './presentation';

/** A standalone HTML video player. This route never creates a WebGL renderer. */
export class OfflineFilmApp {
 private readonly root=document.createElement('section');
 private readonly abort=new AbortController();
 private readonly video=document.createElement('video');
 private readonly canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
 private disposed=false;

 constructor(private readonly userInitiated=false){
  document.body.classList.add('experience-mode','offline-mode');this.canvas.hidden=true;
  this.root.id='offline-film';this.root.className='offline-film';
  this.root.innerHTML=`<header class="offline-header"><div><h1>${e(title.zh)}</h1><p>${e(title.en)}</p></div><span>${bilingual(ui.offlineEdition)}</span></header><div class="offline-screen"><div class="offline-message" role="status" aria-live="polite"><span class="offline-symbol" aria-hidden="true">▷</span><h2></h2><p></p><button id="offline-retry" hidden>${bilingual(ui.retry)}</button></div></div><footer class="offline-footer"><a href="?mode=observatory">← ${bilingual(ui.back)}</a><span>${e(ui.offlinePlayback)}</span><button data-fullscreen>${bilingual(ui.fullscreen)}</button></footer>`;
  this.video.id='offline-video';this.video.controls=true;this.video.playsInline=true;this.video.preload='metadata';
  this.video.setAttribute('aria-label',`${title.zh} · ${ui.offlineStartZh}`);this.video.hidden=true;
  this.root.querySelector('.offline-screen')!.prepend(this.video);document.querySelector('#app')!.append(this.root);
  const opt={signal:this.abort.signal};
  this.video.addEventListener('loadedmetadata',()=>{if(!this.disposed)this.setState('ready');},opt);
  this.video.addEventListener('error',()=>{if(!this.disposed){this.video.pause();this.setState('error');}},opt);
  this.root.querySelector('#offline-retry')!.addEventListener('click',()=>{this.loadVideo(true);},opt);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.video.pause();},opt);
  this.setState(offlineVideoUrl?'loading':'missing');
 }

 private setState(state:'missing'|'loading'|'ready'|'error'){
  this.root.dataset.state=state;this.video.hidden=state!=='ready';
  const message=this.root.querySelector<HTMLElement>('.offline-message')!;message.hidden=state==='ready';
  const copy=state==='error'?[ui.offlineError,ui.offlineErrorHint]:state==='loading'?[ui.offlineLoading,'']:[ui.offlineMissing,ui.offlineMissingHint];
  message.querySelector('h2')!.textContent=copy[0];message.querySelector('p')!.textContent=copy[1];
  this.root.querySelector<HTMLButtonElement>('#offline-retry')!.hidden=state!=='error';
 }

 private loadVideo(play:boolean){
  if(!offlineVideoUrl||this.disposed)return;
  this.setState('loading');this.video.src=offlineVideoUrl;this.video.load();
  if(play)void this.video.play().catch(()=>{/* Native controls remain available if playback needs another gesture. */});
 }

 async start(){
  const status=document.querySelector<HTMLElement>('#status');if(status){status.textContent='';status.dataset.error='false';}
  this.loadVideo(this.userInitiated);
 }

 dispose(){
  if(this.disposed)return;this.disposed=true;this.abort.abort();
  this.video.pause();this.video.removeAttribute('src');this.video.load();this.root.remove();this.canvas.hidden=false;
  document.body.classList.remove('experience-mode','offline-mode');
 }
}
