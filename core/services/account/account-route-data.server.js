import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { fetchAccountActivityFeedServer } from '@/core/services/account/account-feed.server';
import {
  getCollectionResource,
  getAccountIdByUsername,
  getAccountProfileByUserId,
} from '@/core/services/browser/browser-data.server';
import { fetchListReviewFeedServer, fetchProfileReviewFeedServer } from '@/core/services/media/reviews.server';
import { getCurrentEditableAccountSnapshot } from '@/core/services/account/current-account-snapshot.server';

const OVERVIEW_ACTIVITY_LIMIT = 5;
const OVERVIEW_REVIEW_LIMIT = 3;
const OVERVIEW_WATCHED_LIMIT = 12;
const OVERVIEW_WATCHLIST_LIMIT = 12;

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

  return {
    error: null,
    hasMore: Boolean(feed.hasMore),
    items: Array.isArray(feed.items) ? feed.items : [],
    nextCursor: feed.nextCursor ?? null,
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

export async function getCurrentAccountOverviewRouteData() {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) {
    redirect(buildSignInHref('/account'));
  }

  const snapshot = await getCurrentEditableAccountSnapshot();

  if (!snapshot?.resolvedUserId) {
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

  const [activityFeed, reviewFeed, watched, watchlist] = await Promise.all([
    safeLoad(
      () =>
        fetchAccountActivityFeedServer({
          pageSize: OVERVIEW_ACTIVITY_LIMIT,
          userId: snapshot.resolvedUserId,
          viewerId,
        }),
      { hasMore: false, items: [] }
    ),
    safeLoad(
      () =>
        fetchProfileReviewFeedServer({
          mode: 'authored',
          pageSize: OVERVIEW_REVIEW_LIMIT,
          userId: snapshot.resolvedUserId,
          viewerId,
        }),
      { hasMore: false, items: [] }
    ),
    loadCollectionResource(
      {
        limitCount: OVERVIEW_WATCHED_LIMIT,
        resource: 'watched',
        userId: snapshot.resolvedUserId,
        viewerId,
      },
      []
    ),
    loadCollectionResource(
      {
        limitCount: OVERVIEW_WATCHLIST_LIMIT,
        resource: 'watchlist',
        userId: snapshot.resolvedUserId,
        viewerId,
      },
      []
    ),
  ]);

  return {
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.resolvedUserId),
    initialCollections: createInitialCollections({
      counts: snapshot.counts,
      resolvedUserId: snapshot.resolvedUserId,
      watched,
      watchlist,
    }),
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
    return {
      ...snapshot,
      initialActivityFeed: null,
      initialCollections: null,
      initialReviewFeed: null,
      username,
    };
  }

  const [activityFeed, reviewFeed, watched, watchlist] = await Promise.all([
    safeLoad(
      () =>
        fetchAccountActivityFeedServer({
          pageSize: OVERVIEW_ACTIVITY_LIMIT,
          userId: snapshot.initialResolvedUserId,
          viewerId: snapshot.viewerId,
        }),
      { hasMore: false, items: [] }
    ),
    safeLoad(
      () =>
        fetchProfileReviewFeedServer({
          mode: 'authored',
          pageSize: OVERVIEW_REVIEW_LIMIT,
          userId: snapshot.initialResolvedUserId,
          viewerId: snapshot.viewerId,
        }),
      { hasMore: false, items: [] }
    ),
    loadCollectionResource(
      {
        limitCount: OVERVIEW_WATCHED_LIMIT,
        resource: 'watched',
        userId: snapshot.initialResolvedUserId,
        viewerId: snapshot.viewerId,
      },
      []
    ),
    loadCollectionResource(
      {
        limitCount: OVERVIEW_WATCHLIST_LIMIT,
        resource: 'watchlist',
        userId: snapshot.initialResolvedUserId,
        viewerId: snapshot.viewerId,
      },
      []
    ),
  ]);

  return {
    ...snapshot,
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.initialResolvedUserId),
    initialCollections: createInitialCollections({
      counts: snapshot.initialCounts,
      resolvedUserId: snapshot.initialResolvedUserId,
      watched,
      watchlist,
    }),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId),
    username,
  };
}

export async function getUsernameAccountListsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      username,
    };
  }

  const lists = await loadCollectionResource(
    {
      resource: 'lists',
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    },
    []
  );

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: {
        ...snapshot.initialCounts,
        lists: lists.length || snapshot.initialCounts?.lists || 0,
      },
      lists,
      resolvedUserId: snapshot.initialResolvedUserId,
    }),
    username,
  };
}

export async function getUsernameAccountWatchlistRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      username,
    };
  }

  const watchlist = await loadCollectionResource(
    {
      resource: 'watchlist',
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    },
    []
  );

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: {
        ...snapshot.initialCounts,
        watchlist: watchlist.length || snapshot.initialCounts?.watchlist || 0,
      },
      resolvedUserId: snapshot.initialResolvedUserId,
      watchlist,
    }),
    username,
  };
}

export async function getUsernameAccountWatchedRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      username,
    };
  }

  const watched = await loadCollectionResource(
    {
      resource: 'watched',
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    },
    []
  );

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: {
        ...snapshot.initialCounts,
        watched: watched.length || snapshot.initialCounts?.watched || 0,
      },
      resolvedUserId: snapshot.initialResolvedUserId,
      watched,
    }),
    username,
  };
}

export async function getUsernameAccountActivityRouteData(username, { scope = 'user' } = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  const normalizedScope = scope === 'following' ? 'following' : 'user';

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialActivityFeed: null,
      initialCollections: null,
      username,
    };
  }

  const activityFeed = await safeLoad(
    () =>
      fetchAccountActivityFeedServer({
        scope: normalizedScope,
        userId: snapshot.initialResolvedUserId,
        viewerId: snapshot.viewerId,
      }),
    { hasMore: false, items: [], nextCursor: null }
  );

  return {
    ...snapshot,
    initialActivityFeed: createInitialFeed(activityFeed, snapshot.initialResolvedUserId, {
      scope: normalizedScope,
    }),
    initialCollections: createInitialCollections({
      counts: snapshot.initialCounts,
      resolvedUserId: snapshot.initialResolvedUserId,
    }),
    username,
  };
}

export async function getUsernameAccountReviewsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      initialReviewFeed: null,
      username,
    };
  }

  const reviewFeed = await safeLoad(
    () =>
      fetchProfileReviewFeedServer({
        mode: 'authored',
        userId: snapshot.initialResolvedUserId,
        viewerId: snapshot.viewerId,
      }),
    { hasMore: false, items: [], nextCursor: null }
  );

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: snapshot.initialCounts,
      resolvedUserId: snapshot.initialResolvedUserId,
    }),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId, {
      mode: 'authored',
    }),
    username,
  };
}

export async function getUsernameAccountLikesRouteData(username, { segment = 'films' } = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  const normalizedSegment = segment === 'reviews' || segment === 'lists' ? segment : 'films';

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      initialLikedLists: null,
      initialReviewFeed: null,
      username,
    };
  }

  const [likes, likedLists, reviewFeed] = await Promise.all([
    normalizedSegment === 'films'
      ? loadCollectionResource(
          {
            resource: 'likes',
            userId: snapshot.initialResolvedUserId,
            viewerId: snapshot.viewerId,
          },
          []
        )
      : Promise.resolve([]),
    normalizedSegment === 'lists'
      ? loadCollectionResource(
          {
            resource: 'liked-lists',
            userId: snapshot.initialResolvedUserId,
            viewerId: snapshot.viewerId,
          },
          []
        )
      : Promise.resolve([]),
    normalizedSegment === 'reviews'
      ? safeLoad(
          () =>
            fetchProfileReviewFeedServer({
              mode: 'liked',
              userId: snapshot.initialResolvedUserId,
              viewerId: snapshot.viewerId,
            }),
          { hasMore: false, items: [], nextCursor: null }
        )
      : Promise.resolve(null),
  ]);

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: snapshot.initialCounts,
      resolvedUserId: snapshot.initialResolvedUserId,
      ...(normalizedSegment === 'films' ? { likes } : {}),
    }),
    initialLikedLists: createInitialListFeed(likedLists, snapshot.initialResolvedUserId, {
      mode: 'liked-lists',
    }),
    initialReviewFeed: createInitialFeed(reviewFeed, snapshot.initialResolvedUserId, {
      mode: 'liked',
    }),
    username,
  };
}

export async function getUsernameAccountListDetailRouteData(username, slug) {
  const snapshot = await getUsernameAccountSnapshot(username);

  if (!snapshot.initialResolvedUserId) {
    return {
      ...snapshot,
      initialCollections: null,
      initialList: null,
      initialListItems: [],
      initialListReviews: [],
      username,
    };
  }

  const list = await loadCollectionResource(
    {
      resource: 'list-by-slug',
      slug,
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    },
    null
  );

  const [listItems, listReviews] = await Promise.all([
    list?.id
      ? loadCollectionResource(
          {
            listId: list.id,
            resource: 'list-items',
            userId: snapshot.initialResolvedUserId,
            viewerId: snapshot.viewerId,
          },
          []
        )
      : Promise.resolve([]),
    list?.id
      ? safeLoad(
          () =>
            fetchListReviewFeedServer({
              listId: list.id,
              ownerId: snapshot.initialResolvedUserId,
              viewerId: snapshot.viewerId,
            }),
          []
        )
      : Promise.resolve([]),
  ]);

  return {
    ...snapshot,
    initialCollections: createInitialCollections({
      counts: snapshot.initialCounts,
      resolvedUserId: snapshot.initialResolvedUserId,
    }),
    initialList: list,
    initialListItems: Array.isArray(listItems) ? listItems : [],
    initialListReviews: Array.isArray(listReviews) ? listReviews : [],
    username,
  };
}
