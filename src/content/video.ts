/** The build selects the original local film or the online playback edition. */
export const offlineVideoUrl = __BEH_HAS_OFFLINE_VIDEO__ ? `${import.meta.env.BASE_URL}${__BEH_OFFLINE_VIDEO_FILE__}` : null;
