import 'server-only';

export function createRouteState(base = null, extras = null) {
  return {
    ...(base && typeof base === 'object' ? base : {}),
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

export function createInitialCollections({
  counts = null,
  likes = [],
  lists = [],
  resolvedUserId = null,
  watched = [],
  watchlist = [],
}) {
  const normalizedLikes = Array.isArray(likes) ? likes : [];
  const normalizedLists = Array.isArray(lists) ? lists : [];
  const normalizedWatched = Array.isArray(watched) ? watched : [];
  const normalizedWatchlist = Array.isArray(watchlist) ? watchlist : [];
  const resolveCount = (value, items = []) => {
    const parsed = Number(value);
    const listLength = Array.isArray(items) ? items.length : 0;

    if (!Number.isFinite(parsed)) {
      return listLength;
    }

    return Math.max(0, Math.floor(parsed), listLength);
  };

  return {
    counts: {
      likes: resolveCount(counts?.likes, normalizedLikes),
      lists: resolveCount(counts?.lists, normalizedLists),
      watched: resolveCount(counts?.watched, normalizedWatched),
      watchlist: resolveCount(counts?.watchlist, normalizedWatchlist),
    },
    likes: normalizedLikes,
    lists: normalizedLists,
    userId: resolvedUserId,
    watched: normalizedWatched,
    watchlist: normalizedWatchlist,
  };
}

export function createInitialFeed(feed = null, resolvedUserId = null, extras = null) {
  if (!feed || !resolvedUserId) {
    return null;
  }

  const normalizedItems = Array.isArray(feed.items) ? feed.items : [];
  const normalizedTotalCount = Number.isFinite(Number(feed.totalCount))
    ? Math.max(0, Math.floor(Number(feed.totalCount)))
    : normalizedItems.length;

  return {
    error: null,
    hasMore: Boolean(feed.hasMore),
    items: normalizedItems,
    nextCursor: feed.nextCursor ?? null,
    totalCount: normalizedTotalCount,
    userId: resolvedUserId,
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

export function createInitialListFeed(items = [], resolvedUserId = null, extras = null) {
  if (!resolvedUserId) {
    return null;
  }

  return {
    items: Array.isArray(items) ? items : [],
    userId: resolvedUserId,
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

export function resolveSnapshotUserId(snapshot = null) {
  return snapshot?.initialResolvedUserId || snapshot?.resolvedUserId || null;
}

export function resolveSnapshotCounts(snapshot = null) {
  return snapshot?.initialCounts || snapshot?.counts || null;
}

export function createSnapshotInitialCollections(snapshot = null, collections = {}) {
  return createInitialCollections({
    counts: resolveSnapshotCounts(snapshot),
    resolvedUserId: resolveSnapshotUserId(snapshot),
    ...(collections && typeof collections === 'object' ? collections : {}),
  });
}

export function createCurrentOverviewFallback(snapshot = null) {
  return {
    initialActivityFeed: null,
    initialCollections: null,
    initialCounts: null,
    initialProfile: null,
    initialResolveError: snapshot?.resolveError || 'Account not found',
    initialResolvedUserId: null,
    initialReviewFeed: null,
    username: null,
  };
}

export function createCurrentAuthPendingRouteState() {
  return {
    initialActivityFeed: null,
    initialCollections: null,
    initialCounts: null,
    initialProfile: null,
    initialResolveError: null,
    initialResolvedUserId: null,
    initialReviewFeed: null,
    username: null,
  };
}

export function createMissingUsernameRouteState(snapshot, username, extras = {}) {
  return createRouteState(snapshot, {
    initialCollections: null,
    username,
    ...extras,
  });
}
