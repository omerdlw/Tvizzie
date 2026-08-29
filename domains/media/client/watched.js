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
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import { createMediaPayload, ensureUserId } from '@/domains/media/utils/media-payload';
import { getUserLikesSubscriptionKey } from '@/domains/media/client/likes';
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
  const [entityType, entityId] = String(mediaKey).split('_');
  if (!entityType || !entityId) return false;
  const result = await fetchWatchedStatus({
    media: { entityId, entityType },
    userId,
  });
  return Boolean(result?.isWatched);
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

export async function markUserWatched({ media, userId, watchedAt = new Date() }) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');
  const payload = createMediaPayload(media, userId);
  const watchedDate = watchedAt instanceof Date ? watchedAt : new Date(watchedAt);
  if (Number.isNaN(watchedDate.getTime())) throw new Error('Watch date is invalid');

  const rpcRow = await executeMediaCollectionRpc({
    fnName: 'collection_mark_watched',
    params: {
      p_backdrop_path: payload.backdrop_path || null,
      p_entity_id: payload.entityId,
      p_entity_type: payload.entityType,
      p_last_watched_at: watchedDate.toISOString(),
      p_media_key: payload.mediaKey,
      p_payload: {},
      p_poster_path: payload.poster_path || null,
      p_source_last_action: 'watched',
      p_title: payload.title,
    },
    fallbackMessage: 'Watched item could not be saved',
  });
  const result = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const watched = {
    ...payload,
    firstWatchedAt: watchedDate.toISOString(),
    lastWatchedAt: watchedDate.toISOString(),
  };

  fireActivityEvent(ACTIVITY_EVENT_TYPES.WATCHED_ADDED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      primaryRef: buildActivitySubjectRef({
        subjectId: payload.entityId,
        subjectType: payload.entityType,
      }),
      slotType: ACTIVITY_SLOT_TYPES.WATCHED_ENTRY,
    }),
    subjectId: payload.entityId,
    subjectPoster: payload.poster_path || null,
    subjectTitle: payload.title || 'Untitled',
    subjectType: payload.entityType,
    watchedAt: watchedDate.toISOString(),
  });

  primePollingSubscription(getWatchedStatusSubscriptionKey({ media, userId }), {
    isWatched: true,
    watched,
  });
  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), { refetch: true });
  invalidatePollingSubscription(
    buildMediaCollectionStatusSubscriptionKey('watchlist', userId, payload.mediaKey),
    { payload: { isInWatchlist: false, item: null } },
  );
  invalidatePollingSubscription(buildUserMediaCollectionSubscriptionKey('watchlist', userId), {
    refetch: true,
  });
  scheduleAccountSummaryRefresh(userId);
  return { result, watched };
}

export async function removeUserWatchedItem({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const resolvedMediaKey = mediaKey || getWatchedDocRef(userId, media).id;

  const rpcRow = await executeMediaCollectionRpc({
    fnName: 'collection_remove_watched',
    params: {
      p_media_key: resolvedMediaKey,
    },
    fallbackMessage: 'Watched item could not be removed',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const wasRemoved = resolvedRpcRow?.removed === true;

  primePollingSubscription(
    buildMediaCollectionStatusSubscriptionKey('watched', userId, resolvedMediaKey),
    {
      isWatched: false,
      watched: null,
    },
  );

  if (wasRemoved || resolvedRpcRow?.was_unliked === true) {
    invalidatePollingSubscription(
      buildMediaCollectionStatusSubscriptionKey('likes', userId, resolvedMediaKey),
      { payload: { isLiked: false, like: null } },
    );
    invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
      refetch: true,
    });
  }

  invalidatePollingSubscription(getUserWatchedSubscriptionKey(userId), {
    refetch: true,
  });

  scheduleAccountSummaryRefresh(userId);

  return {
    isWatched: false,
    mediaKey: resolvedMediaKey,
    wasRemoved,
    wasUnliked: resolvedRpcRow?.was_unliked === true || resolvedRpcRow?.wasUnliked === true,
  };
}
