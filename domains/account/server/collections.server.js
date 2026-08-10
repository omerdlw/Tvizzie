import { createAdminClient } from '@/infrastructure/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from './profile.server';
import { normalizeTimestamp, normalizeValue } from '@/shared/utils';

import { buildMediaItemKey } from '@/domains/media/shared/media';
import { isTitleMediaType } from '@/domains/media/utils';
import {
  LIST_COLLECTION_SELECT,
  LIST_ITEM_SELECT,
  MEDIA_COLLECTION_SELECT,
  WATCHED_SELECT,
} from '@/domains/account/utils';

export const ACCOUNT_COLLECTION_RESOURCE_KEYS = new Set([
  'likes',
  'lists',
  'liked-lists',
  'watched',
  'watchlist',
]);

export const ACCOUNT_LIST_RESOURCE_KEYS = new Set(['list-by-id', 'list-by-slug', 'list-items']);

export const ACCOUNT_MEDIA_STATUS_RESOURCE_KEYS = new Set([
  'like-status',
  'watchlist-status',
  'watched-status',
]);

export const ACCOUNT_RESOURCE_KEYS = new Set([
  ...ACCOUNT_COLLECTION_RESOURCE_KEYS,
  ...ACCOUNT_LIST_RESOURCE_KEYS,
  ...ACCOUNT_MEDIA_STATUS_RESOURCE_KEYS,
]);

export const PROTECTED_ACCOUNT_RESOURCE_KEYS = new Set(ACCOUNT_RESOURCE_KEYS);

export function isAccountResource(resource) {
  return ACCOUNT_RESOURCE_KEYS.has(resource);
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
    if (
      message.includes('fetch failed') ||
      message.includes('socket') ||
      message.includes('connection')
    ) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }
    throw new Error(error.message || fallbackMessage);
  }
  return result;
}

