'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchCollectionResource,
  fetchMediaCollectionStatus,
} from '@/domains/account/client/collections';
import {
  fetchCurrentAccountProfile,
  saveAccountProfile,
} from '@/domains/account/client/profile-api';
import { scheduleAccountSummaryRefresh } from '@/domains/account/client/profile';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/client';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import {
  assertMoviePayload,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/utils/media-payload';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/domains/social/client/activity';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';

export function buildLikeRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage likes');

  const mediaSnapshot = assertTitleMedia(media, 'Only movies and TV series are supported in likes');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'likes',
    userId,
  };
}

export function getLikeDocRef(userId, media) {
  return buildLikeRef(userId, media);
}

export function getLikeStatusSubscriptionKey({ media, userId }) {
  const mediaSnapshot = assertTitleMedia(media, 'Only movies and TV series are supported in likes');
  return buildMediaCollectionStatusSubscriptionKey(
    'likes',
    userId,
    buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  );
}

export function getUserLikesSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('likes', userId, {
    limitCount: options.limitCount ?? null,
  });
}

export function getFavoriteShowcaseSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('likes:favorite-showcase', {
    userId,
  });
}

export function buildFavoriteShowcaseItem(media = {}) {
  const normalizedType = assertMoviePayload(
    media,
    'Favorite showcase supports movies and TV series only',
  );
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
    first_air_date: media?.first_air_date || null,
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

export async function fetchLikeStatus({ media, userId }) {
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

export async function fetchLikes(userId, options = {}) {
  return fetchCollectionResource('likes', userId, options);
}

export async function readFavoriteShowcase(userId) {
  if (!userId) {
    return [];
  }

  const result = await fetchCurrentAccountProfile();
  const rawShowcase = result?.profile?.favoriteShowcase;
  return Array.isArray(rawShowcase)
    ? rawShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : [];
}

export async function writeFavoriteShowcase(userId, items = []) {
  void userId;
  const showcaseItems = items.map(buildFavoriteShowcaseItem).filter(Boolean);
  const result = await saveAccountProfile({ favoriteShowcase: showcaseItems });

  return Array.isArray(result?.profile?.favoriteShowcase)
    ? result.profile.favoriteShowcase
    : showcaseItems;
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
    },
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
  invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
    refetch: true,
  });
  scheduleAccountSummaryRefresh(userId);

  return showcase;
}

export async function toggleUserLike({ media, userId }) {
  const likeRef = buildLikeRef(userId, media);
  const client = getSupabaseClient();
  const row = createMediaRow(media, userId);
  const rpcRow = await executeMediaCollectionRpc({
    client,
    fnName: 'collection_toggle_like',
    params: createMediaCollectionToggleRpcParams({ row }),
    fallbackMessage: 'Like could not be updated',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const isLiked = resolvedRpcRow?.is_liked === true || resolvedRpcRow?.isLiked === true;

  if (!isLiked) {
    invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
      refetch: true,
    });
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
  scheduleAccountSummaryRefresh(userId);

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
    },
    fallbackMessage: 'Like could not be removed',
  });

  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  const wasRemoved = resolvedRpcRow?.removed === true;

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
