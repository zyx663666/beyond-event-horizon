import { App } from './app/App';
import { FilmApp } from './film/FilmApp';
import { ObservatoryApp } from './experience/ObservatoryApp';
import legacy from './content/legacy.html?raw';
import { credits } from './content/credits';
import { installViewportControls } from './experience/ViewportControls';
import './style.css';
import './experience.css';

let app: App | FilmApp | ObservatoryApp | undefined;
const lifecycle = new AbortController();
installViewportControls(lifecycle.signal);
function launch(userInitiated=false): void {
app?.dispose();
try {
  document.title=`${credits.title.zh} · ${credits.title.en}`;
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode==='lab'){
    document.querySelector('#status')?.remove();
    let lab=document.querySelector<HTMLElement>('#legacy-ui');
    if(!lab){lab=document.createElement('div');lab.id='legacy-ui';document.querySelector('#app')!.append(lab);}
    lab.innerHTML=legacy;
  }
  const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
  app = mode==='film'?new FilmApp(canvas,userInitiated):mode==='lab'?new App(canvas):new ObservatoryApp(canvas);
  app.start().catch(reportError);
} catch (error) { reportError(error); }
}
launch();
// Stay in the same document so START JOURNEY retains the trusted audio gesture.
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!(event.target instanceof Element))return;
 const link=event.target.closest<HTMLAnchorElement>('a[href]');if(!link||link.target||link.hasAttribute('download'))return;
 const url=new URL(link.href);if(url.origin!==location.origin||url.pathname!==location.pathname||!['film','observatory','free'].includes(url.searchParams.get('mode')??''))return;
 event.preventDefault();history.pushState(null,'',url);launch(true);
},{signal:lifecycle.signal});
window.addEventListener('popstate',()=>launch(),{signal:lifecycle.signal});
window.addEventListener("pagehide", () => app?.dispose(), { signal: lifecycle.signal });
window.addEventListener("pageshow", event => { if (event.persisted) launch(); }, { signal: lifecycle.signal });
function reportError(error: unknown): void {
  console.error('[BEH]', error);
  const status = document.querySelector<HTMLElement>('#status')!;
  status.textContent = error instanceof Error ? error.message : String(error);
  status.dataset.error = 'true';
  app?.dispose();
  document.body.classList.add('experience-mode');
}
if (import.meta.hot) import.meta.hot.dispose(() => { lifecycle.abort(); app?.dispose(); });

