import { createAdminClient } from '@/infrastructure/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from './profile.server';
import { normalizeTimestamp, normalizeValue } from '@/shared/utils';

export { getAccountCollectionResource as getCollectionResource };
import { buildMediaItemKey } from '@/domains/media/server/media';
import { isTitleMediaType } from '@/domains/media/utils';
import {
  LIST_COLLECTION_SELECT,
  LIST_ITEM_SELECT,
  MEDIA_COLLECTION_SELECT,
  WATCHED_SELECT,
} from '@/domains/account/utils';

// ============================================================
// Collection Resources & Config Constants
// ============================================================

export const ACCOUNT_COLLECTION_RESOURCES = new Set([
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

export const PROTECTED_ACCOUNT_COLLECTION_RESOURCES = new Set([
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

export function isAccountCollectionResource(resource) {
  return ACCOUNT_COLLECTION_RESOURCES.has(resource);
}

export function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

export function assertResult(result, fallbackMessage) {
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

export async function executeCollectionQuery(
  query,
  { fallbackValue = { data: [], error: null }, label = 'Collection query', strict = false, timeoutMs = 4000 } = {},
) {
  if (strict) return query;

  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs),
  );
  const result = await Promise.race([query, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }
  return result;
}

export async function countListLikesByListIds(client, assertQueryResult, listIds = []) {
  if (!Array.isArray(listIds) || listIds.length === 0) return new Map();
  const likesMap = new Map();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await client.from('list_likes').select('list_id, user_id').in('list_id', ids);
    assertQueryResult(result, 'List likes could not be loaded');

    (result.data || []).forEach((row) => {
      const current = likesMap.get(row.list_id) || [];
      current.push(row.user_id);
      likesMap.set(row.list_id, current);
    });
  }
  return likesMap;
}

// ============================================================
// Normalizers
// ============================================================

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = normalizeValue(payload.entityId || row.entity_id || payload.id || '');
  const entityType = normalizeValue(payload.entityType || row.entity_type || payload.media_type).toLowerCase();

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
      payload.mediaKey ||
      row.media_key ||
      (entityType && entityId ? buildMediaItemKey(entityType, entityId) : null),
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
    watchProviders: payload.watchProviders && typeof payload.watchProviders === 'object' ? payload.watchProviders : null,
  };
}

export function normalizeWatchedRow(row = {}) {
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
  if (!normalized.entityId || !isTitleMediaType(normalized.entityType)) return null;
  return { ...normalized, id: normalized.entityId };
}

export function normalizeListRow(row = {}, likesMap = new Map()) {
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

// ============================================================
// Status Resource Resolvers
// ============================================================

function resolveMediaKey(media = null) {
  return (
    media?.mediaKey ||
    (media?.entityType && media?.entityId ? buildMediaItemKey(media.entityType, media.entityId) : null)
  );
}

export async function resolveAccountCollectionStatusResource({ admin, assertResult: localAssert, media, resource, userId }) {
  const checkAssert = localAssert || assertResult;
  const mediaKey = resolveMediaKey(media);

  if (resource === 'like-status') {
    if (!userId || !mediaKey) return { data: { isLiked: false, like: null }, handled: true };
    const result = await admin
      .from('likes')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('updated_at', { ascending: false })
      .order('added_at', { ascending: false })
      .limit(1);
    checkAssert(result, 'Like status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;
    return { data: { isLiked: Boolean(row), like: row ? normalizeMediaPayload(row.payload || {}, row) : null }, handled: true };
  }

  if (resource === 'watchlist-status') {
    if (!userId || !mediaKey) return { data: { isInWatchlist: false, item: null }, handled: true };
    const result = await admin
      .from('watchlist')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('updated_at', { ascending: false })
      .order('added_at', { ascending: false })
      .limit(1);
    checkAssert(result, 'Watchlist status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;
    return { data: { isInWatchlist: Boolean(row), item: row ? normalizeMediaPayload(row.payload || {}, row) : null }, handled: true };
  }

  if (resource === 'watched-status') {
    if (!userId || !mediaKey) return { data: { isWatched: false, watched: null }, handled: true };
    const result = await admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .order('last_watched_at', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);
    checkAssert(result, 'Watched status could not be loaded');
    const row = Array.isArray(result.data) ? result.data[0] || null : null;
    return { data: { isWatched: Boolean(row), watched: row ? normalizeWatchedRow(row) : null }, handled: true };
  }

  return { data: null, handled: false };
}

// ============================================================
// Account Collection Resource Reader
// ============================================================

export async function getAccountCollectionResource({
  admin: customAdmin,
  assertResult: customAssertResult,
  canViewerAccessUserContent: customAccessCheck,
  createPrivateProfileError: customPrivateError,
  executeCollectionQuery: customQueryExec,
  limitCount = null,
  listId = null,
  media = null,
  resolveLimitCount: customResolveLimit,
  resource,
  slug = null,
  strict = false,
  userId,
  viewerId = null,
}) {
  const admin = customAdmin || createAdminClient();
  const checkAssert = customAssertResult || assertResult;
  const accessCheck = customAccessCheck || canViewerAccessUserContent;
  const makePrivateError = customPrivateError || createPrivateProfileError;
  const execQuery = customQueryExec || executeCollectionQuery;
  const calcLimit = customResolveLimit || resolveLimitCount;

  if (PROTECTED_ACCOUNT_COLLECTION_RESOURCES.has(resource)) {
    const canAccess = await accessCheck({ ownerId: userId, viewerId });
    if (!canAccess) throw makePrivateError();
  }

  const statusResource = await resolveAccountCollectionStatusResource({
    admin,
    assertResult: checkAssert,
    media,
    resource,
    userId,
  });
  if (statusResource.handled) return statusResource.data;

  if (resource === 'likes') {
    let query = admin.from('likes').select(MEDIA_COLLECTION_SELECT).eq('user_id', userId).order('added_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, { label: `Likes for user ${userId}`, fallbackValue: { data: [], error: null }, strict });
    if (result?.timedOut) return [];
    checkAssert(result, 'Likes could not be loaded');
    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row)).filter((item) => isTitleMediaType(item?.entityType));
  }

  if (resource === 'watchlist') {
    let query = admin.from('watchlist').select(MEDIA_COLLECTION_SELECT).eq('user_id', userId).order('added_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, { label: `Watchlist for user ${userId}`, fallbackValue: { data: [], error: null }, strict });
    if (result?.timedOut) return [];
    checkAssert(result, 'Watchlist could not be loaded');
    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'lists') {
    let query = admin.from('lists').select(LIST_COLLECTION_SELECT).eq('user_id', userId).order('updated_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, { label: `Lists for user ${userId}`, fallbackValue: { data: [], error: null }, strict });
    if (result?.timedOut) return [];
    checkAssert(result, 'Lists could not be loaded');
    const lists = result.data || [];
    const likesMap = await countListLikesByListIds(admin, checkAssert, lists.map((l) => l.id));
    return lists.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'watched') {
    let query = admin.from('watched').select(WATCHED_SELECT).eq('user_id', userId).order('last_watched_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, { label: `Watched for user ${userId}`, fallbackValue: { data: [], error: null }, strict });
    if (result?.timedOut) return [];
    checkAssert(result, 'Watched items could not be loaded');
    return (result.data || []).map((row) => normalizeWatchedRow(row));
  }

  return [];
}
