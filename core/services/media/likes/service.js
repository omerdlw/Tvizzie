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
  assertMoviePayload,
  buildMediaItemKey,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/media';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import { isUserMediaWatched, markUserWatched } from '../watched-watchlist/watched.service.js';
import { removeLikeFromShowcase, writeFavoriteShowcase } from './queries.js';
import {
  buildLikeRef,
  getFavoriteShowcaseSubscriptionKey,
  getLikeStatusSubscriptionKey,
  getUserLikesSubscriptionKey,
} from './shared.js';

export { subscribeToFavoriteShowcase, subscribeToLikeStatus, subscribeToUserLikes } from './subscriptions.js';

export function getLikeDocRef(userId, media) {
  return buildLikeRef(userId, media);
}

export async function ensureLegacyFavoritesBackfilled(userId) {
  if (!userId) {
    return false;
  }

  return false;
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
  refreshMediaCollectionAccountSummary(userId);

  return showcase;
}

export async function toggleUserLike({ media, userId }) {
  const likeRef = buildLikeRef(userId, media);
  const client = getSupabaseClient();
  const row = createMediaRow(media, userId);
  const rpcRow = await executeMediaCollectionRpc(
    'collection_toggle_like',
    createMediaCollectionToggleRpcParams({ row, userId }),
    'Like could not be updated',
    client
  );
  const isLiked = rpcRow?.is_liked === true;

  if (!isLiked) {
    await removeLikeFromShowcase(userId, likeRef.id);
  } else {
    const normalizedType = assertMoviePayload(media, 'Only movies and TV series are supported in likes');
    const entityId = String(media?.entityId ?? media?.id ?? '').trim();
    const mediaKey = buildMediaItemKey(normalizedType, entityId);
    const alreadyWatched = await isUserMediaWatched({
      mediaKey,
      userId,
    });

    if (!alreadyWatched) {
      await markUserWatched({
        media,
        sourceLastAction: 'like',
        userId,
      });
    }

    fireActivityEvent(ACTIVITY_EVENT_TYPES.LIKED_ADDED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        primaryRef: buildActivitySubjectRef({
          subjectId: entityId,
          subjectType: normalizedType,
        }),
        slotType: ACTIVITY_SLOT_TYPES.LIKED_ENTRY,
      }),
      subjectId: entityId,
      subjectPoster: media?.posterPath || media?.poster_path || null,
      subjectTitle: media?.title || media?.name || 'Untitled',
      subjectType: normalizedType,
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
  refreshMediaCollectionAccountSummary(userId);

  return nextResult;
}

export async function removeUserLike({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage likes');

  const resolvedMediaKey = mediaKey || getLikeDocRef(userId, media).id;
  const rpcRow = await executeMediaCollectionRpc(
    'collection_remove_like',
    {
      p_media_key: resolvedMediaKey,
      p_user_id: userId,
    },
    'Like could not be removed'
  );

  if (rpcRow?.removed) {
    await removeLikeFromShowcase(userId, resolvedMediaKey);
  }

  invalidatePollingSubscription(getLikeStatusSubscriptionKey({ media, userId }), {
    payload: {
      isLiked: false,
      like: null,
    },
  });

  invalidatePollingSubscription(getUserLikesSubscriptionKey(userId), {
    refetch: true,
  });
  invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
    refetch: true,
  });
  refreshMediaCollectionAccountSummary(userId);

  return {
    mediaKey: resolvedMediaKey,
  };
}
