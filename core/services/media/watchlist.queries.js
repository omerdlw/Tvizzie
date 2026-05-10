'use client';

import {
  fetchMediaCollectionStatus,
  fetchUserMediaCollection,
} from '@/core/services/shared/media-collection.service';
import { createWatchlistRef } from './watchlist.shared';

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
  return fetchUserMediaCollection('watchlist', userId, options);
}
