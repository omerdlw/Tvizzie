'use client';

import { fetchCollectionResource, fetchMediaCollectionStatus } from '@/core/services/shared/client';
import { createWatchlistRef } from './watchlist.shared.js';

export async function fetchWatchlistStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isInWatchlist: false,
      item: null,
    },
    media,
    mediaKey: userId && media ? createWatchlistRef(userId, media).id : null,
    resource: 'watchlist-status',
    userId,
  });
}

export async function fetchWatchlist(userId, options = {}) {
  return fetchCollectionResource('watchlist', userId, options);
}
