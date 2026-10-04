import { createConfig } from '../app/config';
import { RendererHost } from '../core/RendererHost';
import { RenderPipeline } from '../rendering/RenderPipeline';
import { FilmScene } from './FilmScene';
import { FilmAudio } from '../audio/FilmAudio';
import { audioConfig, scoreUrl } from '../content/audio';
import { DRIVE_LEVELS, DEFAULT_DRIVE } from '../content/flight';
import { FlightControls } from '../experience/FlightControls';
import { bilingual, setBilingual } from '../experience/bilingual';
import { languageText } from '../content/language';
import { outgoingRelayFrequency } from './model';
import { archiveAt, cutState, SCENES, POETRY, envelope, smooth } from './timeline';
import { blackHoleEventAt } from './events';
import { JourneyController, JOURNEY_NODES, nodeAt, type JourneyNodeId } from './journey/route';
import { ui, objectLabels, timelineLabels } from '../content/uiText';
import { AnchorAnnotation } from '../experience/AnchorAnnotation';
import { CreditsOverlay } from '../experience/CreditsOverlay';
import { EXPERIENCE_DURATION, INTRO_DURATION, escapeHtml as e, preludeTime, relayState } from '../experience/presentation';
import { OpeningSequence, openingState } from '../experience/OpeningSequence';
import { opening } from '../content/opening';

