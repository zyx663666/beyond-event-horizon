import { credits } from '../content/credits';
import { ui } from '../content/uiText';
import { envelope } from '../film/timeline';
import { creditStage, escapeHtml as e } from './presentation';
export class CreditsOverlay {
 readonly element=document.createElement('section');
 private stage='';
 constructor(){this.element.className='credits-overlay';}
 update(t:number){
  const stage=creditStage(t);this.element.hidden=stage==='none';
  if(stage!==this.stage){
   this.stage=stage;this.element.dataset.stage=stage;
   if(stage==='complete')this.element.innerHTML=`<span class="archive-seal">◦</span><h2>${e(ui.recordComplete)}</h2><p>${e(ui.recordCompleteZh)}</p>`;
   else if(stage==='message')this.element.innerHTML=`<blockquote>${e(credits.finalQuote.en)}</blockquote><p>${e(credits.finalQuote.zh)}</p>`;
   else if(stage==='authors')this.element.innerHTML=`<div class="credits-title">${e(credits.title.en)}<span>${e(credits.title.zh)}</span></div><div class="author-name"><small>${e(ui.createdBy)}</small><h2>${e(credits.author)}</h2></div><div class="credit-roles">${credits.roles.map(r=>`<div><span>${e(r.en)}<small>${e(r.zh)}</small></span><b>${e(r.name==='[AUTHOR NAME]'?credits.author:r.name)}</b></div>`).join('')}</div><div class="credit-affiliations"><span><small>${e(ui.team)}</small>${e(credits.team)}</span><span><small>${e(ui.school)}</small>${e(credits.school)}</span><span><small>${e(ui.year)}</small>${e(credits.year)}</span></div><div class="credits-sources">${e(ui.sources)}<br/>${e(ui.creditsModel)}</div>`;
   else if(stage==='closed')this.element.innerHTML=`<span class="archive-seal">—</span><h2>${e(ui.archiveClosed)}</h2><p>${e(ui.archiveClosedZh)}</p>`;
   else this.element.replaceChildren();
  }
  const windows:Record<string,number[]>={complete:[390,396],message:[396,404],authors:[404,419],closed:[419,424]};
  const window=windows[stage];this.element.style.opacity=String(window?envelope(t,window[0],window[1],1.15):0);
 }
}
