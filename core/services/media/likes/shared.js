'use client';

import { buildMediaCollectionStatusSubscriptionKey, buildUserMediaCollectionSubscriptionKey } from '@/core/services/shared/media-collection.service.js';
import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service.js';
import { buildPollingSubscriptionKey } from '@/core/services/shared/polling-subscription.service.js';
import { assertMoviePayload, ensureUserId } from '@/core/services/shared/supabase-media-utils.service.js';

export function buildLikeRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage likes');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in likes');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'likes',
    userId,
  };
}

export function getLikeStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('likes', { media, userId });
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
