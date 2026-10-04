import type { FilmAudio } from '../audio/FilmAudio';
/** Local-only, generated test signal. Vite removes this import from production. */
export function installReleaseChecks(root:HTMLElement,canvas:HTMLCanvasElement,audio:FilmAudio,signal:AbortSignal){
 const panel=document.createElement('div');panel.id='release-checks';panel.style.cssText='position:absolute;right:4%;top:23%;z-index:40;pointer-events:auto;background:#09141e;padding:8px;font-size:12px';
 panel.innerHTML='<button data-check="tone">QA 音频测试信号</button> · <button data-check="context">QA 重建 WebGL</button><output></output>';root.append(panel);
 let url='';
 panel.querySelector('[data-check=tone]')!.addEventListener('click',()=>{
  const rate=8000,seconds=462,data=new ArrayBuffer(44+rate*seconds*2),v=new DataView(data);
  const text=(offset:number,s:string)=>[...s].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,data.byteLength-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,data.byteLength-44,true);
  for(let i=0;i<rate*seconds;i++)v.setInt16(44+i*2,Math.sin(i/rate*Math.PI*440)*700,true);
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([data],{type:'audio/wav'}));audio.replaceSource(url);audio.enableFromGesture();panel.querySelector('output')!.textContent=' 测试信号已接入';
 },{signal});
 panel.querySelector('[data-check=context]')!.addEventListener('click',()=>{
  const extension=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
  if(extension){extension.loseContext();setTimeout(()=>{if(!signal.aborted)extension.restoreContext();},1200);}
 },{signal});
 signal.addEventListener('abort',()=>{if(url)URL.revokeObjectURL(url);panel.remove();},{once:true});
}
