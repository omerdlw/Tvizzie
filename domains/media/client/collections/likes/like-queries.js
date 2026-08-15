'use client';

import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { fetchCollectionResource, fetchMediaCollectionStatus } from '@/domains/account/client';

import { buildFavoriteShowcaseItem, buildLikeRef } from './like-shared.js';

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
  return fetchCollectionResource('likes', userId, options);
}

export async function fetchLikeUserProfiles(userIds = []) {
  if (!userIds.length) return [];

  const profiles = await Promise.all(
    userIds.map(async (userId) => {
      const res = await getAccountProfileServer({ userId });
      return res?.profile || null;
    }),
  );

  return profiles.filter(Boolean);
}

export async function readFavoriteShowcase(userId) {
  if (!userId) {
    return [];
  }

  const client = getSupabaseClient();
  const result = await client
    .from('profiles')
    .select('favorite_showcase')
    .eq('id', userId)
    .maybeSingle();

  assertSupabaseResult(result, 'Favorite showcase could not be read');

  const rawShowcase = result.data?.favorite_showcase;
  return Array.isArray(rawShowcase)
    ? rawShowcase.map(buildFavoriteShowcaseItem).filter(Boolean)
    : [];
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

export async function removeLikeFromShowcase(userId, mediaKeyOrMedia) {
  if (!userId || !mediaKeyOrMedia) {
    return null;
  }

  const showcase = await readFavoriteShowcase(userId);
  if (!Array.isArray(showcase) || showcase.length === 0) {
    return null;
  }

  const resolveTargetKey = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
      const cleaned = val.trim();
      return cleaned.includes('-') ? cleaned.replace('-', '_') : cleaned;
    }
    const rawType = val?.entityType || val?.media_type || val?.type || '';
    const rawId = String(val?.entityId ?? val?.id ?? '').trim();
    if (val?.mediaKey) {
      const key = String(val.mediaKey).trim();
      return key.includes('-') ? key.replace('-', '_') : key;
    }
    let entityId = rawId;
    let resolvedType = rawType;
    if (rawId.includes('-') || rawId.includes('_')) {
      const parts = rawId.split(/[-_]/);
      if (parts.length >= 2) {
        if (!resolvedType) resolvedType = parts[0];
        entityId = parts[parts.length - 1];
      }
    }
    const normalizedType =
      String(resolvedType).trim().toLowerCase() === 'tv' ||
      String(resolvedType).trim().toLowerCase() === 'show'
        ? 'tv'
        : 'movie';
    return `${normalizedType}_${entityId}`;
  };

  const targetKey = resolveTargetKey(mediaKeyOrMedia);
  if (!targetKey) {
    return null;
  }

  const nextShowcase = showcase.filter((item) => {
    const itemKey = resolveTargetKey(item);
    return itemKey !== targetKey;
  });

  if (nextShowcase.length === showcase.length) {
    return null;
  }

  const updatedShowcase = await writeFavoriteShowcase(userId, nextShowcase);
  return updatedShowcase;
}
