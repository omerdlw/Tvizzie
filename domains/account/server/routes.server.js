import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { readSessionFromRequest } from '@/domains/auth/server/session.server.js';
import {
  getAccountIdByUsername,
  getAccountProfileByUserId,
  getEditableAccountSnapshotByUserId,
} from './profile.server';
import { getCollectionResource } from './collections.server';
import { fetchAccountActivityFeedServer } from './feed.server';
import { fetchListReviewFeedServer, fetchProfileReviewFeedServer } from '@/domains/reviews/server/review-server.js';
import {
  ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS,
  EMPTY_ARRAY,
  EMPTY_ROUTE_FEED,
  OVERVIEW_ACTIVITY_LIMIT,
  OVERVIEW_LIKES_LIMIT,
  OVERVIEW_LISTS_LIMIT,
  OVERVIEW_REVIEW_LIMIT,
  OVERVIEW_WATCHED_LIMIT,
  OVERVIEW_WATCHLIST_LIMIT,
} from '@/domains/account/utils';

// ============================================================
// Viewer Session Helper
// ============================================================

function buildCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) { return cookieStore.get(name); },
      getAll() { return cookieStore.getAll(); },
    },
    headers: {
      get(name) {
        if (String(name || '').toLowerCase() !== 'cookie') return '';
        return cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
      },
    },
  };
}

export async function getViewerSessionContext() {
  const cookieStore = await cookies();
  const request = buildCookieRequest(cookieStore);
  return readSessionFromRequest(request).catch(() => null);
}

// ============================================================
// Route State Builders
// ============================================================

export function createRouteState(base = null, extras = null) {
  return {
    ...(base && typeof base === 'object' ? base : {}),
    ...(extras && typeof extras === 'object' ? extras : {}),
  };
}

export function createInitialCollections({ counts = null, likes = [], lists = [], resolvedUserId = null, watched = [], watchlist = [] }) {
  const normalizedLikes = Array.isArray(likes) ? likes : [];
  const normalizedLists = Array.isArray(lists) ? lists : [];
  const normalizedWatched = Array.isArray(watched) ? watched : [];
  const normalizedWatchlist = Array.isArray(watchlist) ? watchlist : [];

  const resolveCount = (value, items = []) => {
    const parsed = Number(value);
    const listLength = Array.isArray(items) ? items.length : 0;
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed), listLength) : listLength;
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
  if (!feed || !resolvedUserId) return null;
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
  if (!resolvedUserId) return null;
  return { items: Array.isArray(items) ? items : [], userId: resolvedUserId, ...(extras && typeof extras === 'object' ? extras : {}) };
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
  const resolvedUserId = resolveSnapshotUserId(snapshot);
  return {
    initialActivityFeed: null,
    initialCollections: null,
    initialCounts: null,
    initialProfile: null,
    initialResolveError: snapshot?.resolveError || null,
    initialResolvedUserId: resolvedUserId,
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
  return createRouteState(snapshot, { initialCollections: null, username, ...extras });
}

// ============================================================
// Snapshot Resolvers
// ============================================================

export async function getCurrentEditableAccountSnapshot(userId = null) {
  const resolvedUserId = userId || (await getViewerSessionContext())?.userId || null;
  if (!resolvedUserId) return null;
  return getEditableAccountSnapshotByUserId(resolvedUserId);
}

export const getUsernameAccountSnapshot = cache(async (username) => {
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
});

// ============================================================
// Data Loaders with Timeout Safety
// ============================================================

