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
  createMediaPayload,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/supabase-media-utils.service';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';

function createWatchedRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watched items');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watched',
    userId,
  };
}

function getWatchedStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watched', { media, userId });
}

function getUserWatchedSubscriptionKey(userId) {
  return buildUserMediaCollectionSubscriptionKey('watched', userId);
}

function getUserWatchlistSubscriptionKey(userId) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId);
}

function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watchlist', { media, userId });
}

async function fetchWatchedStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isWatched: false,
      watched: null,
    },
    media,
    mediaKey: userId && media ? createWatchedRef(userId, media).id : null,
    resource: 'watched-status',
    userId,
  });
}

async function fetchWatchedList(userId, options = {}) {
  return fetchUserMediaCollection('watched', userId, options);
}

export function getWatchedDocRef(userId, media) {
  return createWatchedRef(userId, media);
}

export async function isUserMediaWatched({ mediaKey, userId }) {
  if (!mediaKey || !userId) {
    return false;
  }

  const client = getSupabaseClient();
  const result = await client.from('watched').select('media_key').eq('media_key', mediaKey).eq('user_id', userId).maybeSingle();

  assertSupabaseResult(result, 'Watched state could not be loaded');

  return Boolean(result.data?.media_key);
}

export function subscribeToWatchedStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchWatchedStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isWatched), result?.watched || null);
    },
    {
      ...options,
      subscriptionKey: getWatchedStatusSubscriptionKey({ media, userId }),
    }
  );
}

export function subscribeToUserWatched(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchWatchedList(userId, options), callback, {
    ...options,
    subscriptionKey: getUserWatchedSubscriptionKey(userId),
  });
}

export async function markUserWatched({ media, sourceLastAction = 'watched', userId, watchedAt = new Date() }) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watched items');
  const watchedAtValue = watchedAt instanceof Date ? watchedAt : new Date(watchedAt);

  if (Number.isNaN(watchedAtValue.getTime())) {
    throw new Error('watchedAt is invalid');
  }

  const watchedAtIso = watchedAtValue.toISOString();
  const watchedRef = createWatchedRef(userId, media);
  const client = getSupabaseClient();
  const mediaPayload = createMediaPayload(media, userId, {
    addedAt: watchedAtIso,
    updatedAt: new Date().toISOString(),
  });
  const watchedPayload = {
    ...mediaPayload,
    firstWatchedAt: watchedAtIso,
    lastWatchedAt: watchedAtIso,
    sourceLastAction,
    watchCount: 1,
  };
  const rpcResult = await client.rpc('collection_mark_watched', {
    p_backdrop_path: mediaPayload.backdrop_path || null,
    p_entity_id: mediaPayload.entityId || null,
    p_entity_type: mediaPayload.entityType || null,
    p_last_watched_at: watchedAtIso,
    p_media_key: watchedRef.id,
    p_payload: watchedPayload,
    p_poster_path: mediaPayload.poster_path || null,
    p_source_last_action: sourceLastAction || 'watched',
    p_title: mediaPayload.title || null,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Watched item could not be saved');

  const rpcRow = resolveMediaCollectionRpcRow(rpcResult.data);
  const isNew = rpcRow?.is_new === true;
  const watchCount = Number(rpcRow?.watch_count || 1);
  const wasRemovedFromWatchlist = rpcRow?.was_removed_from_watchlist === true;

  if (isNew) {
    fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHED_ADDED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId: mediaSnapshot.entityId,
          subjectType: mediaSnapshot.entityType,
        }),
        slotType: ACTIVITY_SLOT_TYPES.WATCHED_ENTRY,
      }),
      subjectId: mediaSnapshot.entityId,
      subjectPoster: media?.poster_path || media?.posterPath || null,
      subjectTitle: media?.title || media?.name || 'Untitled',
      subjectType: mediaSnapshot.entityType,
      watchedAt: watchedAtIso,
    });
  }

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: true,
    watched: {
      ...normalizeMediaPayload(media, {
        entity_id: mediaSnapshot.entityId,
        entity_type: mediaSnapshot.entityType,
      }),
      firstWatchedAt: watchedAtIso,
      lastWatchedAt: watchedAtIso,
      sourceLastAction,
      watchCount,
    },
  });
  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  });
  invalidatePollingSubscription(getUserWatchlistSubscriptionKey(userId), {
    refetch: true,
  });
  invalidatePollingSubscription(getWatchlistStatusSubscriptionKey({ media, userId }), {
    payload: {
      isInWatchlist: false,
      item: null,
    },
  });
  refreshMediaCollectionAccountSummary(userId);

  return {
    isAlreadyWatched: !isNew,
    mediaKey: watchedRef.id,
    wasRemovedFromWatchlist,
    watchCount,
  };
}

export async function removeUserWatchedItem({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const resolvedMediaKey = mediaKey || getWatchedDocRef(userId, media).id;
  const client = getSupabaseClient();
  const rpcResult = await client.rpc('collection_remove_watched', {
    p_media_key: resolvedMediaKey,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Watched item could not be removed');

  const rpcRow = resolveMediaCollectionRpcRow(rpcResult.data);
  const wasRemoved = rpcRow?.removed === true;

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: false,
    watched: null,
  });

  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  });
  refreshMediaCollectionAccountSummary(userId);

  return {
    isWatched: false,
    mediaKey: resolvedMediaKey,
    wasRemoved,
  };
}
