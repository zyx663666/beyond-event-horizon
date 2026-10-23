import settings from './video.config.json';

/** Add the MP4 under public/, then restart preview or rebuild the site. */
export const offlineVideoUrl = __BEH_HAS_OFFLINE_VIDEO__ ? `${import.meta.env.BASE_URL}${settings.file}` : null;
