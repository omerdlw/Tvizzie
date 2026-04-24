import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/core/services/account/account-profile.server';
import { normalizeTimestamp } from '@/core/utils';
import { buildMediaItemKey } from '@/core/services/shared/media-key.service';
import { isMovieMediaType } from '@/core/utils/media';

const MEDIA_COLLECTION_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');
const LIST_COLLECTION_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');
const LIST_ITEM_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'position',
  'title',
  'updated_at',
  'user_id',
].join(',');
const WATCHED_SELECT = [
  'backdrop_path',
  'created_at',
  'entity_id',
  'entity_type',
  'last_watched_at',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
  'watch_count',
].join(',');

const ACCOUNT_COLLECTION_RESOURCES = new Set([
  'likes',
  'watchlist',
  'lists',
  'list-items',
  'list-by-id',
  'list-by-slug',
  'liked-lists',
  'like-status',
  'watchlist-status',
  'watched-status',
  'watched',
]);

const PROTECTED_ACCOUNT_COLLECTION_RESOURCES = new Set([
  'like-status',
  'liked-lists',
  'likes',
  'list-by-id',
  'list-by-slug',
  'list-items',
  'lists',
  'watchlist',
  'watchlist-status',
  'watched',
  'watched-status',
]);

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEntityType(value) {
  return normalizeValue(value).toLowerCase();
}

function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('fetch failed') || message.includes('socket') || message.includes('connection')) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs)
  );

  const result = await Promise.race([promise, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }

  return result;
}

async function executeCollectionQuery(
  query,
  { fallbackValue = { data: [], error: null }, label = 'Collection query', strict = false, timeoutMs = 4000 } = {}
) {
  if (strict) {
    return query;
  }

  return withQueryTimeout(query, {
    fallbackValue,
    label,
    timeoutMs,
  });
}

function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = normalizeValue(payload.entityId || row.entity_id || payload.id || '');
  const entityType = normalizeEntityType(payload.entityType || row.entity_type || payload.media_type);

  return {
    addedAt: normalizeTimestamp(payload.addedAt || row.added_at),
    backdrop_path: payload.backdrop_path || payload.backdropPath || row.backdrop_path || null,
    entityId: entityId || null,
    entityType: entityType || null,
    first_air_date: payload.first_air_date || null,
    genreNames: normalizeArray(payload.genreNames || payload.genre_names),
    genre_ids: normalizeArray(payload.genre_ids || payload.genreIds),
    genres: normalizeArray(payload.genres),
    id: entityId || normalizeValue(payload.id || row.media_key) || null,
    mediaKey:
      payload.mediaKey || row.media_key || (entityType && entityId ? buildMediaItemKey(entityType, entityId) : null),
    media_type: entityType || null,
    name: payload.name || payload.original_name || '',
    original_name: payload.original_name || null,
    original_title: payload.original_title || null,
    poster_path: payload.poster_path || payload.posterPath || row.poster_path || null,
    popularity: normalizeNumber(payload.popularity, null),
    position: normalizeNumber(payload.position, null),
    providerIds: normalizeArray(payload.providerIds || payload.provider_ids),
    providerNames: normalizeArray(payload.providerNames || payload.provider_names),
    providers: normalizeArray(payload.providers),
    rating: normalizeNumber(payload.rating ?? row.rating, null),
    release_date: payload.release_date || null,
    runtime: normalizeNumber(payload.runtime, null),
    title: payload.title || payload.original_title || row.title || payload.name || payload.original_name || '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userRating: normalizeNumber(payload.userRating ?? payload.rating ?? row.rating, null),
    userId: payload.userId || row.user_id || null,
    vote_average: normalizeNumber(payload.vote_average, null),
    vote_count: normalizeNumber(payload.vote_count, null),
    watchProviders:
      payload.watchProviders && typeof payload.watchProviders === 'object' ? payload.watchProviders : null,
  };
}

function normalizeWatchedRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const baseMedia = normalizeMediaPayload(payload, row);

  return {
    ...baseMedia,
    firstWatchedAt: normalizeTimestamp(payload.firstWatchedAt || row.created_at),
    lastWatchedAt: normalizeTimestamp(payload.lastWatchedAt || row.last_watched_at),
    sourceLastAction: payload.sourceLastAction || 'watched',
    watchCount: Number.isFinite(Number(payload.watchCount ?? row.watch_count))
      ? Number(payload.watchCount ?? row.watch_count)
      : 1,
  };
}

function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
  const ownerId = value?.id || fallbackOwnerId || null;

  return ownerId
    ? {
        avatarUrl: value?.avatarUrl || null,
        displayName: value?.displayName || value?.username || 'Anonymous User',
        id: ownerId,
        username: value?.username || null,
      }
    : null;
}

function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value);

  if (!normalized.entityId || !isMovieMediaType(normalized.entityType)) {
    return null;
  }

  return {
    ...normalized,
    id: normalized.entityId,
  };
}

