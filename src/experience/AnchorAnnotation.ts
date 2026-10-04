import { ANNOTATIONS } from '../content/annotations';
import { bilingual, setBilingual } from './bilingual';
import { ui } from '../content/uiText';
import { diagram } from '../film/diagrams';
import { cutState, smooth } from '../film/timeline';
import type { FilmScene } from '../film/FilmScene';


export class AnchorAnnotation {
 readonly element=document.createElement('section');
 private current=-1; private diagramTick=-1;
 constructor(){
  this.element.className='anchor-annotation';
  this.element.innerHTML=`<svg class="anchor-overlay" viewBox="0 0 1600 900" aria-hidden="true"><g data-anchor="reticle"><circle r="14"/><circle r="24" class="lock-ring"/><path d="M-21 0H-9 M9 0H21 M0-21V-9 M0 9V21"/><circle r="2" class="lock-point"/></g><path data-anchor="line" pathLength="1"/><circle data-anchor="elbow" r="2"/></svg><div class="annotation-copy"><div class="annotation-kicker"></div><h2></h2><h3></h3><p class="annotation-zh"></p><p class="annotation-en"></p><div class="annotation-diagram"></div><footer></footer></div>`;
 }
 update(t:number,scene:FilmScene){
  const i=ANNOTATIONS.findIndex(a=>t>=a.start&&t<a.end),a=ANNOTATIONS[i];
  this.element.hidden=!a;if(!a){this.current=-1;return '';}
  const elapsed=t-a.start,exit=1-smooth(a.end-.65,a.end,t),lock=smooth(0,.6,elapsed),line=smooth(.4,1.25,elapsed),copy=smooth(1,1.8,elapsed);
  const anchor=scene.annotationAnchor(a.anchor),x=anchor.x*1600,y=anchor.y*900;
  setBilingual(this.element.querySelector('.annotation-kicker')!,anchor.reference?ui.instrumentAnchor:ui.lock);
  this.element.dataset.annotation=String(i);this.element.dataset.anchor=anchor.reference?'instrument':'scene';
  this.element.style.opacity=String(exit);this.element.style.setProperty('--lock',String(lock));this.element.style.setProperty('--copy',String(copy));
  const reticle=this.element.querySelector<SVGGElement>('[data-anchor=reticle]')!;
  reticle.setAttribute('transform',`translate(${x} ${y}) scale(${1+(1-lock)*.65})`);reticle.style.opacity=String(lock);
  const path=this.element.querySelector<SVGPathElement>('[data-anchor=line]')!;
  const elbowX=Math.max(x+48,1010),endY=294;
  path.setAttribute('d',`M${x+24} ${y} H${elbowX} L1090 ${endY} H1120`);path.style.strokeDashoffset=String(1-line);
  const elbow=this.element.querySelector('[data-anchor=elbow]')!;elbow.setAttribute('cx',String(elbowX));elbow.setAttribute('cy',String(y));elbow.setAttribute('opacity',String(line));
  if(this.current!==i){
   this.current=i;this.diagramTick=-1;
   this.element.querySelector('h2')!.textContent=a.zh;this.element.querySelector('h3')!.textContent=a.title;
   this.element.querySelector('.annotation-en')!.textContent=a.en;this.element.querySelector('.annotation-zh')!.textContent=a.body;
  }
  const tick=Math.floor(t*8);if(tick!==this.diagramTick){this.diagramTick=tick;this.element.querySelector('.annotation-diagram')!.innerHTML=diagram(a.type,cutState(t),t);}
  this.element.querySelector('footer')!.innerHTML=`<i></i>${bilingual(ui.note)}`;
  for(const [index,el] of [...this.element.querySelectorAll<HTMLElement>('.annotation-copy > *')].entries()){
   const p=smooth(.8+index*.16,1.45+index*.16,elapsed);el.style.opacity=String(p);el.style.transform=`translateX(${(1-p)*12}px)`;
  }
  return `${a.start}`;
 }
}
