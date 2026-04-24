import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { getCollectionResource } from '@/core/services/account/account-collections.server';
import { fetchAccountActivityFeedServer } from '@/core/services/account/account-feed.server';
import { getEditableAccountSnapshotByUserId } from '@/core/services/account/account.server';
import {
  getAccountIdByUsername,
  getAccountProfileByUserId,
} from '@/core/services/account/account-profile.server';
import { fetchListReviewFeedServer, fetchProfileReviewFeedServer } from '@/core/services/media/reviews.server';

const OVERVIEW_ACTIVITY_LIMIT = 36;
const OVERVIEW_LISTS_LIMIT = 3;
const OVERVIEW_REVIEW_LIMIT = 3;
const OVERVIEW_WATCHED_LIMIT = 12;
const OVERVIEW_WATCHLIST_LIMIT = 12;
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_ROUTE_FEED = Object.freeze({
  hasMore: false,
  items: EMPTY_ARRAY,
  nextCursor: null,
});

function buildCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) {
        return cookieStore.get(name);
      },
    },
    headers: {
      get(name) {
        if (String(name || '').toLowerCase() !== 'cookie') {
          return '';
        }

        return cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ');
      },
    },
  };
}

function buildSignInHref(nextPath) {
  const params = new URLSearchParams();

  if (nextPath) {
    params.set('next', nextPath);
  }

  const query = params.toString();
  return query ? `/sign-in?${query}` : '/sign-in';
}

async function getViewerSessionContext() {
  const cookieStore = await cookies();
  const request = buildCookieRequest(cookieStore);

  return readSessionFromRequest(request).catch(() => null);
}

export async function getCurrentEditableAccountSnapshot() {
  const sessionContext = await getViewerSessionContext();

  if (!sessionContext?.userId) {
    return null;
  }

  return getEditableAccountSnapshotByUserId(sessionContext.userId);
}

