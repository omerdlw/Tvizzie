'use client';

import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchMediaCollectionStatus,
  fetchUserMediaCollection,
  refreshMediaCollectionAccountSummary,
  resolveMediaCollectionRpcRow,
} from '@/core/services/shared/media-collection.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';
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

function buildLikeRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage likes');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in likes');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'likes',
    userId,
  };
}

function getLikeStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('likes', { media, userId });
}

function getUserLikesSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('likes', userId, {
    limitCount: options.limitCount ?? null,
  });
}

function getFavoriteShowcaseSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('likes:favorite-showcase', {
    userId,
  });
}

function buildFavoriteShowcaseItem(media = {}) {
  const normalizedType = assertMoviePayload(media, 'Favorite showcase supports movies only');
  const entityId = String(media?.entityId ?? media?.id ?? '').trim();

  if (!entityId) {
    return null;
  }

  const mediaKey = media?.mediaKey || buildMediaItemKey(normalizedType, entityId);

  return {
    addedAt: media?.addedAt || new Date().toISOString(),
    backdropPath: media?.backdropPath || media?.backdrop_path || null,
    backdrop_path: media?.backdrop_path || media?.backdropPath || null,
    entityId,
    entityType: normalizedType,
    first_air_date: null,
    mediaKey,
    media_type: normalizedType,
    name: media?.name || media?.original_name || '',
    original_name: media?.original_name || null,
    original_title: media?.original_title || null,
    posterPath: media?.posterPath || media?.poster_path || null,
    poster_path: media?.poster_path || media?.posterPath || null,
    position: Number.isFinite(Number(media?.position)) ? Number(media.position) : Date.now(),
    release_date: media?.release_date || null,
    title: media?.title || media?.original_title || media?.name || 'Untitled',
    updatedAt: media?.updatedAt || new Date().toISOString(),
    vote_average: Number.isFinite(Number(media?.vote_average)) ? Number(media.vote_average) : null,
  };
}

async function fetchLikeStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isLiked: false,
      like: null,
    },
    media,
    mediaKey: userId && media ? buildLikeRef(userId, media).id : null,
    resource: 'like-status',
    userId,
  });
}

async function fetchLikes(userId, options = {}) {
  return fetchUserMediaCollection('likes', userId, options);
}

async function readFavoriteShowcase(userId) {
  if (!userId) {
    return [];
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  });

  const showcase = Array.isArray(payload?.profile?.favoriteShowcase)
    ? payload.profile.favoriteShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : [];

  return showcase;
}

async function writeFavoriteShowcase(userId, items = []) {
  const showcaseItems = items.map(buildFavoriteShowcaseItem).filter(Boolean);
  const client = getSupabaseClient();
  const result = await client
    .from('profiles')
    .update({
      favorite_showcase: showcaseItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  assertSupabaseResult(result, 'Favorite showcase could not be updated');

  return showcaseItems;
}

async function removeLikeFromShowcase(userId, mediaKey) {
  const showcase = await readFavoriteShowcase(userId);
  const nextShowcase = showcase.filter((item) => item.mediaKey !== mediaKey);

  if (nextShowcase.length === showcase.length) {
    return false;
  }

  await writeFavoriteShowcase(userId, nextShowcase);
  return true;
}

export function getLikeDocRef(userId, media) {
  return buildLikeRef(userId, media);
}

export async function ensureLegacyFavoritesBackfilled(userId) {
  if (!userId) {
    return false;
  }

  return false;
}

export function subscribeToLikeStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchLikeStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isLiked), result?.like || null);
    },
    {
      ...options,
      subscriptionKey: getLikeStatusSubscriptionKey({ media, userId }),
    }
  );
}

export function subscribeToUserLikes(userId, callback, options = {}) {
  return createPollingSubscription(() => fetchLikes(userId, options), callback, {
    ...options,
    subscriptionKey: getUserLikesSubscriptionKey(userId, options),
  });
}

export function subscribeToFavoriteShowcase(userId, callback, options = {}) {
  return createPollingSubscription(() => readFavoriteShowcase(userId), callback, {
    ...options,
    subscriptionKey: getFavoriteShowcaseSubscriptionKey(userId),
  });
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
