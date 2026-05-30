export const EMPTY_COLLECTION_COUNTS = Object.freeze({
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});

export const UNRESOLVED_COLLECTION_COUNTS = Object.freeze({
  likes: null,
  lists: null,
  watched: null,
  watchlist: null,
});

function normalizeCollectionCount(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value) || 0;
}

function getCollectionItems(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(initialCollections?.[key])) {
    return [];
  }

  return initialCollections[key];
}

function getCollectionCount(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot) {
    return null;
  }

  return normalizeCollectionCount(initialCollections?.counts?.[key]);
}

function hasUsableSeededItems(items, seededCount, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(items)) {
    return false;
  }

  return items.length > 0 || seededCount === 0;
}

export function getCollectionPreviewLimits(previewLimits = null) {
  return {
    likes: Number(previewLimits?.likes) || 0,
    lists: Number(previewLimits?.lists) || 0,
    watched: Number(previewLimits?.watched) || 0,
    watchlist: Number(previewLimits?.watchlist) || 0,
  };
}

export function hasAnyCollectionPreviewLimit(previewLimits = {}) {
  return Object.values(previewLimits).some((value) => Number(value) > 0);
}

export function createCollectionCountsForUnavailableState(isPreviewOnlyMode) {
  return isPreviewOnlyMode ? UNRESOLVED_COLLECTION_COUNTS : EMPTY_COLLECTION_COUNTS;
}

export function createSeededCollectionState({ initialCollections = null, resolvedUserId }) {
  const hasSeededCollectionSnapshot =
    Boolean(initialCollections?.userId) && Boolean(resolvedUserId) && initialCollections.userId === resolvedUserId;

  const items = {
    likes: getCollectionItems(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionItems(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionItems(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionItems(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
  };
  const counts = {
    likes: getCollectionCount(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionCount(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionCount(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionCount(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
  };

  return {
    counts: hasSeededCollectionSnapshot ? counts : UNRESOLVED_COLLECTION_COUNTS,
    hasSeededCollectionSnapshot,
    hasSeededItems: {
      likes: hasUsableSeededItems(items.likes, counts.likes, hasSeededCollectionSnapshot),
      lists: hasUsableSeededItems(items.lists, counts.lists, hasSeededCollectionSnapshot),
      watched: hasUsableSeededItems(items.watched, counts.watched, hasSeededCollectionSnapshot),
      watchlist: hasUsableSeededItems(items.watchlist, counts.watchlist, hasSeededCollectionSnapshot),
    },
    items,
  };
}

export function getSeededCollectionUsage({ hasSeededItems, shouldForcePrivateRefresh }) {
  return {
    likes: Boolean(hasSeededItems?.likes && !shouldForcePrivateRefresh),
    lists: Boolean(hasSeededItems?.lists && !shouldForcePrivateRefresh),
    watched: Boolean(hasSeededItems?.watched && !shouldForcePrivateRefresh),
    watchlist: Boolean(hasSeededItems?.watchlist && !shouldForcePrivateRefresh),
  };
}
