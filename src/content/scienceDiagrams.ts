import { EXPLAINS } from '../film/timeline';
import type { cutState } from '../film/timeline';
type State=ReturnType<typeof cutState>;
export function diagram(type:string,s:State,t:number):string {
 const frame=(body:string)=>`<svg viewBox="0 0 300 90" aria-hidden="true">${body}</svg>`;
 const labels='<text x="8" y="82">示意 / SCHEMATIC</text>';
 if(type==='orientation')return frame('<path d="M18 40 H282" class="diagram-ray"/><circle cx="18" cy="40" r="3"/><circle cx="150" cy="40" r="3"/><circle cx="282" cy="40" r="3"/><text x="12" y="22">地球 EARTH</text><text x="127" y="22">巡航 CRUISE</text><text x="244" y="22">抵达 ARRIVAL</text><text x="12" y="68">0 yr</text><text x="119" y="68">~3000 yr</text><text x="243" y="68">~6000 yr</text>');
 if(type==='lensing')return frame('<circle cx="150" cy="42" r="14" class="diagram-mass"/><path d="M20 42 Q150 -28 280 42 M20 42 Q150 115 280 42" class="diagram-ray"/><circle cx="20" cy="42" r="3"/><circle cx="280" cy="42" r="3"/><text x="8" y="15">光源 SOURCE</text><text x="229" y="15">观测者 OBSERVER</text>'+labels);
 if(type==='spectrum')return frame('<defs><linearGradient id="spectrum"><stop stop-color="#de8a62"/><stop offset=".5" stop-color="#dadaca"/><stop offset="1" stop-color="#679ee7"/></linearGradient></defs><rect x="15" y="28" width="270" height="13" fill="url(#spectrum)" opacity=".75"/><path class="diagram-ray" d="M30 53 H100 M200 53 H270"/><text x="15" y="18">低频 LOWER ν</text><text x="224" y="18">高频 HIGHER ν</text>'+labels);
 if(type==='clocks')return frame(`<text x="12" y="20">本地 LOCAL τ</text><text x="162" y="20">收到的旧读数 τb</text><text x="12" y="53" class="diagram-number">${s.tau.toFixed(3)}</text><text x="162" y="53" class="diagram-number">${((s.echo?.reply??0)*Math.sqrt(35/36)).toFixed(3)}</text><text x="12" y="80">单位 Rs/c · 远端读数有延迟 / DELAYED</text>`);
 if(type==='cone'||type==='horizon'){const left=155+s.cone.inward*30,right=155+s.cone.outward*30;return frame(`<path class="diagram-axis" d="M35 68 H275 M155 78 V6"/><path class="diagram-cone" d="M155 68 L${left} 10 L${right} 10 Z"/><text x="258" y="83">r →</text><text x="168" y="15">T ↑</text><text x="8" y="87">r/Rs ${s.r.toFixed(3)} · PG 坐标 / COORDINATES</text>`);}
 if(type==='pulse'){let path='';for(let x=0;x<288;x+=2){const phase=((x/52-t*.8)%1+1)%1,v=Math.exp(-Math.pow((phase-.3)/.07,2.));path+=`${x?'L':'M'}${x+6} ${58-v*37} `;}return frame(`<path d="${path}" class="diagram-ray"/><text x="8" y="82">周期慢化 / PERIOD SLOWED</text>`);}
 if(type==='solar')return frame('<circle cx="28" cy="40" r="12"/><circle cx="264" cy="40" r="5"/><path d="M48 40 H250" class="diagram-ray"/><text x="99" y="25">1 AU ≈ 8m 20s</text>'+labels);
 if(type==='galaxy')return frame('<ellipse cx="152" cy="40" rx="111" ry="25" class="diagram-axis"/><circle cx="207" cy="33" r="3"/><text x="213" y="27">太阳 SUN</text><path d="M43 71 H262" class="diagram-ray"/><text x="101" y="85">~100,000 ly</text>');
 return frame('<path d="M15 48 H285" class="diagram-axis"/><circle cx="25" cy="48" r="3"/><circle cx="275" cy="48" r="3"/><path d="M25 40 Q150 3 275 40 M275 55 Q150 89 25 55" class="diagram-ray"/><text x="14" y="17">家园 HOME</text><text x="238" y="17">探测器 PROBE</text>'+labels);
}
export type Explanation=typeof EXPLAINS[number];


