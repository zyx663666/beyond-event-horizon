import { opening } from '../content/opening';
import { escapeHtml as e, INTRO_DURATION } from './presentation';
const ease=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function openingState(t:number){
 return {active:t<INTRO_DURATION,title:ease(1.2,6,t)*(1-ease(20,23,t)),settle:ease(1.2,7,t),exit:ease(20,23,t),
  chinese:ease(3.8,7.2,t),theme:ease(8,10.5,t),rim:ease(10.5,13.5,t),haze:ease(12.5,16.5,t),
  clouds:ease(15,18.5,t),surface:ease(17,21,t),stars:ease(18,23,t),
  online:ease(25,26.4,t)*(1-ease(28,29.5,t)),chapter:ease(27,29,t),
  metrics:[ease(35,36,t),ease(29,30.4,t),ease(30.6,32,t),ease(32.2,33.6,t),ease(34,35.5,t)]};
}
export class OpeningSequence {
 readonly element=document.createElement('section');
 constructor(){this.element.className='opening-sequence';this.element.innerHTML=`<h1>${e(opening.title.en)}</h1><p class="opening-chinese">${e(opening.title.zh)}</p><div class="opening-theme">${e(opening.theme.en)}<span>${e(opening.theme.zh)}</span></div>`;}
 update(t:number){
  const s=openingState(t);this.element.hidden=!s.active||t>=23;
  this.element.style.opacity=String(s.title);
  this.element.style.transform=`translateY(${(-2.4*(1-s.settle)-s.exit*.65).toFixed(4)}cqw) scale(${1+.095*(1-s.settle)})`;
  this.element.querySelector<HTMLElement>('h1')!.style.letterSpacing=`${.14+.2*(1-s.settle)+s.exit*.045}em`;
  this.element.querySelector<HTMLElement>('.opening-chinese')!.style.opacity=String(s.chinese);
  this.element.querySelector<HTMLElement>('.opening-theme')!.style.opacity=String(s.theme);
 }
}
