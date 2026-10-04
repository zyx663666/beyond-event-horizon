/** Audience language hierarchy. Existing archive strings are normalized here. */
export const LANGUAGE_ORDER = ['zh', 'en'] as const;
export type Bilingual = { zh: string; en: string };
export function language(value: string | Bilingual): Bilingual {
  if (typeof value !== 'string') return value;
  const parts=value.split(' / '), chinese=parts.filter(p=>/[\u3400-\u9fff]/.test(p));
  if (!chinese.length) return {zh:value,en:''};
  return {zh:chinese.join(' / '),en:parts.filter(p=>!/[\u3400-\u9fff]/.test(p)).join(' / ')};
}
export const languageText=(value:string|Bilingual)=>LANGUAGE_ORDER.map(key=>language(value)[key]).filter(Boolean).join(' / ');
