'use client';

import { assertMovieMedia, buildMediaItemKey } from '@/core/services/shared/media-key.service';
import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
} from '@/core/services/shared/media-collection.service';
import { ensureUserId } from '@/core/services/shared/supabase-media-utils.service';

export function createWatchedRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertMovieMedia(media, 'Only movies are supported in watched items');

  return {
    id: buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
    table: 'watched',
    userId,
  };
}

export function getWatchedStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watched', { media, userId });
}

export function getUserWatchedSubscriptionKey(userId) {
  return buildUserMediaCollectionSubscriptionKey('watched', userId);
}

export function getUserWatchlistSubscriptionKey(userId) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId);
}

export function getWatchlistStatusSubscriptionKey({ media, userId }) {
  return buildMediaCollectionStatusSubscriptionKey('watchlist', { media, userId });
}
