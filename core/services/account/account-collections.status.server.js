import 'server-only';

import { buildMediaItemKey } from '@/core/services/shared/media';
import { MEDIA_COLLECTION_SELECT, WATCHED_SELECT } from './account-collections.constants';
import { normalizeMediaPayload, normalizeWatchedRow } from './account-collections.normalizers';

function resolveMediaKey(media = null) {
  return (
    media?.mediaKey ||
    (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null)
  );
}

async function loadLikeStatus({ admin, assertResult, media, userId }) {
  const mediaKey = resolveMediaKey(media);

  if (!userId || !mediaKey) {
    return { isLiked: false, like: null };
  }

  const result = await admin
    .from('likes')
    .select(MEDIA_COLLECTION_SELECT)
    .eq('user_id', userId)
    .eq('media_key', mediaKey)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('added_at', { ascending: false, nullsFirst: false })
    .limit(1);

  assertResult(result, 'Like status could not be loaded');
  const row = Array.isArray(result.data) ? result.data[0] || null : null;

  return {
    isLiked: Boolean(row),
    like: row ? normalizeMediaPayload(row.payload || {}, row) : null,
  };
}

async function loadWatchlistStatus({ admin, assertResult, media, userId }) {
  const mediaKey = resolveMediaKey(media);

  if (!userId || !mediaKey) {
    return { isInWatchlist: false, item: null };
  }

  const result = await admin
    .from('watchlist')
    .select(MEDIA_COLLECTION_SELECT)
    .eq('user_id', userId)
    .eq('media_key', mediaKey)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('added_at', { ascending: false, nullsFirst: false })
    .limit(1);

  assertResult(result, 'Watchlist status could not be loaded');
  const row = Array.isArray(result.data) ? result.data[0] || null : null;

  return {
    isInWatchlist: Boolean(row),
    item: row ? normalizeMediaPayload(row.payload || {}, row) : null,
  };
}

async function loadWatchedStatus({ admin, assertResult, media, userId }) {
  const mediaKey = resolveMediaKey(media);

  if (!userId || !mediaKey) {
    return { isWatched: false, watched: null };
  }

  const result = await admin
    .from('watched')
    .select(WATCHED_SELECT)
    .eq('user_id', userId)
    .eq('media_key', mediaKey)
    .order('last_watched_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1);

  assertResult(result, 'Watched status could not be loaded');
  const row = Array.isArray(result.data) ? result.data[0] || null : null;

  return {
    isWatched: Boolean(row),
    watched: row ? normalizeWatchedRow(row) : null,
  };
}

export async function resolveAccountCollectionStatusResource({ admin, assertResult, media, resource, userId }) {
  if (resource === 'like-status') {
    return {
      data: await loadLikeStatus({ admin, assertResult, media, userId }),
      handled: true,
    };
  }

  if (resource === 'watchlist-status') {
    return {
      data: await loadWatchlistStatus({ admin, assertResult, media, userId }),
      handled: true,
    };
  }

  if (resource === 'watched-status') {
    return {
      data: await loadWatchedStatus({ admin, assertResult, media, userId }),
      handled: true,
    };
  }

  return {
    data: null,
    handled: false,
  };
}
