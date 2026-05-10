'use client';

import { refreshMediaCollectionAccountSummary, resolveMediaCollectionRpcRow } from '@/core/services/shared/media-collection.service.js';
import { assertMovieMedia } from '@/core/services/shared/media-key.service.js';
import { invalidatePollingSubscription, primePollingSubscription } from '@/core/services/shared/polling-subscription.service.js';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service.js';
import { createMediaRow, ensureUserId, normalizeMediaPayload } from '@/core/services/shared/supabase-media-utils.service.js';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import {
  createWatchlistRef,
  getUserWatchlistSubscriptionKey,
  getWatchlistStatusSubscriptionKey,
} from './watchlist.shared.js';

export { subscribeToUserWatchlist, subscribeToWatchlistStatus } from './watchlist.subscriptions.js';

export function getWatchlistDocRef(userId, media) {
  return createWatchlistRef(userId, media);
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
