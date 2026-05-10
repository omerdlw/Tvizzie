'use client';

import {
  fetchMediaCollectionStatus,
  fetchUserMediaCollection,
} from '@/core/services/shared/media-collection.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { createWatchedRef } from './watched.shared';

export async function fetchWatchedStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isWatched: false,
      watched: null,
    },
    media,
    mediaKey: userId && media ? createWatchedRef(userId, media).id : null,
    resource: 'watched-status',
    userId,
  });
}

export async function fetchWatchedList(userId, options = {}) {
  return fetchUserMediaCollection('watched', userId, options);
}

export async function isUserMediaWatched({ mediaKey, userId }) {
  if (!mediaKey || !userId) {
    return false;
  }

  const client = getSupabaseClient();
  const result = await client
    .from('watched')
    .select('media_key')
    .eq('media_key', mediaKey)
    .eq('user_id', userId)
    .maybeSingle();

  assertSupabaseResult(result, 'Watched state could not be loaded');

  return Boolean(result.data?.media_key);
}
