'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  refreshMediaCollectionAccountSummary,
} from '@/domains/account/server/media-collection.service';
import { getSupabaseClient } from '@/infrastructure/http/supabase-data.service';
import {
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription.service';
import {
  assertTitleMedia,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/server/media';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/domains/social/server/activity/activity-events.service';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/server/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/server/activity/activity-events.constants';
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
    client,
  );
  const isInWatchlist = rpcRow?.is_in_watchlist === true;

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
    'Watchlist item could not be removed',
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
