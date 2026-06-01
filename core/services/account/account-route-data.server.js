import 'server-only';

import { redirect } from 'next/navigation';

import {
  EMPTY_ARRAY,
  OVERVIEW_ACTIVITY_LIMIT,
  OVERVIEW_REVIEW_LIMIT,
} from './account-route-data.constants';
import {
  loadAccountActivityRouteFeed,
  loadAccountCollection,
  loadListReviewRouteFeed,
  loadOverviewCollections,
  loadProfileReviewRouteFeed,
} from './account-route-data.loaders';
import { getCurrentEditableAccountSnapshot, getUsernameAccountSnapshot } from './account-route-data.snapshot';
import {
  createCurrentAuthPendingRouteState,
  createCurrentOverviewFallback,
  createInitialFeed,
  createInitialListFeed,
  createMissingUsernameRouteState,
  createRouteState,
  createSnapshotInitialCollections,
} from './account-route-data.state';
import { getViewerSessionContext } from './account-route-data.session';

export { getCurrentEditableAccountSnapshot, getUsernameAccountSnapshot } from './account-route-data.snapshot';

export async function getCurrentAccountOverviewRouteData() {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) {
    return createCurrentAuthPendingRouteState();
  }

  const snapshot = await getCurrentEditableAccountSnapshot();

  if (!snapshot?.resolvedUserId) {
    return createCurrentOverviewFallback(snapshot);
  }

  const [activityFeed, reviewFeed, overviewCollections] = await Promise.all([
    loadAccountActivityRouteFeed({
      pageSize: OVERVIEW_ACTIVITY_LIMIT,
      userId: snapshot.resolvedUserId,
      viewerId,
    }),
    loadProfileReviewRouteFeed({
      mode: 'authored',
      pageSize: OVERVIEW_REVIEW_LIMIT,
      userId: snapshot.resolvedUserId,
      viewerId,
    }),
    loadOverviewCollections({
      resolvedUserId: snapshot.resolvedUserId,
      viewerId,
    }),
  ]);

  return {
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.resolvedUserId),
    initialCollections: createSnapshotInitialCollections(snapshot, overviewCollections),
    initialCounts: snapshot.counts,
    initialProfile: snapshot.profile,
    initialResolveError: snapshot.resolveError,
    initialResolvedUserId: snapshot.resolvedUserId,
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.resolvedUserId),
    username: snapshot.profile?.username || null,
  };
}

export async function redirectCurrentAccountSection(sectionKey) {
  const normalizedSectionKey = String(sectionKey || '')
    .trim()
    .toLowerCase();
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) {
    redirect('/account');
  }

  const snapshot = await getCurrentEditableAccountSnapshot();
  const username = snapshot?.profile?.username || null;

  if (username && normalizedSectionKey) {
    redirect(`/account/${username}/${normalizedSectionKey}`);
  }

  redirect('/account');
}

export async function getUsernameAccountOverviewRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialActivityFeed: null,
      initialReviewFeed: null,
    });
  }

  const [activityFeed, reviewFeed, overviewCollections] = await Promise.all([
    loadAccountActivityRouteFeed({
      pageSize: OVERVIEW_ACTIVITY_LIMIT,
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    }),
    loadProfileReviewRouteFeed({
      mode: 'authored',
      pageSize: OVERVIEW_REVIEW_LIMIT,
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    }),
    loadOverviewCollections(snapshot),
  ]);

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.initialResolvedUserId),
    initialCollections: createSnapshotInitialCollections(snapshot, overviewCollections),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId),
    username,
  });
}

export async function getUsernameAccountListsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username);
  }

  const lists = await loadAccountCollection(snapshot, {
    fallback: [],
    resource: 'lists',
  });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, {
      counts: {
        ...snapshot.initialCounts,
        lists: lists.length || snapshot.initialCounts?.lists || 0,
      },
      lists,
    }),
    username,
  });
}

export async function getUsernameAccountWatchlistRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username);
  }

  const watchlist = await loadAccountCollection(snapshot, {
    fallback: [],
    resource: 'watchlist',
  });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, {
      counts: {
        ...snapshot.initialCounts,
        watchlist: watchlist.length || snapshot.initialCounts?.watchlist || 0,
      },
      watchlist,
    }),
    username,
  });
}

export async function getUsernameAccountWatchedRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username);
  }

  const watched = await loadAccountCollection(snapshot, {
    fallback: [],
    resource: 'watched',
  });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, {
      counts: {
        ...snapshot.initialCounts,
        watched: watched.length || snapshot.initialCounts?.watched || 0,
      },
      watched,
    }),
    username,
  });
}

export async function getUsernameAccountActivityRouteData(
  username,
  { page = 1, scope = 'user', sort = 'newest', subject = 'all' } = {}
) {
  const snapshot = await getUsernameAccountSnapshot(username);
  const normalizedScope = scope === 'following' ? 'following' : 'user';
  const normalizedPage = Number.isFinite(Number(page)) ? Math.max(1, Math.floor(Number(page))) : 1;

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialActivityFeed: null,
    });
  }

  const activityFeed = await loadAccountActivityRouteFeed({
    cursor: (normalizedPage - 1) * 36,
    pageSize: 36,
    scope: normalizedScope,
    sort,
    subject,
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.initialResolvedUserId, {
      page: normalizedPage,
      scope: normalizedScope,
      sort,
      subject,
    }),
    initialCollections: createSnapshotInitialCollections(snapshot),
    username,
  });
}

export async function getUsernameAccountReviewsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialReviewFeed: null,
    });
  }

  const reviewFeed = await loadProfileReviewRouteFeed({
    mode: 'authored',
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId, {
      mode: 'authored',
    }),
    username,
  });
}

export async function getUsernameAccountLikesRouteData(username, { segment = 'titles' } = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  const normalizedSegment = segment === 'reviews' || segment === 'lists' ? segment : 'titles';

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialLikedLists: null,
      initialReviewFeed: null,
    });
  }

  const [likes, likedLists, reviewFeed] = await Promise.all([
    normalizedSegment === 'titles'
      ? loadAccountCollection(snapshot, {
          fallback: [],
          resource: 'likes',
        })
      : Promise.resolve([]),
    normalizedSegment === 'lists'
      ? loadAccountCollection(snapshot, {
          fallback: [],
          resource: 'liked-lists',
        })
      : Promise.resolve([]),
    normalizedSegment === 'reviews'
      ? loadProfileReviewRouteFeed({
          mode: 'liked',
          userId: snapshot.initialResolvedUserId,
          viewerId: snapshot.viewerId,
        })
      : Promise.resolve(null),
  ]);

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, {
      ...(normalizedSegment === 'titles' ? { likes } : {}),
    }),
    initialLikedLists: createInitialListFeed(likedLists, snapshot.initialResolvedUserId, {
      mode: 'liked-lists',
    }),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId, {
      mode: 'liked',
    }),
    username,
  });
}

export async function getUsernameAccountListDetailRouteData(username, slug) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialList: null,
      initialListItems: EMPTY_ARRAY,
      initialListReviews: EMPTY_ARRAY,
    });
  }

  const list = await loadAccountCollection(snapshot, {
    fallback: null,
    resource: 'list-by-slug',
    slug,
  });

  const [listItems, listReviews] = await Promise.all([
    list?.id
      ? loadAccountCollection(snapshot, {
          fallback: [],
          listId: list.id,
          resource: 'list-items',
        })
      : Promise.resolve([]),
    list?.id
      ? loadListReviewRouteFeed({
          listId: list.id,
          ownerId: snapshot.initialResolvedUserId,
          viewerId: snapshot.viewerId,
        })
      : Promise.resolve([]),
  ]);

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot),
    initialList: list,
    initialListItems: Array.isArray(listItems) ? listItems : [],
    initialListReviews: Array.isArray(listReviews) ? listReviews : [],
    username,
  });
}
