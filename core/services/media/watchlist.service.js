'use client';

import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service';
import {
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchMediaCollectionStatus,
  fetchUserMediaCollection,
  refreshMediaCollectionAccountSummary,
  resolveMediaCollectionRpcRow,
} from '@/core/services/shared/media-collection.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import {
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/supabase-media-utils.service';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';

function createWatchlistRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watchlist');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watchlist',
    userId,
  };
}

function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watchlist', { media, userId });
}

function getUserWatchlistSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId, {
    limitCount: options.limitCount ?? null,
  });
}

async function fetchWatchlistStatus({ media, userId }) {
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

async function fetchWatchlist(userId, options = {}) {
  return fetchUserMediaCollection('watchlist', userId, options);
}

export function getWatchlistDocRef(userId, media) {
  return createWatchlistRef(userId, media);
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
    }
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
  const rpcResult = await client.rpc('collection_toggle_watchlist', {
    p_backdrop_path: row.backdrop_path || null,
    p_entity_id: row.entity_id || null,
    p_entity_type: row.entity_type || null,
    p_media_key: row.media_key,
    p_payload: row.payload || {},
    p_poster_path: row.poster_path || null,
    p_title: row.title || null,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Watchlist item could not be updated');

  const rpcRow = resolveMediaCollectionRpcRow(rpcResult.data);
  const isInWatchlist = rpcRow?.is_in_watchlist === true;

  if (isInWatchlist) {
    const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watchlist');

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
  refreshMediaCollectionAccountSummary(userId);

  return nextResult;
}

export async function removeUserWatchlistItem({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const resolvedMediaKey = mediaKey || getWatchlistDocRef(userId, media).id;
  const client = getSupabaseClient();
  const rpcResult = await client.rpc('collection_remove_watchlist', {
    p_media_key: resolvedMediaKey,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Watchlist item could not be removed');

  invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
    payload: {
      isInWatchlist: false,
      item: null,
    },
  });
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  });
  refreshMediaCollectionAccountSummary(userId);

  return {
    mediaKey: resolvedMediaKey,
  };
}
