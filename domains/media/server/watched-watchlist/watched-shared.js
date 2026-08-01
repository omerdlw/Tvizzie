'use client';

import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
} from '@/domains/account/server/media/media-collection-service';
import { assertTitleMedia, buildMediaItemKey, ensureUserId } from '@/domains/media/server/media';

export function createWatchedRef(userId, media) {
  ensureUserId(userId, 'Authenticated user is required to manage watched items');

  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watched items',
  );

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
