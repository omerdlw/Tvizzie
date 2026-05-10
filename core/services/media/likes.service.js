'use client';

import { buildMediaItemKey } from '@/core/services/shared/media-key.service';
import {
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import {
  refreshMediaCollectionAccountSummary,
  resolveMediaCollectionRpcRow,
} from '@/core/services/shared/media-collection.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import {
  assertMoviePayload,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/core/services/shared/supabase-media-utils.service';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildActivitySubjectRef, buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import { isUserMediaWatched, markUserWatched } from '@/core/services/media/watched.service';
import { removeLikeFromShowcase, writeFavoriteShowcase } from './likes.queries';
import {
  buildLikeRef,
  getFavoriteShowcaseSubscriptionKey,
  getLikeStatusSubscriptionKey,
  getUserLikesSubscriptionKey,
} from './likes.shared';

export {
  subscribeToFavoriteShowcase,
  subscribeToLikeStatus,
  subscribeToUserLikes,
} from './likes.subscriptions';

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
  const rpcResult = await client.rpc('collection_toggle_like', {
    p_backdrop_path: row.backdrop_path || null,
    p_entity_id: row.entity_id || null,
    p_entity_type: row.entity_type || null,
    p_media_key: row.media_key,
    p_payload: row.payload || {},
    p_poster_path: row.poster_path || null,
    p_title: row.title || null,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Like could not be updated');

  const rpcRow = resolveMediaCollectionRpcRow(rpcResult.data);
  const isLiked = rpcRow?.is_liked === true;

  if (!isLiked) {
    await removeLikeFromShowcase(userId, likeRef.id);
  } else {
    const normalizedType = assertMoviePayload(media, 'Only movies are supported in likes');
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
  const client = getSupabaseClient();
  const rpcResult = await client.rpc('collection_remove_like', {
    p_media_key: resolvedMediaKey,
    p_user_id: userId,
  });

  assertSupabaseResult(rpcResult, 'Like could not be removed');

  const rpcRow = resolveMediaCollectionRpcRow(rpcResult.data);

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
