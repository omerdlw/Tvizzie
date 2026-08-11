'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  fetchCollectionResource,
} from '@/domains/account/client';
import { getSupabaseClient } from '@/infrastructure/http/supabase-data-service';
import {
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import {
  assertTitleMedia,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/shared/media';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/domains/social/client/activity/activity-events';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/domains/social/utils';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils';
import {
  createWatchlistRef,
  getUserWatchlistSubscriptionKey,
  getWatchlistStatusSubscriptionKey,
} from './watchlist-shared.js';
import { fetchWatchlistStatus } from './watchlist-queries.js';

export { subscribeToUserWatchlist, subscribeToWatchlistStatus } from './watchlist-subscriptions.js';

export function getWatchlistDocRef(userId, media) {
  return createWatchlistRef(userId, media);
}

export async function toggleUserWatchlistItem({ media, userId }) {
  const watchlistRef = createWatchlistRef(userId, media);
  const client = getSupabaseClient();
  const row = createMediaRow(media, userId);
  const rpcRow = await executeMediaCollectionRpc({
    client,
    fnName: 'collection_toggle_watchlist',
    params: createMediaCollectionToggleRpcParams({ row, userId }),
    fallbackMessage: 'Watchlist item could not be updated',
  });
  // Supabase can expose a single-row RPC result as either an object or a
  // one-item array depending on the function's return declaration. Resolve
  // both shapes, then confirm against the status endpoint when the RPC does
  // not include the boolean explicitly.
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  let isInWatchlist =
    resolvedRpcRow?.is_in_watchlist === true || resolvedRpcRow?.isInWatchlist === true;

  try {
    const status = await fetchWatchlistStatus({ media, userId });
    if (typeof status?.isInWatchlist === 'boolean') {
      isInWatchlist = status.isInWatchlist;
    }
  } catch {
    // Keep the RPC result when the follow-up status read is unavailable.
  }

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
      p_user_id: userId,
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

  return {
    mediaKey: resolvedMediaKey,
  };
}