async function safeLoad(load, fallback) {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createRouteState(base = null, extras = null) {
  return {
    ...(base && typeof base === 'object' ? base : {}),
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

function createInitialCollections({
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

function createInitialFeed(feed = null, resolvedUserId = null, extras = null) {
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

function createInitialListFeed(items = [], resolvedUserId = null, extras = null) {
  if (!resolvedUserId) {
    return null;
  }

  return {
    items: Array.isArray(items) ? items : [],
    userId: resolvedUserId,
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

function normalizeCollectionResourceValue(result, fallback = []) {
  if (result && typeof result === 'object' && Object.hasOwn(result, 'data')) {
    return result.data;
  }

  return result ?? fallback;
}

async function loadCollectionResource(input = {}, fallback = []) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await getCollectionResource({
        ...input,
        strict: false,
      });
      return normalizeCollectionResourceValue(result, fallback);
    } catch (error) {
      if (attempt >= maxAttempts) {
        return fallback;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[account-route-data] Collection retry ${attempt}/${maxAttempts - 1} failed for "${input?.resource || 'unknown'}"`,
          error
        );
      }

      await delay(140 * attempt);
    }
  }

  return fallback;
}

function resolveSnapshotUserId(snapshot = null) {
  return snapshot?.initialResolvedUserId || snapshot?.resolvedUserId || null;
}

function resolveSnapshotCounts(snapshot = null) {
  return snapshot?.initialCounts || snapshot?.counts || null;
}

function createSnapshotInitialCollections(snapshot = null, collections = {}) {
  return createInitialCollections({
    counts: resolveSnapshotCounts(snapshot),
    resolvedUserId: resolveSnapshotUserId(snapshot),
    ...(collections && typeof collections === 'object' ? collections : {}),
  });
}

async function loadAccountCollection(
  snapshot = null,
  { resource, fallback = [], limitCount = null, listId = null, media = null, slug = null } = {}
) {
  const userId = resolveSnapshotUserId(snapshot);

  if (!userId) {
    return fallback;
  }

  return loadCollectionResource(
    {
      ...(limitCount !== null ? { limitCount } : {}),
      ...(listId ? { listId } : {}),
      ...(media ? { media } : {}),
      ...(slug ? { slug } : {}),
      resource,
      userId,
      viewerId: snapshot?.viewerId || null,
    },
    fallback
  );
}

async function loadOverviewCollections(snapshot = null) {
  const userId = resolveSnapshotUserId(snapshot);

  if (!userId) {
    return {
      lists: [],
      watched: [],
      watchlist: [],
    };
  }

  const [watched, watchlist, lists] = await Promise.all([
    loadAccountCollection(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_WATCHED_LIMIT,
      resource: 'watched',
    }),
    loadAccountCollection(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_WATCHLIST_LIMIT,
      resource: 'watchlist',
    }),
    loadAccountCollection(snapshot, {
      fallback: [],
      limitCount: OVERVIEW_LISTS_LIMIT,
      resource: 'lists',
    }),
  ]);

  return {
    lists,
    watched,
    watchlist,
  };
}

async function loadAccountActivityRouteFeed({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
  viewerId = null,
} = {}) {
  return safeLoad(
    () =>
      fetchAccountActivityFeedServer({
        cursor,
        pageSize,
        scope,
        sort,
        subject,
        userId,
        viewerId,
      }),
    EMPTY_ROUTE_FEED
  );
}

async function loadProfileReviewRouteFeed({ mode = 'authored', pageSize = null, userId, viewerId = null } = {}) {
  return safeLoad(
    () =>
      fetchProfileReviewFeedServer({
        mode,
        ...(pageSize !== null ? { pageSize } : {}),
        userId,
        viewerId,
      }),
    EMPTY_ROUTE_FEED
  );
}

async function loadListReviewRouteFeed({ listId, ownerId, viewerId = null } = {}) {
  return safeLoad(
    () =>
      fetchListReviewFeedServer({
        listId,
        ownerId,
        viewerId,
      }),
    EMPTY_ARRAY
  );
}

function createCurrentOverviewFallback(snapshot = null) {
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

function createMissingUsernameRouteState(snapshot, username, extras = {}) {
  return createRouteState(snapshot, {
    initialCollections: null,
    username,
    ...extras,
  });
}

export async function getCurrentAccountOverviewRouteData() {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) {
    redirect(buildSignInHref('/account'));
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
  const sectionPath = normalizedSectionKey ? `/account/${normalizedSectionKey}` : '/account';
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) {
    redirect(buildSignInHref(sectionPath));
  }

  const snapshot = await getCurrentEditableAccountSnapshot();
  const username = snapshot?.profile?.username || null;

  if (username && normalizedSectionKey) {
    redirect(`/account/${username}/${normalizedSectionKey}`);
  }

  redirect('/account');
}

export async function getUsernameAccountSnapshot(username) {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;
  const resolvedUserId = await getAccountIdByUsername(username);

  if (!resolvedUserId) {
    return {
      initialCounts: null,
      initialProfile: null,
      initialResolveError: 'Account not found',
      initialResolvedUserId: null,
      viewerId,
    };
  }

  const profile = await getAccountProfileByUserId(resolvedUserId, { viewerId });

  return {
    initialCounts: {
      likes: Number(profile?.likesCount || 0),
      lists: Number(profile?.listsCount || 0),
      watched: Number(profile?.watchedCount || 0),
      watchlist: Number(profile?.watchlistCount || 0),
    },
    initialProfile: profile,
    initialResolveError: profile ? null : 'Account not found',
    initialResolvedUserId: profile ? resolvedUserId : null,
    viewerId,
  };
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

export async function getUsernameAccountLikesRouteData(username, { segment = 'films' } = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  const normalizedSegment = segment === 'reviews' || segment === 'lists' ? segment : 'films';

  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, {
      initialLikedLists: null,
      initialReviewFeed: null,
    });
  }

  const [likes, likedLists, reviewFeed] = await Promise.all([
    normalizedSegment === 'films'
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
      ...(normalizedSegment === 'films' ? { likes } : {}),
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
