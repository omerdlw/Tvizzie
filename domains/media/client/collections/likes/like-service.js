'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  scheduleAccountSummaryRefresh,
} from '@/domains/account/client';
import { getSupabaseClient } from '@/infrastructure/http/supabase-data-service';
import {
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { createMediaRow, ensureUserId, normalizeMediaPayload } from '@/domains/media/shared/media';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/domains/social/client/activity/activity-events';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/domains/social/utils';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils';
import { fetchLikeStatus, removeLikeFromShowcase, writeFavoriteShowcase } from './like-queries.js';
import {
  buildLikeRef,
  getFavoriteShowcaseSubscriptionKey,
  getLikeStatusSubscriptionKey,
  getUserLikesSubscriptionKey,
} from './like-shared.js';

export {
  subscribeToFavoriteShowcase,
  subscribeToLikeStatus,
  subscribeToUserLikes,
} from './like-subscriptions.js';

export function getLikeDocRef(userId, media) {
  return buildLikeRef(userId, media);
}

export async function updateFavoriteShowcase({ items = [], userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage favorites');

  if (!Array.isArray(items)) {
    throw new Error('Favorite showcase must be an array');
  }

  if (items.length > 5) {
    throw new Error('Favorite showcase can contain up to 5 titles');
  }

  const showcase = await writeFavoriteShowcase(userId, items);

  primePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), showcase);

  return showcase;
}

export async function toggleUserLike({ media, userId }) {
  const likeRef = buildLikeRef(userId, media);
  const client = getSupabaseClient();
  const row = createMediaRow(media, userId);
  const rpcRow = await executeMediaCollectionRpc({
    client,
    fnName: 'collection_toggle_like',
    params: createMediaCollectionToggleRpcParams({ row, userId }),
    fallbackMessage: 'Like could not be updated',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  let isLiked = resolvedRpcRow?.is_liked === true || resolvedRpcRow?.isLiked === true;

  // Toggle RPCs may return the previous row state. The status resource is the
  // authoritative post-mutation value, so use it to drive the button state.
  try {
    const status = await fetchLikeStatus({ media, userId });
    if (typeof status?.isLiked === 'boolean') {
      isLiked = status.isLiked;
    }
  } catch {
    // Preserve the RPC result if the follow-up read is temporarily unavailable.
  }

  if (!isLiked) {
    // The collection row is the primary mutation. Showcase cleanup is a
    // secondary profile update and must not turn a successful unlike into a
    // misleading "Action Failed" state.
    await removeLikeFromShowcase(userId, likeRef.id).catch(() => {});
  } else {
    const subjectId = String(media?.entityId ?? media?.id ?? '').trim();
    const subjectType = media?.entityType || media?.media_type || 'movie';
    fireActivityEvent(ACTIVITY_EVENT_TYPES.LIKED_ADDED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId,
          subjectType,
        }),
        slotType: ACTIVITY_SLOT_TYPES.LIKED_ENTRY,
      }),
      subjectId,
      subjectPoster: media?.posterPath || media?.poster_path || null,
      subjectTitle: media?.title || media?.name || 'Untitled',
      subjectType,
    });
  }

  const nextResult = {
    isLiked,
    like: isLiked ? normalizeMediaPayload(row.payload || {}, row) : null,
    mediaKey: likeRef.id,
  };

  primePollingSubscription(getLikeStatusSubscriptionKey({ media, userId }), nextResult);
  invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
    refetch: true,
  });

  return nextResult;
}

export async function removeUserLike({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage likes');

  const resolvedMediaKey = mediaKey || getLikeDocRef(userId, media).id;
  const rpcRow = await executeMediaCollectionRpc({
    client: getSupabaseClient(),
    fnName: 'collection_remove_like',
    params: {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    },
    fallbackMessage: 'Like could not be removed',
  });

  const wasRemoved = rpcRow?.removed === true;

  if (wasRemoved) {
    await removeLikeFromShowcase(userId, resolvedMediaKey);
  }

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
  scheduleAccountSummaryRefresh(userId);

  return {
    mediaKey: resolvedMediaKey,
    wasRemoved,
  };
}
