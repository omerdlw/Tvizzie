'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  getSupabaseClient,
  invalidatePollingSubscription,
  primePollingSubscription,
  refreshMediaCollectionAccountSummary,
} from '@/core/services/shared/client';
import {
  assertMovieMedia,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/media';
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
  const rpcRow = await executeMediaCollectionRpc(
    'collection_toggle_watchlist',
    createMediaCollectionToggleRpcParams({ row, userId }),
    'Watchlist item could not be updated',
    client
  );
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
  await executeMediaCollectionRpc(
    'collection_remove_watchlist',
    {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    },
    'Watchlist item could not be removed'
  );

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
