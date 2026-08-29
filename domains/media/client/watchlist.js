'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  fetchCollectionResource,
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchMediaCollectionStatus,
} from '@/domains/account/client/collections';
import { getSupabaseClient } from '@/infrastructure/http/client';
import { scheduleAccountSummaryRefresh } from '@/domains/account/client/profile';
import {
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import {
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/utils/media-payload';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/domains/social/client/activity';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';

export function createWatchlistRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watchlist',
  );

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watchlist',
    userId,
  };
}

export function getWatchlistDocRef(userId, media) {
  return createWatchlistRef(userId, media);
}

export function getWatchlistStatusSubscriptionKey({ media, userId }) {
  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watchlist items',
  );
  return buildMediaCollectionStatusSubscriptionKey(
    'watchlist',
    userId,
    buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  );
}

export function getUserWatchlistSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId, {
    limitCount: options.limitCount ?? null,
  });
}

export async function fetchWatchlistStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isInWatchlist: false,
      item: null,
    },
    media,
    mediaKey: userId && media ? createWatchlistRef(userId, media).id : null,
    resource: 'watchlist-status',
    userId,
  });
}

export async function fetchWatchlist(userId, options = {}) {
  return fetchCollectionResource('watchlist', userId, options);
}

export function subscribeToWatchlistStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchWatchlistStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isInWatchlist), result?.item || null);
    },
    {
      ...options,
      subscriptionKey: getWatchlistStatusSubscriptionKey({ media, userId }),
    },
  );
}

export function subscribeToUserWatchlist(userId, callback, options = {}) {
  return createPollingSubscription(() => fetchWatchlist(userId, options), callback, {
    ...options,
    subscriptionKey: getUserWatchlistSubscriptionKey(userId, options),
  });
}

export async function toggleUserWatchlistItem({ media, userId }) {
  const watchlistRef = createWatchlistRef(userId, media);
  const client = getSupabaseClient();
  const row = createMediaRow(media, userId);
  const rpcRow = await executeMediaCollectionRpc({
    client,
    fnName: 'collection_toggle_watchlist',
    params: createMediaCollectionToggleRpcParams({ row }),
    fallbackMessage: 'Watchlist item could not be updated',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const isInWatchlist =
    resolvedRpcRow?.is_in_watchlist === true || resolvedRpcRow?.isInWatchlist === true;

  if (isInWatchlist) {
    const mediaSnapshot = assertTitleMedia(
      media,
      'Only movies and TV series are supported in watchlist',
    );

    fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId: mediaSnapshot.entityId,
          subjectType: mediaSnapshot.entityType,
        }),
        slotType: ACTIVITY_SLOT_TYPES.WATCHLIST_ENTRY,
      }),
      subjectId: mediaSnapshot.entityId,
      subjectPoster: media?.posterPath || media?.poster_path || null,
      subjectTitle: media?.title || media?.name || 'Untitled',
      subjectType: mediaSnapshot.entityType,
    });
  }

  const nextResult = {
    isInWatchlist,
    item: isInWatchlist ? normalizeMediaPayload(row.payload || {}, row) : null,
    mediaKey: watchlistRef.id,
  };

  primePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), nextResult);
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  });
  scheduleAccountSummaryRefresh(userId);

  return nextResult;
}

export async function removeUserWatchlistItem({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const resolvedMediaKey = mediaKey || getWatchlistDocRef(userId, media).id;
  await executeMediaCollectionRpc({
    client: getSupabaseClient(),
    fnName: 'collection_remove_watchlist',
    params: {
      p_media_key: resolvedMediaKey,
    },
    fallbackMessage: 'Watchlist item could not be removed',
  });

  invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
    payload: {
      isInWatchlist: false,
      item: null,
    },
  });
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  });
  scheduleAccountSummaryRefresh(userId);

  return {
    mediaKey: resolvedMediaKey,
  };
}
