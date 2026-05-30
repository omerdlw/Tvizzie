'use client';

import {
  executeMediaCollectionRpc,
  getSupabaseClient,
  invalidatePollingSubscription,
  primePollingSubscription,
  refreshMediaCollectionAccountSummary,
} from '@/core/services/shared/client';
import {
  assertMovieMedia,
  createMediaPayload,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/media';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import {
  createWatchedRef,
  getUserWatchedSubscriptionKey,
  getUserWatchlistSubscriptionKey,
  getWatchedStatusSubscriptionKey,
  getWatchlistStatusSubscriptionKey,
} from './watched.shared.js';

export { isUserMediaWatched } from './watched.queries.js';
export { subscribeToUserWatched, subscribeToWatchedStatus } from './watched.subscriptions.js';

export function getWatchedDocRef(userId, media) {
  return createWatchedRef(userId, media);
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
  const rpcRow = await executeMediaCollectionRpc(
    'collection_mark_watched',
    {
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
    },
    'Watched item could not be saved',
    client
  );
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
  const rpcRow = await executeMediaCollectionRpc(
    'collection_remove_watched',
    {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    },
    'Watched item could not be removed'
  );
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
