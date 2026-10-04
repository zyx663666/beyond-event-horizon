import settings from './audio.config.json';
/** Edit audio.config.json; restart Vite after adding/replacing the score. */
export const audioConfig = settings;
export const scoreUrl=__BEH_HAS_SCORE__ ? `${import.meta.env.BASE_URL}${settings.file}` : null;
