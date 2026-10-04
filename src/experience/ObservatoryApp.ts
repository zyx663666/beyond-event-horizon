import { createConfig } from '../app/config';
import { RendererHost } from '../core/RendererHost';
import { RenderPipeline } from '../rendering/RenderPipeline';
import { BlackHoleScene } from '../scene/BlackHoleScene';
import { ObserverInput } from '../observer/ObserverInput';
import { bilingual } from './bilingual';
import { credits } from '../content/credits';
import { ui } from '../content/uiText';
import { escapeHtml as e } from './presentation';

/** A station-kept, continuously rendered instrument. Film time is a separate route. */
export class ObservatoryApp {
 private readonly config=createConfig(location.search);
 private readonly host:RendererHost;
 private readonly core:BlackHoleScene;
 private pipeline:RenderPipeline;
 private readonly root=document.createElement('section');
 private readonly abort=new AbortController();
 private input:ObserverInput|null=null;
 private free=false;private disposed=false;private ready=false;
 private frame=0;private previous:number|null=null;private elapsed=0;
 constructor(private readonly canvas:HTMLCanvasElement){
  document.body.classList.add('experience-mode','observatory-mode');
  this.config.frozenTime=250;
  this.host=new RendererHost(canvas,this.config,m=>this.status(m,true),()=>{void this.restore();});
  this.core=new BlackHoleScene(this.config);this.core.rig.held=true;
  this.pipeline=new RenderPipeline(this.host.renderer,this.core,this.config,this.host.hdr);
  canvas.setAttribute('aria-label',ui.observatoryZh);
  this.root.className='observatory';this.root.id='observatory';
  this.root.innerHTML=`<div class="observatory-shade"></div><button class="station-fullscreen" data-fullscreen>${bilingual(ui.fullscreen)}</button><header class="observatory-header"><span><i></i>${bilingual(ui.live)}</span><span>${bilingual(ui.verified)}</span></header><div class="station-hero"><div class="station-code">${bilingual(ui.homeTag)}</div><h1>${e(credits.title.zh)}</h1><div class="station-title-zh">${e(credits.title.en)}</div><div class="station-rule"></div><p>${e(ui.homeIntroZh)}<span>${e(ui.homeIntro)}</span></p><div class="station-actions"><a id="start-journey" href="?mode=film&quality=${this.config.qualityName}&debug=0&pass=experience"><span>${e(ui.startZh)}<small>${e(ui.start)}</small></span><b>↗</b></a><button id="free-observation"><span>${e(ui.freeZh)}<small>${e(ui.free)}</small></span><b>＋</b></button></div><small class="journey-duration">${e(ui.duration)}</small></div><div class="station-target"><span>${bilingual(ui.object)}</span><p>${bilingual(ui.fictional)}</p><div class="target-coordinate" data-station="coordinates"></div></div><div class="free-instruments" hidden><h2>${e(ui.freeZh)} <small>${e(ui.free)}</small></h2><p>${e(ui.freeHintZh)}<span>${e(ui.freeHint)}</span></p><label>${bilingual(ui.zoom)}<input id="station-zoom" type="range" min="1" max="1.6" step=".01" value="1"/></label><button id="station-reset">${bilingual(ui.reset)}</button><button id="station-back">${bilingual(ui.back)}</button><a href="?mode=film&quality=${this.config.qualityName}&debug=0">${bilingual({zh:ui.startZh,en:ui.start})}</a></div><footer class="station-footer"><div><label>${bilingual({zh:ui.observatoryZh,en:ui.observatory})}</label><strong data-station="status">${bilingual(ui.online)}</strong></div><div><label>${bilingual(ui.stationClock)}</label><strong data-station="clock">00:00:00</strong></div><div><label>${bilingual(ui.radius)}</label><strong data-station="radius"></strong></div><div><label>${bilingual(ui.model)}</label><strong>${bilingual(ui.fixedObserver)}</strong></div></footer>`;
  document.querySelector('#app')!.append(this.root);
  const opt={signal:this.abort.signal};
  this.root.querySelector('#free-observation')!.addEventListener('click',()=>this.setMode(true),opt);
  this.root.querySelector('#station-back')!.addEventListener('click',()=>this.setMode(false),opt);
  this.root.querySelector('#station-reset')!.addEventListener('click',()=>{this.core.rig.recenter();this.core.rig.setZoom(1);(this.root.querySelector('#station-zoom') as HTMLInputElement).value='1';},opt);
  this.root.querySelector('#station-zoom')!.addEventListener('input',event=>this.core.rig.setZoom(Number((event.target as HTMLInputElement).value)),opt);
  window.addEventListener('resize',this.resize,opt);document.addEventListener('visibilitychange',()=>{this.previous=null;},opt);
  window.addEventListener('observatory:mode',event=>{const mode=(event as CustomEvent<{mode:string}>).detail?.mode;if(mode==='free'||mode==='station')this.setMode(mode==='free');},opt);
  this.setMode(new URLSearchParams(location.search).get('mode')==='free');this.resize();
 }
 setMode(free:boolean){
  this.free=free;this.root.dataset.mode=free?'free':'station';this.root.querySelector<HTMLElement>('.free-instruments')!.hidden=!free;
  this.input?.dispose();this.input=free?new ObserverInput(this.canvas,this.core.rig):null;
  if(!free){this.core.rig.recenter();this.core.rig.setZoom(1);}
  this.resize();this.root.dispatchEvent(new CustomEvent('observatory:changed',{detail:{mode:free?'free':'station',target:'BH-A17'},bubbles:true}));
 }
 private status(message:string,error=false){const el=document.querySelector<HTMLElement>('#status')!;el.textContent=message;el.dataset.error=String(error);}
 async start(){
  this.status(ui.preparing);await this.core.prepare(this.host.renderer,this.host.hdr);if(this.disposed)return;
  this.core.update({elapsed:250,delta:0});this.pipeline.render(0);if(this.host.shaderErrors)throw new Error('Observatory shader compilation failed');
  this.ready=true;document.body.classList.add('observatory-ready');this.status(ui.ready);this.previous=null;this.frame=requestAnimationFrame(this.tick);
 }
 private readonly tick=(now:number)=>{
  if(this.disposed||!this.ready)return;this.frame=requestAnimationFrame(this.tick);
  if(document.hidden||this.host.contextLost){this.previous=null;return;}
  const dt=this.previous===null?0:Math.max(0,(now-this.previous)/1000);this.previous=now;this.elapsed+=dt;
  try{
   this.core.update({elapsed:250+this.elapsed,delta:dt});this.pipeline.render(dt);
   const seconds=Math.floor(this.elapsed),clock=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
   this.root.querySelector('[data-station=clock]')!.textContent=clock;
   this.root.querySelector('[data-station=radius]')!.textContent=`${(this.core.observer.position.length()/this.config.observation.schwarzschildRadius).toFixed(3)} Rs`;
   this.root.querySelector('[data-station=coordinates]')!.textContent=`α ${(this.core.rig.yaw*180/Math.PI).toFixed(2)}° / δ ${(this.core.rig.pitch*180/Math.PI).toFixed(2)}°`;
   this.root.dataset.elapsed=this.elapsed.toFixed(3);this.root.dataset.yaw=this.core.rig.yaw.toFixed(4);this.root.dataset.zoom=this.core.rig.zoom.toFixed(2);this.root.dataset.shaderErrors=String(this.host.shaderErrors);
  }catch(err){this.ready=false;this.status(String(err),true);console.error(err);}
 };
 private readonly resize=()=>{
  if(this.disposed)return;this.host.resize();this.core.resize(this.host.width,this.host.height,this.host.pixelRatio);
  this.core.camera.setViewOffset(this.host.width,this.host.height,this.free?0:-this.host.width*.18,0,this.host.width,this.host.height);
  this.pipeline.resize(this.host.width,this.host.height,this.host.pixelRatio);
 };
 private async restore(){this.ready=false;cancelAnimationFrame(this.frame);this.pipeline.dispose();this.pipeline=new RenderPipeline(this.host.renderer,this.core,this.config,this.host.hdr);this.resize();try{await this.start();}catch(err){this.status(String(err),true);}}
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();this.input?.dispose();cancelAnimationFrame(this.frame);this.pipeline.dispose();this.core.dispose();this.host.dispose();this.root.remove();document.body.classList.remove('experience-mode','observatory-mode','observatory-ready');}
}
