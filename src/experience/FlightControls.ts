import { DRIVE_LEVELS, DEFAULT_DRIVE, flightText } from '../content/flight';
import type { FilmAudio } from '../audio/FilmAudio';
import { bilingual, setBilingual } from './bilingual';
export class FlightControls {
 readonly element=document.createElement('aside');
 private readonly abort=new AbortController();private lastState='';private lastLevel=-1;
 constructor(private readonly audio:FilmAudio,onLevel:(index:number)=>void){
  this.element.className='flight-terminal';
  this.element.innerHTML=`<button class="music-link" id="music-link" aria-pressed="false"><span class="terminal-label">${bilingual(flightText.music)}</span><span class="music-state"></span><i class="music-wave" aria-hidden="true">▁▂▁▃▂▁▂</i></button><div class="drive-module"><button id="drive-current" aria-haspopup="true" aria-expanded="false"><span class="terminal-label">${bilingual(flightText.drive)}</span><span class="drive-state"></span><i aria-hidden="true">⌃</i></button><span class="director-standard">${bilingual(flightText.standard)}</span><div class="drive-bars" aria-hidden="true">${[1,2,3,4].map(i=>`<i data-bar="${i}"></i>`).join('')}</div><div class="drive-menu" hidden role="group" aria-label="航行等级 / NAVIGATION DRIVE">${DRIVE_LEVELS.map((level,i)=>`<button data-drive="${i}" aria-pressed="false">${bilingual(level)}</button>`).join('')}</div></div>`;
  const signal=this.abort.signal,current=this.element.querySelector<HTMLButtonElement>('#drive-current')!,menu=this.element.querySelector<HTMLElement>('.drive-menu')!;
  const close=()=>{menu.hidden=true;current.setAttribute('aria-expanded','false');};
  current.addEventListener('click',()=>{menu.hidden=!menu.hidden;current.setAttribute('aria-expanded',String(!menu.hidden));},{signal});
  this.element.querySelector('#music-link')!.addEventListener('click',()=>{audio.toggleFromGesture();this.lastState='';},{signal});
  this.element.querySelectorAll<HTMLElement>('[data-drive]').forEach(button=>button.addEventListener('click',()=>{onLevel(Number(button.dataset.drive));close();current.focus();},{signal}));
  document.addEventListener('click',event=>{if(!this.element.contains(event.target as Node))close();},{signal});
  this.element.addEventListener('keydown',event=>{if(event.key==='Escape'){close();current.focus();}},{signal});
 }
 update(index:number,playing:boolean,time:number){
  const level=playing?index:0,state=this.audio.state;
  this.element.style.setProperty('--terminal',String(Math.max(0,Math.min(1,(time-34)/2))));
  if(state!==this.lastState){this.lastState=state;this.element.dataset.music=state;setBilingual(this.element.querySelector('.music-state')!,flightText.state[state]);this.element.querySelector('#music-link')!.setAttribute('aria-pressed',String(state==='online'||state==='paused'));}
  if(level!==this.lastLevel){this.lastLevel=level;this.element.dataset.drive=DRIVE_LEVELS[level].id;setBilingual(this.element.querySelector('.drive-state')!,DRIVE_LEVELS[level]);this.element.querySelector<HTMLElement>('.director-standard')!.hidden=level!==DEFAULT_DRIVE;this.element.querySelectorAll<HTMLElement>('[data-drive]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.drive)===level)));this.element.querySelectorAll<HTMLElement>('[data-bar]').forEach(bar=>bar.dataset.active=String(Number(bar.dataset.bar)<=level));this.element.querySelector('.drive-state')!.getAnimations().forEach(a=>a.cancel());if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.element.querySelector('.drive-state')!.animate([{filter:'brightness(2)',clipPath:'inset(0 100% 0 0)'},{filter:'brightness(1)',clipPath:'inset(0)'}],{duration:550,easing:'ease-out'});}
 }
 dispose(){this.abort.abort();this.element.remove();}
}
