function normalizeMediaIdentity(item = {}) {
  const mediaKey = String(item?.mediaKey || '').trim();

  if (mediaKey) {
    return mediaKey;
  }

  const entityType = String(item?.entityType || item?.media_type || '')
    .trim()
    .toLowerCase();
  const entityId = String(item?.entityId || item?.id || '').trim();

  if (!entityType || !entityId) {
    return '';
  }

  return `${entityType}:${entityId}`;
}

function hasGenreMetadata(item = {}) {
  return (
    (Array.isArray(item?.genre_ids) && item.genre_ids.length > 0) ||
    (Array.isArray(item?.genreNames) && item.genreNames.length > 0) ||
    (Array.isArray(item?.genres) && item.genres.length > 0)
  );
}

export function mergeCollectionItemsWithExistingMetadata(currentItems = [], nextItems = []) {
  const previousItemMap = new Map(
    (Array.isArray(currentItems) ? currentItems : [])
      .map((item) => [normalizeMediaIdentity(item), item])
      .filter(([key]) => Boolean(key))
  );

  return (Array.isArray(nextItems) ? nextItems : []).map((item) => {
    if (hasGenreMetadata(item)) {
      return item;
    }

    const previousItem = previousItemMap.get(normalizeMediaIdentity(item));

    if (!previousItem || !hasGenreMetadata(previousItem)) {
      return item;
    }

    return {
      ...item,
      genreNames: Array.isArray(previousItem.genreNames) ? previousItem.genreNames : item.genreNames,
      genre_ids: Array.isArray(previousItem.genre_ids) ? previousItem.genre_ids : item.genre_ids,
      genres: Array.isArray(previousItem.genres) ? previousItem.genres : item.genres,
    };
  });
}
