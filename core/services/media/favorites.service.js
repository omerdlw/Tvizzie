'use client';

import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import {
  createMediaRow,
  ensureUserId,
  normalizeMediaPayload,
  resolveLimitCount,
} from '@/core/services/shared/supabase-media-utils.service';

const FAVORITE_ROW_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');

function createFavoriteRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage favorites');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in favorites');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'favorites',
    userId,
  };
}

async function fetchFavoriteStatus({ media, userId }) {
  if (!userId || !media) {
    return {
      favorite: null,
      isFavorite: false,
    };
  }

  const favoriteRef = createFavoriteRef(userId, media);
  const client = getSupabaseClient();
  const result = await client
    .from('favorites')
    .select(FAVORITE_ROW_SELECT)
    .eq('user_id', userId)
    .eq('media_key', favoriteRef.id)
    .maybeSingle();

  assertSupabaseResult(result, 'Favorite status could not be loaded');

  if (!result.data) {
    return {
      favorite: null,
      isFavorite: false,
    };
  }

  return {
    favorite: normalizeMediaPayload(result.data.payload || {}, result.data),
    isFavorite: true,
  };
}

async function fetchFavorites(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const client = getSupabaseClient();
  let queryBuilder = client
    .from('favorites')
    .select(FAVORITE_ROW_SELECT)
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  const limitCount = resolveLimitCount(options.limitCount, 0, 200);

  if (limitCount > 0) {
    queryBuilder = queryBuilder.limit(limitCount);
  }

  const result = await queryBuilder;
  assertSupabaseResult(result, 'Favorites could not be loaded');

  return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
}

export function getFavoriteDocRef(userId, media) {
  return createFavoriteRef(userId, media);
}

export function subscribeToFavoriteStatus({ media, userId }, callback, options = {}) {
  const mediaIdentity = {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  };

  return createPollingSubscription(
    async () => fetchFavoriteStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isFavorite), result?.favorite || null);
    },
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('favorites:status', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        media: mediaIdentity,
        userId,
      }),
    }
  );
}

export function subscribeToUserFavorites(userId, callback, options = {}) {
  return createPollingSubscription(() => fetchFavorites(userId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('favorites:user', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      limitCount: options.limitCount ?? null,
      userId,
    }),
  });
}

export async function toggleUserFavorite({ media, userId }) {
  const favoriteRef = createFavoriteRef(userId, media);
  const client = getSupabaseClient();
  const existing = await client
    .from('favorites')
    .select('media_key')
    .eq('user_id', userId)
    .eq('media_key', favoriteRef.id)
    .maybeSingle();

  assertSupabaseResult(existing, 'Favorite state could not be loaded');

  if (existing.data) {
    const removeResult = await client.from('favorites').delete().eq('user_id', userId).eq('media_key', favoriteRef.id);

    assertSupabaseResult(removeResult, 'Favorite could not be removed');

    return {
      favorite: null,
      isFavorite: false,
      mediaKey: favoriteRef.id,
    };
  }

  const row = createMediaRow(media, userId);
  const upsertResult = await client
    .from('favorites')
    .upsert(row, { onConflict: 'user_id,media_key' })
    .select(FAVORITE_ROW_SELECT)
    .single();

  assertSupabaseResult(upsertResult, 'Favorite could not be saved');

  return {
    favorite: normalizeMediaPayload(upsertResult.data?.payload || {}, upsertResult.data || {}),
    isFavorite: true,
    mediaKey: favoriteRef.id,
  };
}

export async function removeUserFavorite({ media = null, mediaKey = null, userId }) {
  ensureUserId(userId, 'Authenticated user is required to manage favorites');

  const resolvedMediaKey = mediaKey || getFavoriteDocRef(userId, media).id;
  const client = getSupabaseClient();
  const result = await client.from('favorites').delete().eq('user_id', userId).eq('media_key', resolvedMediaKey);

  assertSupabaseResult(result, 'Favorite could not be removed');

  return {
    mediaKey: resolvedMediaKey,
  };
}