const clock=(t:number)=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const distance=(ly:number)=>ly<.001?`${(ly*63241.077).toFixed(2)} AU`:`${ly.toFixed(1)} ly`;
const lightTime=(years:number)=>years<.01?`${(years*365.25*24).toFixed(2)} h`:`${years.toFixed(1)} yr`;
export class FilmApp {
 private readonly config=createConfig(location.search);
 private readonly host:RendererHost;
 private readonly scene:FilmScene;
 private pipeline:RenderPipeline;
 private readonly audio=new FilmAudio(audioConfig,scoreUrl,EXPERIENCE_DURATION,INTRO_DURATION+390);
 private readonly flight=new FlightControls(this.audio,index=>this.setDrive(index));
 private driveIndex=DEFAULT_DRIVE;
 private readonly abort=new AbortController();
 private readonly root=document.createElement('section');
 private readonly annotation=new AnchorAnnotation();
 private readonly credits=new CreditsOverlay();
 private readonly opening=new OpeningSequence();
 private readonly controller=new JourneyController(EXPERIENCE_DURATION,INTRO_DURATION);
 private previous:number|null=null;
 private frame=0;private disposed=false;private ready=false;
 private frameCount=0;private fpsAt=0;private fps=0;private dataTick=-1;private chapter='';
 private readonly fields=new Map<string,HTMLElement>();
 private readonly metrics:HTMLElement[];
 private readonly seekInput:HTMLInputElement;
 constructor(canvas:HTMLCanvasElement,userInitiated=false){
  if(userInitiated&&audioConfig.enableOnJourney)this.audio.enableFromGesture();
  this.controller.seek(this.config.frozenTime??0);this.controller.playing=this.config.frozenTime===null;
  canvas.setAttribute('aria-label',ui.filmMode);document.body.classList.add('film-mode','experience-mode');document.body.classList.remove('film-ready');
  this.host=new RendererHost(canvas,this.config,m=>this.status(m,true),()=>{void this.restore();});
  this.scene=new FilmScene(this.config);this.pipeline=new RenderPipeline(this.host.renderer,this.scene,this.config,this.host.hdr);
  this.root.id='cinematic';this.root.className='experience-film';this.root.dataset.gpu=this.host.gpuName;
  const nodes=JOURNEY_NODES.filter(n=>!['galactic','target','art'].includes(n.id));
  this.root.innerHTML=`<div class="hud-shade" aria-hidden="true"></div><header class="mission-header"><div class="mission-identity"><span data-ui="mission">${bilingual(ui.mission)}</span><h1 data-ui="chapter"></h1><p data-ui="chapter-zh"></p></div><div class="location-identity"><span data-ui="mode">${bilingual(ui.filmMode)}</span><h2 data-ui="object"></h2><p data-ui="boundary"></p></div></header><div class="system-boot" data-ui="boot"></div><div class="mission-poem" data-ui="caption"><div lang="zh-CN" data-ui="zh"></div><p lang="en" data-ui="en"></p></div><div class="event-note" data-ui="event"></div><section class="mission-telemetry" data-ui="telemetry">${Array.from({length:5},(_,i)=>`<div class="telemetry-cell" data-metric="${i}"><label></label><strong></strong><small></small></div>`).join('')}</section><nav class="mission-timeline" aria-label="${e(ui.timeline)}"><div class="timeline-heading"><span>${bilingual(ui.timeline)}</span><output id="film-time"></output></div><div class="timeline-track"><div class="timeline-fill" data-ui="progress"></div><input id="film-seek" type="range" min="0" max="${EXPERIENCE_DURATION}" step="0.1" value="0" aria-label="${e(ui.seek)}"/>${nodes.map((n,i)=>`<button class="timeline-node row-${i%2}" data-node="${n.id}" style="left:${(n.start+INTRO_DURATION)/EXPERIENCE_DURATION*100}%" aria-label="${e(languageText({zh:timelineLabels[n.id][1],en:timelineLabels[n.id][0]}))}"><i></i><span>${bilingual({zh:timelineLabels[n.id][1],en:timelineLabels[n.id][0]})}</span></button>`).join('')}</div></nav><footer class="experience-controls"><button id="film-play"></button><button id="film-replay">${bilingual(ui.replay)}</button><select id="chapter-select" aria-label="${e(ui.timeline)}">${JOURNEY_NODES.map(n=>`<option value="${n.id}">${e(languageText({zh:timelineLabels[n.id][1],en:timelineLabels[n.id][0]}))}</option>`).join('')}</select><button data-fullscreen>${bilingual(ui.fullscreen)}</button><a href="?mode=observatory&quality=${this.config.qualityName}&debug=0">${bilingual(ui.back)}</a><details class="experience-about"><summary>${bilingual(ui.scope)}</summary><p>${e(ui.scienceBoundary)}</p></details></footer>`;
  this.root.querySelectorAll<HTMLElement>('[data-ui]').forEach(el=>this.fields.set(el.dataset.ui!,el));
  this.metrics=[...this.root.querySelectorAll<HTMLElement>('.telemetry-cell')];
  this.seekInput=this.root.querySelector('#film-seek')!;
  this.root.append(this.annotation.element,this.credits.element,this.opening.element,this.flight.element,this.audio.element);document.querySelector('#app')!.append(this.root);
  const opt={signal:this.abort.signal};
  this.root.querySelector('#film-play')!.addEventListener('click',()=>{if(this.controller.time>=EXPERIENCE_DURATION)this.restart();else {this.controller.playing=!this.controller.playing;this.previous=null;this.syncAudio(true);this.updateUI();}},opt);
  this.root.querySelector('#film-replay')!.addEventListener('click',()=>this.restart(),opt);
  this.seekInput.addEventListener('input',event=>this.seek(Number((event.target as HTMLInputElement).value)),opt);
  this.root.querySelectorAll<HTMLElement>('[data-node]').forEach(button=>button.addEventListener('click',()=>this.navigate(button.dataset.node as JourneyNodeId,this.controller.playing),opt));
  this.root.querySelector('#chapter-select')!.addEventListener('change',event=>this.navigate((event.target as HTMLSelectElement).value as JourneyNodeId,this.controller.playing),opt);
  window.addEventListener('resize',this.resize,opt);
  document.addEventListener('visibilitychange',()=>{this.previous=null;this.syncAudio(true);},opt);
  this.controller.onCue(cue=>this.root.dispatchEvent(new CustomEvent('journey:cue',{detail:cue,bubbles:true})));
  canvas.addEventListener('webglcontextlost',()=>{this.previous=null;this.syncAudio(true);},opt);
  if(import.meta.env.DEV&&new URLSearchParams(location.search).get('qa')==='1')void import('../debug/ReleaseChecks').then(m=>{if(!this.disposed)m.installReleaseChecks(this.root,canvas,this.audio,this.abort.signal);});
  window.addEventListener('journey:navigate',event=>{const d=(event as CustomEvent<{node:JourneyNodeId;play?:boolean}>).detail;if(d?.node)this.navigate(d.node,Boolean(d.play));},opt);
  window.addEventListener('journey:event',event=>{const d=(event as CustomEvent<{id:string;enabled:boolean}>).detail;if(d?.id&&typeof d.enabled==='boolean')this.scene.setEventEnabled(d.id,d.enabled);},opt);
  window.addEventListener('journey:hold',()=>{this.controller.hold();this.previous=null;this.syncAudio(true);this.updateUI();},opt);
  this.resize();this.updateUI();
 }
 private get time(){return Math.max(0,this.controller.time-INTRO_DURATION);}
 navigate(node:JourneyNodeId,play=false){this.controller.navigate(node,play);this.seek(this.controller.time);}
 private field(id:string){return this.fields.get(id)!;}
 private text(id:string,value:string){if(['en','zh','chapter','chapter-zh'].includes(id)){const el=this.field(id);if(el.textContent!==value)el.textContent=value;}else setBilingual(this.field(id),value);}
 private syncAudio(force=false){this.audio.update(this.controller.time,this.controller.playing,this.controller.rate,this.ready&&!document.hidden&&!this.host.contextLost,force);}
 private setDrive(index:number){const level=DRIVE_LEVELS[index];if(!level)return;if(index>0){this.driveIndex=index;this.controller.setRate(level.rate);if(this.controller.time>=EXPERIENCE_DURATION)this.seek(0);this.controller.playing=true;}else this.controller.hold();this.previous=null;this.syncAudio(true);this.updateUI();}
 private restart(){this.driveIndex=DEFAULT_DRIVE;this.controller.setRate(1);this.controller.playing=true;this.seek(0);}
 private status(message:string,error=false){const el=document.querySelector<HTMLElement>('#status')!;el.textContent=message;el.dataset.error=String(error);}
 private seek(t:number){
  this.controller.seek(t);this.previous=null;this.dataTick=-1;
  this.scene.update({elapsed:this.controller.time,delta:0});if(this.ready)this.pipeline.render(0);this.syncAudio(true);this.updateUI();
 }
 async start(){
  this.status(ui.preparing);await this.scene.prepare(this.host.renderer,this.host.hdr);if(this.disposed)return;
  this.scene.update({elapsed:this.controller.time,delta:0});this.pipeline.render(0);if(this.host.shaderErrors)throw new Error('Film shader compilation failed');
  this.fpsAt=performance.now();this.frameCount=0;this.ready=true;document.body.classList.add('film-ready');this.status(ui.ready);this.previous=null;this.frame=requestAnimationFrame(this.tick);
 }
 private readonly tick=(now:number)=>{
  if(this.disposed||!this.ready)return;this.frame=requestAnimationFrame(this.tick);
  if(document.hidden||this.host.contextLost){this.previous=null;this.syncAudio();return;}
  const dt=this.previous===null?0:Math.max(0,(now-this.previous)/1000);this.previous=now;
  this.controller.advance(dt);
  try{this.scene.update({elapsed:this.controller.time,delta:dt*this.controller.rate});this.pipeline.render(dt);this.syncAudio();this.updateUI();
   this.frameCount++;if(now-this.fpsAt>1500){this.fps=this.frameCount*1000/(now-this.fpsAt);this.frameCount=0;this.fpsAt=now;}
   this.root.dataset.fps=this.fps.toFixed(1);this.root.dataset.shaderErrors=String(this.host.shaderErrors);
  }catch(err){this.ready=false;this.syncAudio();this.status(String(err),true);console.error(err);}
 };
 private updateUI(){
  const screen=this.controller.time,t=this.time,s=cutState(t),shot=s.shot,inCredits=t>=390,intro=openingState(screen);
  this.opening.update(screen);this.root.dataset.opening=String(intro.active);
  const hud=intro.chapter*(1-smooth(386,390,t));
  this.root.style.setProperty('--hud',String(hud));this.root.dataset.credits=String(inCredits);
  this.root.dataset.paused=String(!this.controller.playing);this.root.dataset.finished=String(screen>=EXPERIENCE_DURATION);
  const chapterKey=intro.active?'opening':String(shot.start);
  if(this.chapter!==chapterKey){this.chapter=chapterKey;this.text('chapter',intro.active?opening.originZh:`${String(SCENES.indexOf(shot)+1).padStart(2,'0')} · ${shot.zh}`);this.text('chapter-zh',intro.active?opening.origin:shot.en);}
  const titleIn=intro.active?intro.chapter:shot.start===0?1:smooth(shot.start,shot.start+1.6,t);this.field('chapter').style.transform=`translateX(${(1-titleIn)*-14}px)`;this.field('chapter').style.letterSpacing=`${.09+(1-titleIn)*.1}em`;
  this.root.style.setProperty('--object',String(smooth(32.2,33.6,screen)));
  this.text('object',objectLabels[shot.id]??ui.object);this.text('mode',s.art?ui.artistic:s.model?ui.filmMode:ui.archiveMode);
  this.text('boundary',t>=330&&t<334?ui.boundaryEnd:shot.kind);this.field('boundary').dataset.art=String(s.art);
  this.text('boot',ui.online);this.field('boot').style.opacity=String(intro.online);
  const poem=POETRY.find(p=>t>=p[0]&&t<p[1]);this.field('caption').style.opacity=String(poem?envelope(t,poem[0],poem[1],1.1):0);
  this.text('en',poem?.[2]??'');this.text('zh',poem?.[3]??'');
  const matterEvent=blackHoleEventAt(t);this.text('event',matterEvent?`${matterEvent.zh} / ${matterEvent.en}`:'');this.field('event').style.opacity=String(matterEvent?envelope(t,matterEvent.start,matterEvent.end,1.5):0);
  const annotation=this.annotation.update(t,this.scene);
  const relay=relayState(t,s.r,s.received),tick=Math.floor(screen*10);
  this.metrics.forEach((metric,i)=>{const visibility=intro.metrics[i];metric.style.opacity=String(visibility);metric.style.transform=`translateY(${(1-visibility)*.45}cqw)`;metric.style.clipPath=`inset(0 ${(1-visibility)*100}% 0 0)`;});
  // Only remote telemetry adopts a lower cadence. The local clock keeps ticking.
  if(tick!==this.dataTick){this.dataTick=tick;
   const past=archiveAt(preludeTime(Math.max(0,t-.05))),future=archiveAt(preludeTime(t+.05));
   const velocity=future.years>past.years?(future.distance-past.distance)/(future.years-past.years):0;
   let rows:string[][];
   if(s.model){
    const frequency=s.inside?'—':`${outgoingRelayFrequency(s.r).toFixed(4)} ×`;
    rows=[[ui.proper,`${s.tau.toFixed(3)} Rs/c`,ui.freeFall],[ui.radius,`${s.r.toFixed(3)} Rs`,ui.model],[ui.horizonGap,`${s.r-1>=0?'+':''}${(s.r-1).toFixed(3)} Rs`,ui.gapNote],[ui.frequency,frequency,s.inside?ui.noPath:ui.relayRadius],[ui.relay,ui[relay],`${ui.remoteUnconfirmed} · RX ${String(s.received).padStart(2,'0')}`]];
   }else if(s.art){rows=[[ui.proper,'—',ui.boundaryEnd],[ui.radius,'—',ui.artistic],[ui.homeDistance,'1200 ly',ui.fictional],[ui.frequency,'—',ui.noPath],[ui.relay,ui.noReply,ui.continues]];}
   else{rows=[[ui.speed,`${velocity.toFixed(3)} c`,ui.speedNote],[ui.epoch,`+ ${s.archive.years<1?(s.archive.years*365.25).toFixed(1)+' d':s.archive.years.toFixed(0)+' yr'}`,ui.archiveMode],[ui.homeDistance,distance(s.archive.distance),`${ui.homeRtt} · ${lightTime(s.archive.homeRtt)}`],[ui.targetDistance,distance(s.archive.remaining),ui.fictional],[ui.relay,ui.archived,ui.mission]];}
   rows.forEach((row,i)=>{
    const metric=this.metrics[i];
    if(i===4&&t>=230&&t<330&&Math.floor(t*2)===Number(metric.dataset.refresh))return;
    metric.dataset.refresh=String(Math.floor(t*2));
    [metric.querySelector('label')!,metric.querySelector('strong')!,metric.querySelector('small')!].forEach((el,j)=>{setBilingual(el,row[j]);});
   });
   this.metrics[4].dataset.warning=String(s.model&&t>=230);this.metrics[4].dataset.relay=relay;
   if(s.model&&s.inside&&t<310)setBilingual(this.metrics[4].querySelector('small')!,ui.inbound);
  }
  this.credits.update(t);this.flight.update(this.driveIndex,this.controller.playing,screen);
  this.field('progress').style.transform=`scaleX(${screen/EXPERIENCE_DURATION})`;
  this.root.querySelectorAll<HTMLElement>('[data-node]').forEach(button=>{const node=JOURNEY_NODES.find(n=>n.id===button.dataset.node)!;button.dataset.passed=String(screen>=node.start+INTRO_DURATION);button.setAttribute('aria-current',String(nodeAt(t).id===node.id));});
  this.seekInput.value=String(screen);this.seekInput.setAttribute('aria-valuetext',`${clock(screen)} / ${clock(EXPERIENCE_DURATION)}`);
  this.root.querySelector('#film-time')!.textContent=`${clock(screen)} / ${clock(EXPERIENCE_DURATION)}`;
  setBilingual(this.root.querySelector('#film-play')!,this.controller.playing?ui.pause:screen>=EXPERIENCE_DURATION?ui.replay:ui.play);
  (this.root.querySelector('#chapter-select') as HTMLSelectElement).value=nodeAt(t).id;
  Object.assign(this.root.dataset,{events:this.scene.enabledEvents,event:matterEvent?.id??'',feeding:String(this.scene.tidalEventEnabled),node:nodeAt(t).id,camera:this.scene.camera.position.toArray().map(v=>v.toFixed(5)).join(','),targetPresence:smooth(118,127,t).toFixed(5),prepass:'release',drive:DRIVE_LEVELS[this.controller.playing?this.driveIndex:0].id,rate:String(this.controller.playing?this.controller.rate:0),audio:this.audio.state,time:screen.toFixed(3),journeyTime:t.toFixed(3),localTime:s.local.toFixed(3),radius:s.model?s.r.toFixed(6):'',echoes:s.model?String(s.received):'0',phase:intro.active?'opening':inCredits?'credits':s.art?'art':s.model?s.inside?'interior':'exterior':'archive',shot:shot.id,hold:'false',inspect:annotation});
 }
 private readonly resize=()=>{if(this.disposed)return;this.host.resize();this.scene.resize(this.host.width,this.host.height,this.host.pixelRatio);this.pipeline.resize(this.host.width,this.host.height,this.host.pixelRatio);};
 private async restore(){this.ready=false;this.syncAudio(true);cancelAnimationFrame(this.frame);this.pipeline.dispose();this.pipeline=new RenderPipeline(this.host.renderer,this.scene,this.config,this.host.hdr);this.resize();try{await this.start();}catch(err){this.status(String(err),true);}}
 dispose(){if(this.disposed)return;this.disposed=true;this.abort.abort();cancelAnimationFrame(this.frame);this.audio.dispose();this.flight.dispose();this.pipeline.dispose();this.scene.dispose();this.host.dispose();this.root.remove();document.body.classList.remove('film-mode','film-ready','experience-mode');}
}
