'use client';

import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
} from '@/core/services/shared/client';
import {
  assertTitleMedia,
  buildMediaItemKey,
  ensureUserId,
} from '@/core/services/shared/media';

export function createWatchlistRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watchlist items');

  const mediaSnapshot = assertTitleMedia(media, 'Only movies and TV series are supported in watchlist');

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