export async function executeCollectionQuery(
  query,
  {
    fallbackValue = { data: [], error: null },
    label = 'Collection query',
    strict = false,
    timeoutMs = 4000,
  } = {},
) {
  if (strict) return query;

  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs);
  });
  let result;
  try {
    result = await Promise.race([query, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }

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
    const result = await client.from('list_likes').select('list_id').in('list_id', ids);
    assertQueryResult(result, 'List likes could not be loaded');

    (result.data || []).forEach((row) => {
      likesMap.set(row.list_id, (likesMap.get(row.list_id) || 0) + 1);
    });
  }
  return likesMap;
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function decodeRouteValue(value) {
  try {
    return decodeURIComponent(String(value || '')).trim();
  } catch {
    return '';
  }
}

export function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = normalizeValue(payload.entityId || row.entity_id || payload.id || '');
  const entityType = normalizeValue(
    payload.entityType || row.entity_type || payload.media_type,
  ).toLowerCase();

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
    title:
      payload.title ||
      payload.original_title ||
      row.title ||
      payload.name ||
      payload.original_name ||
      '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userRating: normalizeNumber(payload.userRating ?? payload.rating ?? row.rating, null),
    userId: payload.userId || row.user_id || null,
    vote_average: normalizeNumber(payload.vote_average, null),
    vote_count: normalizeNumber(payload.vote_count, null),
    watchProviders:
      payload.watchProviders && typeof payload.watchProviders === 'object'
        ? payload.watchProviders
        : null,
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
  const computedLikesCount = Number(likesMap.get(row.id) || 0);

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes: [],
    likesCount: Number.isFinite(Number(row.likes_count))
      ? Number(row.likes_count)
      : computedLikesCount,
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

function resolveMediaKey(media = null) {
  return (
    media?.mediaKey ||
    (media?.entityType && media?.entityId
      ? buildMediaItemKey(media.entityType, media.entityId)
      : null)
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STANDARD_COLLECTION_CONFIG = Object.freeze({
  likes: Object.freeze({
    filter: (item) => isTitleMediaType(item?.entityType),
    label: 'Likes',
    limit: 200,
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [['added_at', { ascending: false }]],
    select: MEDIA_COLLECTION_SELECT,
    table: 'likes',
  }),
  watchlist: Object.freeze({
    label: 'Watchlist',
    limit: 200,
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [['added_at', { ascending: false }]],
    select: MEDIA_COLLECTION_SELECT,
    table: 'watchlist',
  }),
  watched: Object.freeze({
    label: 'Watched items',
    limit: 200,
    normalize: normalizeWatchedRow,
    order: [['last_watched_at', { ascending: false }]],
    select: WATCHED_SELECT,
    table: 'watched',
  }),
});

const STATUS_COLLECTION_CONFIG = Object.freeze({
  'like-status': Object.freeze({
    itemKey: 'like',
    label: 'Like status',
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [
      ['updated_at', { ascending: false }],
      ['added_at', { ascending: false }],
    ],
    select: MEDIA_COLLECTION_SELECT,
    statusKey: 'isLiked',
    table: 'likes',
  }),
  'watchlist-status': Object.freeze({
    itemKey: 'item',
    label: 'Watchlist status',
    normalize: (row) => normalizeMediaPayload(row.payload || {}, row),
    order: [
      ['updated_at', { ascending: false }],
      ['added_at', { ascending: false }],
    ],
    select: MEDIA_COLLECTION_SELECT,
    statusKey: 'isInWatchlist',
    table: 'watchlist',
  }),
  'watched-status': Object.freeze({
    itemKey: 'watched',
    label: 'Watched status',
    normalize: normalizeWatchedRow,
    order: [
      ['last_watched_at', { ascending: false }],
      ['updated_at', { ascending: false }],
    ],
    select: WATCHED_SELECT,
    statusKey: 'isWatched',
    table: 'watched',
  }),
});

function getFirstResultRow(result) {
  return Array.isArray(result?.data) ? result.data[0] || null : null;
}

function applyQueryOrder(query, order = []) {
  return order.reduce(
    (currentQuery, [column, options]) => currentQuery.order(column, options),
    query,
  );
}

function isUuid(value) {
  return UUID_PATTERN.test(value);
}

function createListQuery(admin, { reference, select, userId, usesSlugFallback = false }) {
  let query = admin.from('lists').select(select);
  if (userId) query = query.eq('user_id', userId);

  if (usesSlugFallback) {
    return isUuid(reference)
      ? query.or(`id.eq.${reference},slug.eq.${reference}`)
      : query.eq('slug', reference);
  }

  return isUuid(reference) ? query.eq('id', reference) : query.eq('slug', reference);
}

async function findListRow({
  admin,
  checkAssert,
  execQuery,
  fallbackMessage,
  label,
  reference,
  select = LIST_COLLECTION_SELECT,
  strict,
  userId,
  usesSlugFallback = false,
}) {
  const decodedReference = decodeRouteValue(reference);
  if (!decodedReference) return null;

  const result = await execQuery(
    createListQuery(admin, {
      reference: decodedReference,
      select,
      userId,
      usesSlugFallback,
    }).limit(1),
    {
      fallbackValue: { data: [], error: null },
      label,
      strict,
    },
  );

  if (result?.timedOut) return null;
  checkAssert(result, fallbackMessage);
  return getFirstResultRow(result);
}

async function normalizeListRowWithLikes({ admin, checkAssert, row }) {
  if (!row) return null;
  const likesMap = Number.isFinite(Number(row.likes_count))
    ? new Map()
    : await countListLikesByListIds(admin, checkAssert, [row.id]);

  return normalizeListRow(row, likesMap);
}

async function loadStandardCollection({
  admin,
  calcLimit,
  checkAssert,
  config,
  execQuery,
  limitCount,
  strict,
  userId,
}) {
  let query = applyQueryOrder(
    admin.from(config.table).select(config.select).eq('user_id', userId),
    config.order,
  );
  const limit = calcLimit(limitCount, 0, config.limit);
  if (limit > 0) query = query.limit(limit);

  const result = await execQuery(query, {
    fallbackValue: { data: [], error: null },
    label: `${config.label} for user ${userId}`,
    strict,
  });
  if (result?.timedOut) return null;

  checkAssert(result, `${config.label} could not be loaded`);
  const items = (result.data || []).map(config.normalize);
  return config.filter ? items.filter(config.filter) : items;
}

export async function resolveAccountCollectionStatusResource({
  admin,
  assertResult: localAssert,
  media,
  resource,
  userId,
}) {
  const config = STATUS_COLLECTION_CONFIG[resource];
  if (!config) return { data: null, handled: false };

  const mediaKey = resolveMediaKey(media);
  if (!userId || !mediaKey) {
    return {
      data: { [config.itemKey]: null, [config.statusKey]: false },
      handled: true,
    };
  }

  const result = await applyQueryOrder(
    admin.from(config.table).select(config.select).eq('user_id', userId).eq('media_key', mediaKey),
    config.order,
  ).limit(1);
  (localAssert || assertResult)(result, `${config.label} could not be loaded`);

  const row = getFirstResultRow(result);
  return {
    data: {
      [config.itemKey]: row ? config.normalize(row) : null,
      [config.statusKey]: Boolean(row),
    },
    handled: true,
  };
}

export async function getAccountResource({
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

  if (PROTECTED_ACCOUNT_RESOURCE_KEYS.has(resource)) {
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

  const standardCollectionConfig = STANDARD_COLLECTION_CONFIG[resource];
  if (standardCollectionConfig) {
    const items = await loadStandardCollection({
      admin,
      calcLimit,
      checkAssert,
      config: standardCollectionConfig,
      execQuery,
      limitCount,
      strict,
      userId,
    });

    return items || [];
  }

  if (resource === 'lists') {
    const rows = await loadStandardCollection({
      admin,
      calcLimit,
      checkAssert,
      config: {
        label: 'Lists',
        limit: 200,
        normalize: (row) => row,
        order: [['updated_at', { ascending: false }]],
        select: LIST_COLLECTION_SELECT,
        table: 'lists',
      },
      execQuery,
      limitCount,
      strict,
      userId,
    });
    if (!rows) return [];

    const likesMap = await countListLikesByListIds(
      admin,
      checkAssert,
      rows.filter((row) => !Number.isFinite(Number(row.likes_count))).map((row) => row.id),
    );
    return rows.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'list-by-slug' || resource === 'list-by-id') {
    const row = await findListRow({
      admin,
      checkAssert,
      execQuery,
      fallbackMessage: 'List could not be loaded',
      label: resource === 'list-by-slug' ? `List by slug ${slug}` : `List by id ${listId}`,
      reference: resource === 'list-by-slug' ? slug : listId,
      strict,
      userId,
      usesSlugFallback: resource === 'list-by-slug',
    });

    return normalizeListRowWithLikes({ admin, checkAssert, row });
  }

  if (resource === 'list-items') {
    const list = await findListRow({
      admin,
      checkAssert,
      execQuery,
      fallbackMessage: 'List items could not be loaded',
      label: `Resolve list ID for ${listId}`,
      reference: listId,
      select: 'id',
      strict,
      userId,
    });
    if (!list?.id) return [];

    let query = admin
      .from('list_items')
      .select(LIST_ITEM_SELECT)
      .eq('list_id', list.id)
      .order('position', { ascending: true, nullsFirst: false })
      .order('added_at', { ascending: true });
    const limit = calcLimit(limitCount, 0, 500);
    if (limit > 0) query = query.limit(limit);

    const result = await execQuery(query, {
      fallbackValue: { data: [], error: null },
      label: `List items for list ${list.id}`,
      strict,
    });
    if (result?.timedOut) return [];

    checkAssert(result, 'List items could not be loaded');
    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'liked-lists') {
    if (!userId) return [];
    let likesQuery = admin
      .from('list_likes')
      .select('list_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const limit = calcLimit(limitCount, 0, 200);
    if (limit > 0) likesQuery = likesQuery.limit(limit);

    const likesResult = await execQuery(likesQuery, {
      label: `Liked lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });
    if (likesResult?.timedOut) return [];
    checkAssert(likesResult, 'Liked lists could not be loaded');

    const likedRows = likesResult.data || [];
    if (likedRows.length === 0) return [];
    const listIds = likedRows.map((r) => r.list_id).filter(Boolean);

    const listsResult = await execQuery(
      admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', listIds),
      {
        label: `Lists by ids for user ${userId}`,
        fallbackValue: { data: [], error: null },
        strict,
      },
    );
    if (listsResult?.timedOut) return [];
    checkAssert(listsResult, 'Liked lists could not be loaded');

    const listsMap = new Map((listsResult.data || []).map((row) => [row.id, row]));
    const allLikesMap = await countListLikesByListIds(
      admin,
      checkAssert,
      (listsResult.data || [])
        .filter((list) => !Number.isFinite(Number(list.likes_count)))
        .map((list) => list.id),
    );
    return listIds
      .map((id) => listsMap.get(id))
      .filter(Boolean)
      .map((row) => normalizeListRow(row, allLikesMap));
  }

  return [];
}
