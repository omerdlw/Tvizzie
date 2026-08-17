'use client';

import {
  createMediaCollectionToggleRpcParams,
  executeMediaCollectionRpc,
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
  fetchCollectionResource,
  fetchMediaCollectionStatus,
} from '@/domains/account/client/collections.client';
import {
  scheduleAccountSummaryRefresh,
} from '@/domains/account/client/profile.client';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import {
  assertMoviePayload,
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
} from '@/domains/media/utils/media-payload';
import {
  assertTitleMedia,
  buildMediaItemKey,
} from '@/domains/media/utils/media-key';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/domains/social/client/activity';
import {
  ACTIVITY_SLOT_TYPES,
} from '@/domains/social/utils/constants';
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

  const client = getSupabaseClient();
  const result = await client
    .from('profiles')
    .select('favorite_showcase')
    .eq('id', userId)
    .maybeSingle();

  assertSupabaseResult(result, 'Favorite showcase could not be read');

  const rawShowcase = result.data?.favorite_showcase;
  return Array.isArray(rawShowcase)
    ? rawShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : [];
}

export async function writeFavoriteShowcase(userId, items = []) {
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

export async function removeLikeFromShowcase(userId, mediaKeyOrMedia) {
  if (!userId || !mediaKeyOrMedia) {
    return null;
  }

  const showcase = await readFavoriteShowcase(userId);
  if (!Array.isArray(showcase) || showcase.length === 0) {
    return null;
  }

  const resolveTargetKey = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
      const cleaned = val.trim();
      return cleaned.includes('-') ? cleaned.replace('-', '_') : cleaned;
    }
    const rawType = val?.entityType || val?.media_type || val?.type || '';
    const rawId = String(val?.entityId ?? val?.id ?? '').trim();
    if (val?.mediaKey) {
      const key = String(val.mediaKey).trim();
      return key.includes('-') ? key.replace('-', '_') : key;
    }
    let entityId = rawId;
    let resolvedType = rawType;
    if (rawId.includes('-') || rawId.includes('_')) {
      const parts = rawId.split(/[-_]/);
      if (parts.length >= 2) {
        if (!resolvedType) resolvedType = parts[0];
        entityId = parts[parts.length - 1];
      }
    }
    const normalizedType =
      String(resolvedType).trim().toLowerCase() === 'tv' ||
      String(resolvedType).trim().toLowerCase() === 'show'
        ? 'tv'
        : 'movie';
    return `${normalizedType}_${entityId}`;
  };

  const targetKey = resolveTargetKey(mediaKeyOrMedia);
  if (!targetKey) {
    return null;
  }

  const nextShowcase = showcase.filter((item) => {
    const itemKey = resolveTargetKey(item);
    return itemKey !== targetKey;
  });

  if (nextShowcase.length === showcase.length) {
    return null;
  }

  const updatedShowcase = await writeFavoriteShowcase(userId, nextShowcase);
  return updatedShowcase;
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
    params: createMediaCollectionToggleRpcParams({ row, userId }),
    fallbackMessage: 'Like could not be updated',
  });
  const resolvedRpcRow = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
  let isLiked = resolvedRpcRow?.is_liked === true || resolvedRpcRow?.isLiked === true;

  try {
    const status = await fetchLikeStatus({ media, userId });
    if (typeof status?.isLiked === 'boolean') {
      isLiked = status.isLiked;
    }
  } catch {
    // Preserve the RPC result if the follow-up read is temporarily unavailable.
  }

  if (!isLiked) {
    const updatedShowcase = await removeLikeFromShowcase(userId, likeRef.id).catch(() => null);
    if (updatedShowcase) {
      primePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), updatedShowcase);
      invalidatePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), {
        refetch: true,
      });
      scheduleAccountSummaryRefresh(userId);
    }
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
    const updatedShowcase = await removeLikeFromShowcase(userId, resolvedMediaKey).catch(
      () => null,
    );
    if (updatedShowcase) {
      primePollingSubscription(getFavoriteShowcaseSubscriptionKey(userId), updatedShowcase);
    }
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
