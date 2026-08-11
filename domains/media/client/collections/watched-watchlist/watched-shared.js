'use client';

import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
} from '@/domains/account/client';
import { assertTitleMedia, buildMediaItemKey, ensureUserId } from '@/domains/media/shared/media';

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
  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watched items',
  );
  return buildMediaCollectionStatusSubscriptionKey(
    'watched',
    userId,
    buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  );
}

export function getUserWatchedSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watched', userId, {
    limitCount: options.limitCount ?? null,
  });
}

export function getUserWatchlistSubscriptionKey(userId, options = {}) {
  return buildUserMediaCollectionSubscriptionKey('watchlist', userId, {
    limitCount: options.limitCount ?? null,
  });
}

export function getWatchlistStatusSubscriptionKey({ media, userId }) {
  const mediaSnapshot = assertTitleMedia(
    media,
    'Only movies and TV series are supported in watchlist items',
  );
  return buildMediaCollectionStatusSubscriptionKey(
    'watchlist',
    userId,
    buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId),
  );
}
