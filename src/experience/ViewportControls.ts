import { setBilingual } from './bilingual';
import { ui } from '../content/uiText';
/** Fullscreen and audio are activated by actual browser user gestures only. */
export function installViewportControls(signal:AbortSignal){
 const refresh=()=>document.querySelectorAll<HTMLElement>('[data-fullscreen]').forEach(button=>{setBilingual(button,document.fullscreenElement?ui.exitFullscreen:ui.fullscreen);button.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));});
 document.addEventListener('fullscreenchange',refresh,{signal});
 document.addEventListener('click',event=>{
  if(!(event.target instanceof Element)||!event.target.closest('[data-fullscreen]'))return;
  const operation=document.fullscreenElement?document.exitFullscreen():document.fullscreenEnabled?document.documentElement.requestFullscreen():Promise.reject(new Error(ui.fullscreenUnavailable));
  void operation.then(refresh).catch(()=>{const button=document.querySelector<HTMLElement>('[data-fullscreen]');if(button){button.textContent=ui.fullscreenUnavailable;button.setAttribute('aria-pressed','false');}});
 },{signal});
}