async function withTimeout(loadPromise, timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS) {
  let timer = null;
  try {
    return await Promise.race([
      loadPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error('Account route optional load timed out');
          err.code = 'ACCOUNT_ROUTE_LOAD_TIMEOUT';
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeLoad(load, fallback, { timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS } = {}) {
  try {
    return await withTimeout(Promise.resolve().then(load), timeoutMs);
  } catch {
    return fallback;
  }
}

export async function loadAccountCollection(snapshot = null, { resource, fallback = [], limitCount = null, listId = null, media = null, slug = null } = {}) {
  const userId = resolveSnapshotUserId(snapshot);
  if (!userId) return fallback;

  try {
    const result = await withTimeout(
      getCollectionResource({
        ...(limitCount !== null ? { limitCount } : {}),
        ...(listId ? { listId } : {}),
        ...(media ? { media } : {}),
        ...(slug ? { slug } : {}),
        resource,
        strict: false,
        userId,
        viewerId: snapshot?.viewerId || null,
      }),
    );
    return result && typeof result === 'object' && Object.hasOwn(result, 'data') ? result.data : (result ?? fallback);
  } catch {
    return fallback;
  }
}

export async function loadOverviewCollections(snapshot = null) {
  const userId = resolveSnapshotUserId(snapshot);
  if (!userId) return { likes: [], lists: [], watched: [], watchlist: [] };

  const [likes, watched, watchlist, lists] = await Promise.all([
    loadAccountCollection(snapshot, { fallback: [], limitCount: OVERVIEW_LIKES_LIMIT, resource: 'likes' }),
    loadAccountCollection(snapshot, { fallback: [], limitCount: OVERVIEW_WATCHED_LIMIT, resource: 'watched' }),
    loadAccountCollection(snapshot, { fallback: [], limitCount: OVERVIEW_WATCHLIST_LIMIT, resource: 'watchlist' }),
    loadAccountCollection(snapshot, { fallback: [], limitCount: OVERVIEW_LISTS_LIMIT, resource: 'lists' }),
  ]);
  return { likes, lists, watched, watchlist };
}

export async function loadAccountActivityRouteFeed({ cursor = null, pageSize = 20, scope = 'user', sort = 'newest', subject = 'all', userId, viewerId = null } = {}) {
  return safeLoad(() => fetchAccountActivityFeedServer({ cursor, pageSize, scope, sort, subject, userId, viewerId }), EMPTY_ROUTE_FEED);
}

export async function loadProfileReviewRouteFeed({ mode = 'authored', pageSize = null, userId, viewerId = null } = {}) {
  return safeLoad(() => fetchProfileReviewFeedServer({ mode, ...(pageSize !== null ? { pageSize } : {}), userId, viewerId }), EMPTY_ROUTE_FEED);
}

export async function loadListReviewRouteFeed({ listId, ownerId, viewerId = null } = {}) {
  return safeLoad(() => fetchListReviewFeedServer({ listId, ownerId, viewerId }), EMPTY_ARRAY);
}

// ============================================================
// Page Route Data Fetchers
// ============================================================

export async function getCurrentAccountOverviewRouteData() {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;
  if (!viewerId) return createCurrentAuthPendingRouteState();

  const snapshot = await getCurrentEditableAccountSnapshot(viewerId);
  if (!snapshot?.resolvedUserId) return createCurrentOverviewFallback(snapshot);
  // /account is only a canonical redirect. Do not load the overview payload
  // before redirecting to /account/[username].
  return {
    initialCounts: snapshot.counts,
    initialProfile: snapshot.profile,
    initialResolveError: snapshot.resolveError,
    initialResolvedUserId: snapshot.resolvedUserId,
    initialReviewFeed: null,
    username: snapshot.profile?.username || null,
  };
}

export async function redirectCurrentAccountSection(sectionKey) {
  const normalizedSectionKey = String(sectionKey || '').trim().toLowerCase();
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;

  if (!viewerId) redirect('/account');
  const snapshot = await getCurrentEditableAccountSnapshot(viewerId);
  const username = snapshot?.profile?.username || null;

  if (username && normalizedSectionKey) redirect(`/account/${username}/${normalizedSectionKey}`);
  redirect('/account');
}

export async function getUsernameAccountOverviewRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) {
    return createMissingUsernameRouteState(snapshot, username, { initialActivityFeed: null, initialReviewFeed: null });
  }

  const [{ likes, lists, watched, watchlist }, rawActivityFeed] = await Promise.all([
    loadOverviewCollections(snapshot),
    loadAccountActivityRouteFeed({
      pageSize: OVERVIEW_ACTIVITY_LIMIT,
      scope: 'user',
      sort: 'newest',
      subject: 'all',
      userId: snapshot.initialResolvedUserId,
      viewerId: snapshot.viewerId,
    }),
  ]);

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(rawActivityFeed, snapshot.initialResolvedUserId),
    initialCollections: createSnapshotInitialCollections(snapshot, { likes, lists, watched, watchlist }),
    initialReviewFeed: null,
    username,
  });
}

