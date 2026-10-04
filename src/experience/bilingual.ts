import { language, LANGUAGE_ORDER, type Bilingual } from '../content/language';
import { escapeHtml } from './presentation';
export function bilingual(value:string|Bilingual){
 const pair=language(value);
 return LANGUAGE_ORDER.filter(key=>pair[key]).map((key,i)=>`<span class="lang-${i===0?'primary':'secondary'}" lang="${key==='zh'?'zh-CN':'en'}">${escapeHtml(pair[key])}</span>`).join('');
}
export function setBilingual(element:Element,value:string|Bilingual){
 const html=bilingual(value);if(element.innerHTML!==html)element.innerHTML=html;
}
