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
function launch(): void {
try {
  document.title=credits.title.en;
  const mode=new URLSearchParams(location.search).get('mode');
  if(mode==='lab'){
    document.querySelector('#status')?.remove();
    let lab=document.querySelector<HTMLElement>('#legacy-ui');
    if(!lab){lab=document.createElement('div');lab.id='legacy-ui';document.querySelector('#app')!.append(lab);}
    lab.innerHTML=legacy;
  }
  const Runner = mode === 'film' ? FilmApp : mode==='lab' ? App : ObservatoryApp;
  app = new Runner(document.querySelector<HTMLCanvasElement>('#scene')!);
  app.start().catch(reportError);
} catch (error) { reportError(error); }
}
launch();
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

