'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';
import { fetchMediaCollectionStatus, fetchUserMediaCollection } from '@/core/services/shared/media-collection.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { buildFavoriteShowcaseItem, buildLikeRef } from './shared.js';

export async function fetchLikeStatus({ media, userId }) {
  return fetchMediaCollectionStatus({
    emptyValue: {
      isLiked: false,
      like: null,
    },
    media,
    mediaKey: userId && media ? buildLikeRef(userId, media).id : null,
    resource: 'like-status',
    userId,
  });
}

export async function fetchLikes(userId, options = {}) {
  return fetchUserMediaCollection('likes', userId, options);
}

export async function readFavoriteShowcase(userId) {
  if (!userId) {
    return [];
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  });

  const showcase = Array.isArray(payload?.profile?.favoriteShowcase)
    ? payload.profile.favoriteShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : [];

  return showcase;
}

export async function writeFavoriteShowcase(userId, items = []) {
  const showcaseItems = items.map(buildFavoriteShowcaseItem).filter(Boolean);
  const client = getSupabaseClient();
  const result = await client
    .from('profiles')
    .update({
      favorite_showcase: showcaseItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  assertSupabaseResult(result, 'Favorite showcase could not be updated');

  return showcaseItems;
}

export async function removeLikeFromShowcase(userId, mediaKey) {
  const showcase = await readFavoriteShowcase(userId);
  const nextShowcase = showcase.filter((item) => item.mediaKey !== mediaKey);

  if (nextShowcase.length === showcase.length) {
    return false;
  }

  await writeFavoriteShowcase(userId, nextShowcase);
  return true;
}
