'use client';

import {
  executeMediaCollectionRpc,
  fetchCollectionResource,
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchMediaCollectionStatus,
} from '@/domains/account/client/collections';
import { scheduleAccountSummaryRefresh } from '@/domains/account/client/profile';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import {
  createMediaPayload,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/utils/media-payload';
import {
  getFavoriteShowcaseSubscriptionKey,
  getLikeStatusSubscriptionKey,
  getUserLikesSubscriptionKey,
} from './likes.js';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/domains/social/client/activity';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';

export function createWatchedRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watched items',
  );

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watched',
    userId,
  };
}

export function getWatchedDocRef(userId, media) {
  return createWatchedRef(userId, media);
}

export function getWatchedStatusSubscriptionKey({ media, userId }) {
  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watched items',
  );
  return buildMediaCollectionStatusSubscriptionKey(
    'watched',
    userId,
    buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  );
}

export function getUserWatchedSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watched', userId, {
    limitCount: options.limitCount ?? null,
  });
}

export async function fetchWatchedStatus({ media, userId }) {
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

export async function fetchWatchedList(userId, options = {}) {
  return fetchCollectionResource('watched', userId, options);
}

export async function isUserMediaWatched({ mediaKey, userId }) {
  if (!mediaKey || !userId) {
    return false;
  }

  const client = getSupabaseClient();
  const result = await client
    .from('watched')
    .select('media_key')
    .eq('media_key', mediaKey)
    .eq('user_id', userId)
    .maybeSingle();

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
    },
  );
}

export function subscribeToUserWatched(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchWatchedList(userId, options), callback, {
    ...options,
    subscriptionKey: getUserWatchedSubscriptionKey(userId, options),
  });
}

export async function markUserWatched({
  media,
  sourceLastAction = 'watched',
  userId,
  watchedAt = new Date(),
}) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watched items',
  );
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
  const rpcRow = await executeMediaCollectionRpc({
    client,
    fnName: 'collection_mark_watched',
    params: {
      p_backdrop_path: mediaPayload.backdrop_path || null,
      p_entity_id: mediaPayload.entityId || null,
      p_entity_type: mediaPayload.entityType || null,
      p_last_watched_at: watchedAtIso,
      p_media_key: watchedRef.id,
      p_payload: watchedPayload,
      p_poster_path: mediaPayload.poster_path || null,
      p_source_last_action: sourceLastAction || 'watched',
      p_title: mediaPayload.title || null,
    },
    fallbackMessage: 'Watched item could not be saved',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const isNew = resolvedRpcRow?.is_new === true;
  const watchCount = Number(resolvedRpcRow?.watch_count || 1);
  const wasRemovedFromWatchlist = resolvedRpcRow?.was_removed_from_watchlist === true;

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
  invalidatePollingSubscription(buildUserMediaCollectionSubscriptionKey('watchlist', userId, {}), {
    refetch: true,
  });
  invalidatePollingSubscription(
    buildMediaCollectionStatusSubscriptionKey(
      'watchlist',
      userId,
      buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    ),
    {
      payload: {
        isInWatchlist: false,
        item: null,
      },
    },
  );
  scheduleAccountSummaryRefresh(userId);

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

  const rpcRow = await executeMediaCollectionRpc({
    client: getSupabaseClient(),
    fnName: 'collection_remove_watched',
    params: {
      p_media_key: resolvedMediaKey,
    },
    fallbackMessage: 'Watched item could not be removed',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const wasRemoved = resolvedRpcRow?.removed === true;
  const wasUnliked = resolvedRpcRow?.was_unliked === true;

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: false,
    watched: null,
  });

  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  });

  if (wasUnliked) {
    if (media) {
      invalidatePollingSubscription(getLikeStatusSubscriptionKey({ media, userId }), {
        payload: {
          isLiked: false,
          like: null,
        },
      });
    }
    invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
      refetch: true,
    });
    invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
      refetch: true,
    });
  }
  scheduleAccountSummaryRefresh(userId);

  return {
    isWatched: false,
    mediaKey: resolvedMediaKey,
    wasUnliked,
    wasRemoved,
  };
}
