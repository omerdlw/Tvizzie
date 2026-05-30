import 'server-only';

import { getCollectionResource } from '@/core/services/account/account-collections.server';
import { fetchAccountActivityFeedServer } from '@/core/services/account/account-feed.server';
import { fetchListReviewFeedServer, fetchProfileReviewFeedServer } from '@/core/services/media/reviews/server.js';
import {
  ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS,
  EMPTY_ARRAY,
  EMPTY_ROUTE_FEED,
  OVERVIEW_LISTS_LIMIT,
  OVERVIEW_WATCHED_LIMIT,
  OVERVIEW_WATCHLIST_LIMIT,
} from './account-route-data.constants';
import { resolveSnapshotUserId } from './account-route-data.state';

function createRouteLoadTimeoutError() {
  const error = new Error('Account route optional load timed out');
  error.code = 'ACCOUNT_ROUTE_LOAD_TIMEOUT';
  return error;
}

async function withTimeout(loadPromise, timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS) {
  let timer = null;

  try {
    return await Promise.race([
      loadPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(createRouteLoadTimeoutError());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function safeLoad(load, fallback, { timeoutMs = ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS } = {}) {
  try {
    return await withTimeout(Promise.resolve().then(load), timeoutMs);
  } catch {
    return fallback;
  }
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
      const result = await withTimeout(
        getCollectionResource({
          ...input,
          strict: false,
        })
      );
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

export async function loadAccountCollection(
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

export async function loadOverviewCollections(snapshot = null) {
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

export async function loadAccountActivityRouteFeed({
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

export async function loadProfileReviewRouteFeed({ mode = 'authored', pageSize = null, userId, viewerId = null } = {}) {
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

export async function loadListReviewRouteFeed({ listId, ownerId, viewerId = null } = {}) {
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