function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id);
  const likes = Array.isArray(likesMap.get(row.id)) ? likesMap.get(row.id) : [];

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes,
    likesCount: Number.isFinite(Number(row.likes_count)) ? Number(row.likes_count) : likes.length,
    ownerId: row.user_id,
    ownerSnapshot,
    previewItems: Array.isArray(payload.previewItems)
      ? payload.previewItems.map(normalizeListPreviewItem).filter(Boolean)
      : [],
    reviewsCount: Number.isFinite(Number(row.reviews_count))
      ? Number(row.reviews_count)
      : Number(payload.reviewsCount || 0),
    slug: row.slug || payload.slug || row.id,
    title: row.title || payload.title || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

async function countListLikesByListIds(client, assertResult, listIds = []) {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return new Map();
  }

  const likesMap = new Map();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await client.from('list_likes').select('list_id, user_id').in('list_id', ids);

    assertResult(result, 'List likes could not be loaded');
    (result.data || []).forEach((row) => {
      const current = likesMap.get(row.list_id) || [];
      current.push(row.user_id);
      likesMap.set(row.list_id, current);
    });
  }

  return likesMap;
}

export function isAccountCollectionResource(resource) {
  return ACCOUNT_COLLECTION_RESOURCES.has(resource);
}

export async function getAccountCollectionResource({
  admin,
  assertResult,
  canViewerAccessUserContent,
  createPrivateProfileError,
  executeCollectionQuery,
  limitCount = null,
  listId = null,
  media = null,
  resolveLimitCount,
  resource,
  slug = null,
  strict = false,
  userId,
  viewerId = null,
}) {
  if (PROTECTED_ACCOUNT_COLLECTION_RESOURCES.has(resource)) {
    const canAccess = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccess) {
      throw createPrivateProfileError();
    }
  }

  if (resource === 'likes') {
    let query = admin
      .from('likes')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Likes for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Likes could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isMovieMediaType(item?.entityType));
  }

  if (resource === 'watchlist') {
    let query = admin
      .from('watchlist')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watchlist for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watchlist could not be loaded');

    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'lists') {
    let query = admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Lists could not be loaded');

    const rows = result.data || [];
    const likesMap = await countListLikesByListIds(
      admin,
      assertResult,
      rows.map((row) => row.id)
    );

    return rows.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'list-items') {
    let query = admin
      .from('list_items')
      .select(LIST_ITEM_SELECT)
      .eq('user_id', userId)
      .eq('list_id', listId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `List items for list ${listId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'List items could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isMovieMediaType(item?.entityType));
  }

  if (resource === 'list-by-id') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, assertResult, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'list-by-slug') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, assertResult, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'liked-lists') {
    let likesQuery = admin
      .from('list_likes')
      .select('list_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      likesQuery = likesQuery.limit(resolvedLimitCount);
    }

    const likesResult = await executeCollectionQuery(likesQuery, {
      label: `Liked lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (likesResult?.timedOut) {
      return [];
    }

    assertResult(likesResult, 'Liked lists could not be loaded');

    const listIds = [...new Set((likesResult.data || []).map((row) => row.list_id))];

    if (listIds.length === 0) {
      return [];
    }

    const listRows = [];

    for (let index = 0; index < listIds.length; index += 100) {
      const ids = listIds.slice(index, index + 100);
      const listResult = await admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', ids);

      assertResult(listResult, 'Liked lists could not be loaded');
      listRows.push(...(listResult.data || []));
    }

    const likesMap = await countListLikesByListIds(
      admin,
      assertResult,
      listRows.map((row) => row.id)
    );

    return listRows
      .map((row) => normalizeListRow(row, likesMap))
      .sort((left, right) => {
        const leftTime = left?.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right?.updatedAt ? new Date(right.updatedAt).getTime() : 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return String(right?.id || '').localeCompare(String(left?.id || ''));
      });
  }

  if (resource === 'like-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

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

  if (resource === 'watchlist-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

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

  if (resource === 'watched-status') {
    const mediaKey =
      media?.mediaKey ||
      (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null);

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

  if (resource === 'watched') {
    let query = admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watched for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watched list could not be loaded');

    return (result.data || []).map(normalizeWatchedRow).filter((item) => isMovieMediaType(item?.entityType));
  }

  throw new Error('Unsupported account collection resource');
}

export async function getCollectionResource({
  resource,
  userId,
  viewerId = null,
  limitCount = null,
  media = null,
  listId = null,
  slug = null,
  strict = false,
}) {
  if (!isAccountCollectionResource(resource)) {
    throw new Error('Unsupported collection resource');
  }

  const admin = createAdminClient();

  return getAccountCollectionResource({
    admin,
    assertResult,
    canViewerAccessUserContent,
    createPrivateProfileError,
    executeCollectionQuery,
    limitCount,
    listId,
    media,
    resolveLimitCount,
    resource,
    slug,
    strict,
    userId,
    viewerId,
  });
}
