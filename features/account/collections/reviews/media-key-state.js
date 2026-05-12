function normalizeMediaKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolveMediaKey(item) {
  if (item?.mediaKey) {
    return normalizeMediaKey(item.mediaKey);
  }

  const entityType = item?.entityType || item?.media_type || null;
  const entityId = String(item?.entityId || item?.id || '').trim();

  if (!entityType || !entityId) {
    return null;
  }

  return normalizeMediaKey(`${entityType}_${entityId}`);
}

export function buildReviewMediaKeySet(items = [], shouldInclude = () => true) {
  const set = new Set();

  items
    .filter((item) => shouldInclude(item))
    .map((item) => resolveMediaKey(item))
    .filter(Boolean)
    .forEach((key) => {
      set.add(key);

      if (key.includes(':')) {
        set.add(key.replace(/:/g, '_'));
      }

      if (key.includes('_')) {
        set.add(key.replace(/_/g, ':'));
      }
    });

  return set;
}
