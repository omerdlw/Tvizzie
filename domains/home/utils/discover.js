export const ALL_GENRE_ID = 'all';
export const MOBILE_DISCOVER_BATCH = 9;
export const DESKTOP_DISCOVER_BATCH = 24;
export const MOBILE_DISCOVER_MEDIA_QUERY = '(max-width: 639px)';

export function getUniqueDiscoverItems(items = [], limit = items.length) {
  const seen = new Set();
  return items
    .filter((item) => {
      const id = item?.id;
      const mediaType = item?.media_type || item?.entityType || 'movie';
      const key = `${mediaType}:${id}`;

      if (!id || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function getDiscoverBatchSize(isMobileGrid) {
  return isMobileGrid ? MOBILE_DISCOVER_BATCH : DESKTOP_DISCOVER_BATCH;
}
