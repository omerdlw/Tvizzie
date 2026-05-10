'use client';

import { buildMediaCollectionStatusSubscriptionKey, buildUserMediaCollectionSubscriptionKey } from '@/core/services/shared/media-collection.service.js';
import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service.js';
import { ensureUserId } from '@/core/services/shared/supabase-media-utils.service.js';

export function createWatchlistRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watchlist');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watchlist',
    userId,
  };
}

export function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watchlist', { media, userId });
}

export function getUserWatchlistSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId, {
    limitCount: options.limitCount ?? null,
  });
}