export async function getUsernameAccountListsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const lists = await loadAccountCollection(snapshot, { fallback: [], resource: 'lists' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { lists }),
    username,
  });
}

export async function getUsernameAccountActivityRouteData(username, query = {}) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username, { initialActivityFeed: null });

  const scope = query?.scope === 'following' ? 'following' : 'user';
  const sort = query?.sort || (query?.asort === 'oldest' ? 'oldest' : 'newest');
  const subject = query?.subject || (query?.asub === 'list' || query?.asub === 'movie' || query?.asub === 'tv' ? query.asub : 'all');
  const page = Number.isFinite(Number(query?.page)) ? Math.max(1, Math.floor(Number(query.page))) : 1;

  const rawFeed = await loadAccountActivityRouteFeed({
    cursor: (page - 1) * 36,
    pageSize: 36,
    scope,
    sort,
    subject,
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialActivityFeed: createInitialFeed(rawFeed, snapshot.initialResolvedUserId, {
      page,
      scope,
      sort,
      subject,
    }),
    username,
  });
}

export async function getUsernameAccountLikesRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const likes = await loadAccountCollection(snapshot, { fallback: [], resource: 'likes' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { likes }),
    username,
  });
}

export async function getUsernameAccountListDetailRouteData(username, slug) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const list = await loadAccountCollection(snapshot, { fallback: null, resource: 'list-by-slug', slug });
  const listItems = list?.id ? await loadAccountCollection(snapshot, { fallback: [], listId: list.id, resource: 'list-items' }) : [];
  const listReviews = list?.id ? await loadListReviewRouteFeed({ listId: list.id, ownerId: snapshot.initialResolvedUserId, viewerId: snapshot.viewerId }) : [];

  return createRouteState(snapshot, {
    initialList: list,
    initialListFeed: createInitialListFeed(listItems, snapshot.initialResolvedUserId, { reviews: listReviews }),
    initialListItems: listItems,
    initialListReviews: listReviews,
    username,
  });
}

export async function getUsernameAccountReviewsRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username, { initialReviewFeed: null });

  const rawFeed = await loadProfileReviewRouteFeed({
    mode: 'authored',
    userId: snapshot.initialResolvedUserId,
    viewerId: snapshot.viewerId,
  });

  return createRouteState(snapshot, {
    initialReviewFeed: createInitialFeed(rawFeed, snapshot.initialResolvedUserId, {
      mode: 'authored',
    }),
    username,
  });
}

export async function getUsernameAccountWatchedRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const watched = await loadAccountCollection(snapshot, { fallback: [], resource: 'watched' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { watched }),
    username,
  });
}

export async function getUsernameAccountWatchlistRouteData(username) {
  const snapshot = await getUsernameAccountSnapshot(username);
  if (!snapshot.initialResolvedUserId) return createMissingUsernameRouteState(snapshot, username);

  const watchlist = await loadAccountCollection(snapshot, { fallback: [], resource: 'watchlist' });

  return createRouteState(snapshot, {
    initialCollections: createSnapshotInitialCollections(snapshot, { watchlist }),
    username,
  });
}
