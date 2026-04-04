import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  assertInternalAccess,
  assertMethod,
  assertResult,
  buildMediaItemKey,
  createAdminClient,
  errorResponse,
  isMovieMediaType,
  jsonResponse,
  mapErrorToStatus,
  normalizeLower,
  normalizeMediaType,
  normalizeTimestamp,
  normalizeTrim,
  parseBoolean,
  readJsonBody,
  resolveLimitCount,
  withQueryTimeout,
} from '../_internal/common.ts';

type CollectionsResource =
  | 'like-status'
  | 'liked-lists'
  | 'likes'
  | 'list-by-id'
  | 'list-by-slug'
  | 'list-items'
  | 'lists'
  | 'watchlist'
  | 'watchlist-status'
  | 'watched'
  | 'watched-status';

type CollectionsReadRequest = {
  limitCount?: number | string | null;
  listId?: string | null;
  media?: {
    entityId?: string | null;
    entityType?: string | null;
    mediaKey?: string | null;
  } | null;
  resource?: CollectionsResource;
  slug?: string | null;
  strict?: boolean;
  userId?: string;
  viewerId?: string | null;
};

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

const PROTECTED_RESOURCES = new Set<string>([
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

function normalizeResource(value: unknown): CollectionsResource {
  const normalized = normalizeLower(value);

  if (
    normalized === 'likes' ||
    normalized === 'watchlist' ||
    normalized === 'lists' ||
    normalized === 'list-items' ||
    normalized === 'list-by-id' ||
    normalized === 'list-by-slug' ||
    normalized === 'liked-lists' ||
    normalized === 'like-status' ||
    normalized === 'watchlist-status' ||
    normalized === 'watched-status' ||
    normalized === 'watched'
  ) {
    return normalized;
  }

  throw new Error('Unsupported collection resource');
}

function normalizeNumber(value: unknown, fallback: number | null = null): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizeMediaPayload(payload: Record<string, unknown> = {}, row: Record<string, unknown> = {}) {
  const entityId = normalizeTrim(payload.entityId || row.entity_id || payload.id);
  const entityType = normalizeMediaType(payload.entityType || row.entity_type || payload.media_type);

  return {
    addedAt: normalizeTimestamp(payload.addedAt || row.added_at),
    backdrop_path: normalizeTrim(payload.backdrop_path || payload.backdropPath || row.backdrop_path) || null,
    entityId: entityId || null,
    entityType: entityType || null,
    first_air_date: normalizeTrim(payload.first_air_date) || null,
    id: entityId || normalizeTrim(payload.id || row.media_key) || null,
    mediaKey: normalizeTrim(payload.mediaKey || row.media_key) || buildMediaItemKey(entityType, entityId),
    media_type: entityType || null,
    name: normalizeTrim(payload.name || payload.original_name) || '',
    original_name: normalizeTrim(payload.original_name) || null,
    original_title: normalizeTrim(payload.original_title) || null,
    poster_path: normalizeTrim(payload.poster_path || payload.posterPath || row.poster_path) || null,
    position: normalizeNumber(payload.position, null),
    release_date: normalizeTrim(payload.release_date) || null,
    title:
      normalizeTrim(payload.title || payload.original_title || row.title || payload.name || payload.original_name) ||
      '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userId: normalizeTrim(payload.userId || row.user_id) || null,
    vote_average: normalizeNumber(payload.vote_average, null),
  };
}

function normalizeWatchedRow(row: Record<string, unknown> = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
  const baseMedia = normalizeMediaPayload(payload, row);

  return {
    ...baseMedia,
    firstWatchedAt: normalizeTimestamp(payload.firstWatchedAt || row.created_at),
    lastWatchedAt: normalizeTimestamp(payload.lastWatchedAt || row.last_watched_at),
    sourceLastAction: normalizeTrim(payload.sourceLastAction) || 'watched',
    watchCount: Number.isFinite(Number(payload.watchCount ?? row.watch_count))
      ? Number(payload.watchCount ?? row.watch_count)
      : 1,
  };
}

function normalizeListOwnerSnapshot(value: Record<string, unknown> = {}, fallbackOwnerId: string | null = null) {
  const ownerId = normalizeTrim(value.id) || normalizeTrim(fallbackOwnerId) || null;

  return ownerId
    ? {
        avatarUrl: normalizeTrim(value.avatarUrl) || null,
        displayName: normalizeTrim(value.displayName || value.username) || 'Anonymous User',
        id: ownerId,
        username: normalizeTrim(value.username) || null,
      }
    : null;
}

function normalizeListPreviewItem(value: Record<string, unknown> = {}) {
  const normalized = normalizeMediaPayload(value, value);

  if (!normalized.entityId || !isMovieMediaType(normalized.entityType)) {
    return null;
  }

  return {
    ...normalized,
    id: normalized.entityId,
  };
}

function normalizeListRow(row: Record<string, unknown> = {}, likesMap = new Map<string, string[]>()) {
  const payload = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(
    payload.ownerSnapshot && typeof payload.ownerSnapshot === 'object'
      ? (payload.ownerSnapshot as Record<string, unknown>)
      : {},
    normalizeTrim(row.user_id) || null
  );
  const rowId = normalizeTrim(row.id);
  const likes = Array.isArray(likesMap.get(rowId)) ? likesMap.get(rowId) : [];

  return {
    coverUrl: normalizeTrim(payload.coverUrl || row.poster_path) || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: normalizeTrim(row.description || payload.description) || '',
    id: rowId,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes,
    likesCount: Number.isFinite(Number(row.likes_count)) ? Number(row.likes_count) : likes.length,
    ownerId: normalizeTrim(row.user_id) || null,
    ownerSnapshot,
    previewItems: Array.isArray(payload.previewItems)
      ? payload.previewItems
          .map((item) =>
            normalizeListPreviewItem(item && typeof item === 'object' ? (item as Record<string, unknown>) : {})
          )
          .filter(Boolean)
      : [],
    reviewsCount: Number.isFinite(Number(row.reviews_count))
      ? Number(row.reviews_count)
      : Number(payload.reviewsCount || 0),
    slug: normalizeTrim(row.slug || payload.slug || row.id),
    title: normalizeTrim(row.title || payload.title) || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

async function canViewerAccessUserContent(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    viewerId,
  }: {
    ownerId: string;
    viewerId: string | null;
  }
): Promise<boolean> {
  if (!ownerId) {
    return false;
  }

  if (viewerId && viewerId === ownerId) {
    return true;
  }

  const profileResult = await admin.from('profiles').select('is_private').eq('id', ownerId).maybeSingle();

  assertResult(profileResult, 'Profile visibility could not be checked');

  if (!profileResult.data) {
    return false;
  }

  if (profileResult.data.is_private !== true) {
    return true;
  }

  if (!viewerId) {
    return false;
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', viewerId)
    .eq('following_id', ownerId)
    .eq('status', 'accepted')
    .maybeSingle();

  assertResult(followResult, 'Profile visibility could not be checked');
  return Boolean(followResult.data);
}

function createPrivateProfileError() {
  const error = new Error('This profile is private') as Error & { status?: number };
  error.status = 403;
  return error;
}

async function executeCollectionQuery<T>(
  query: Promise<T>,
  {
    strict,
    timeoutMs,
    fallbackValue,
  }: {
    strict: boolean;
    timeoutMs: number;
    fallbackValue: T;
  }
): Promise<T & { timedOut?: boolean }> {
  if (strict) {
    return (await query) as T & { timedOut?: boolean };
  }

  return await withQueryTimeout<T>(query, {
    fallbackValue,
    timeoutMs,
  });
}

async function countListLikesByListIds(
  admin: ReturnType<typeof createAdminClient>,
  listIds: string[]
): Promise<Map<string, string[]>> {
  if (!Array.isArray(listIds) || listIds.length === 0) {
    return new Map();
  }

  const likesMap = new Map<string, string[]>();

  for (let index = 0; index < listIds.length; index += 100) {
    const ids = listIds.slice(index, index + 100);
    const result = await admin.from('list_likes').select('list_id,user_id').in('list_id', ids);

    assertResult(result, 'List likes could not be loaded');
    (result.data || []).forEach((row) => {
      const listId = normalizeTrim((row as Record<string, unknown>).list_id);
      const userId = normalizeTrim((row as Record<string, unknown>).user_id);

      if (!listId || !userId) {
        return;
      }

      const current = likesMap.get(listId) || [];
      current.push(userId);
      likesMap.set(listId, current);
    });
  }

  return likesMap;
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<CollectionsReadRequest>(request);
    const resource = normalizeResource(payload.resource);
    const userId = normalizeTrim(payload.userId);
    const viewerId = normalizeTrim(payload.viewerId) || null;
    const listId = normalizeTrim(payload.listId);
    const slug = normalizeTrim(payload.slug);
    const strict = parseBoolean(payload.strict, false);
    const media = payload.media && typeof payload.media === 'object' ? payload.media : null;

    const admin = createAdminClient();

    if (userId && PROTECTED_RESOURCES.has(resource)) {
      const canAccess = await canViewerAccessUserContent(admin, {
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

      const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

      if (resolvedLimitCount > 0) {
        query = query.limit(resolvedLimitCount);
      }

      const result = await executeCollectionQuery(query, {
        strict,
        timeoutMs: 4000,
        fallbackValue: { data: [], error: null },
      });

      if (result.timedOut) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      assertResult(result, 'Likes could not be loaded');

      const data = (result.data || [])
        .map((row) =>
          normalizeMediaPayload(
            ((row as Record<string, unknown>).payload as Record<string, unknown>) || {},
            row as Record<string, unknown>
          )
        )
        .filter((item) => isMovieMediaType(item.entityType));

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'watchlist') {
      let query = admin
        .from('watchlist')
        .select(MEDIA_COLLECTION_SELECT)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });
      const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

      if (resolvedLimitCount > 0) {
        query = query.limit(resolvedLimitCount);
      }

      const result = await executeCollectionQuery(query, {
        strict,
        timeoutMs: 4000,
        fallbackValue: { data: [], error: null },
      });

      if (result.timedOut) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      assertResult(result, 'Watchlist could not be loaded');

      const data = (result.data || []).map((row) =>
        normalizeMediaPayload(
          ((row as Record<string, unknown>).payload as Record<string, unknown>) || {},
          row as Record<string, unknown>
        )
      );

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'lists') {
      let query = admin
        .from('lists')
        .select(LIST_COLLECTION_SELECT)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

      if (resolvedLimitCount > 0) {
        query = query.limit(resolvedLimitCount);
      }

      const result = await executeCollectionQuery(query, {
        strict,
        timeoutMs: 4000,
        fallbackValue: { data: [], error: null },
      });

      if (result.timedOut) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      assertResult(result, 'Lists could not be loaded');

      const rows = (result.data || []) as Record<string, unknown>[];
      const likesMap = await countListLikesByListIds(admin, rows.map((row) => normalizeTrim(row.id)).filter(Boolean));

      const data = rows.map((row) => normalizeListRow(row, likesMap));

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'list-items') {
      if (!listId) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      let query = admin
        .from('list_items')
        .select(LIST_ITEM_SELECT)
        .eq('user_id', userId)
        .eq('list_id', listId)
        .order('added_at', { ascending: false });
      const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

      if (resolvedLimitCount > 0) {
        query = query.limit(resolvedLimitCount);
      }

      const result = await executeCollectionQuery(query, {
        strict,
        timeoutMs: 4000,
        fallbackValue: { data: [], error: null },
      });

      if (result.timedOut) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      assertResult(result, 'List items could not be loaded');

      const data = (result.data || [])
        .map((row) =>
          normalizeMediaPayload(
            ((row as Record<string, unknown>).payload as Record<string, unknown>) || {},
            row as Record<string, unknown>
          )
        )
        .filter((item) => isMovieMediaType(item.entityType));

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'list-by-id') {
      if (!listId || !userId) {
        return jsonResponse(200, { ok: true, resource, data: null });
      }

      const result = await admin
        .from('lists')
        .select(LIST_COLLECTION_SELECT)
        .eq('id', listId)
        .eq('user_id', userId)
        .maybeSingle();

      assertResult(result, 'List could not be loaded');

      if (!result.data) {
        return jsonResponse(200, { ok: true, resource, data: null });
      }

      const likesMap = await countListLikesByListIds(admin, [normalizeTrim(result.data.id)]);
      const data = normalizeListRow(result.data as Record<string, unknown>, likesMap);

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'list-by-slug') {
      if (!slug || !userId) {
        return jsonResponse(200, { ok: true, resource, data: null });
      }

      const result = await admin
        .from('lists')
        .select(LIST_COLLECTION_SELECT)
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      assertResult(result, 'List could not be loaded');

      if (!result.data) {
        return jsonResponse(200, { ok: true, resource, data: null });
      }

      const likesMap = await countListLikesByListIds(admin, [normalizeTrim(result.data.id)]);
      const data = normalizeListRow(result.data as Record<string, unknown>, likesMap);

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'liked-lists') {
      let likesQuery = admin
        .from('list_likes')
        .select('list_id,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

      if (resolvedLimitCount > 0) {
        likesQuery = likesQuery.limit(resolvedLimitCount);
      }

      const likesResult = await executeCollectionQuery(likesQuery, {
        strict,
        timeoutMs: 4000,
        fallbackValue: { data: [], error: null },
      });

      if (likesResult.timedOut) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      assertResult(likesResult, 'Liked lists could not be loaded');

      const listIds = [
        ...new Set(
          (likesResult.data || []).map((row) => normalizeTrim((row as Record<string, unknown>).list_id)).filter(Boolean)
        ),
      ];

      if (listIds.length === 0) {
        return jsonResponse(200, { ok: true, resource, data: [] });
      }

      const listRows: Record<string, unknown>[] = [];

      for (let index = 0; index < listIds.length; index += 100) {
        const ids = listIds.slice(index, index + 100);
        const listResult = await admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', ids);

        assertResult(listResult, 'Liked lists could not be loaded');
        listRows.push(...((listResult.data || []) as Record<string, unknown>[]));
      }

      const likesMap = await countListLikesByListIds(
        admin,
        listRows.map((row) => normalizeTrim(row.id)).filter(Boolean)
      );

      const data = listRows
        .map((row) => normalizeListRow(row, likesMap))
        .sort((left, right) => {
          const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
          const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;

          if (rightTime !== leftTime) {
            return rightTime - leftTime;
          }

          return String(right.id || '').localeCompare(String(left.id || ''));
        });

      return jsonResponse(200, { ok: true, resource, data });
    }

    if (resource === 'like-status') {
      const mediaKey = normalizeTrim(media?.mediaKey) || buildMediaItemKey(media?.entityType, media?.entityId);

      if (!userId || !mediaKey) {
        return jsonResponse(200, {
          ok: true,
          resource,
          data: {
            isLiked: false,
            like: null,
          },
        });
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
      const row =
        Array.isArray(result.data) && result.data.length > 0 ? (result.data[0] as Record<string, unknown>) : null;

      return jsonResponse(200, {
        ok: true,
        resource,
        data: {
          isLiked: Boolean(row),
          like: row ? normalizeMediaPayload((row.payload as Record<string, unknown>) || {}, row) : null,
        },
      });
    }

    if (resource === 'watchlist-status') {
      const mediaKey = normalizeTrim(media?.mediaKey) || buildMediaItemKey(media?.entityType, media?.entityId);

      if (!userId || !mediaKey) {
        return jsonResponse(200, {
          ok: true,
          resource,
          data: {
            isInWatchlist: false,
            item: null,
          },
        });
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
      const row =
        Array.isArray(result.data) && result.data.length > 0 ? (result.data[0] as Record<string, unknown>) : null;

      return jsonResponse(200, {
        ok: true,
        resource,
        data: {
          isInWatchlist: Boolean(row),
          item: row ? normalizeMediaPayload((row.payload as Record<string, unknown>) || {}, row) : null,
        },
      });
    }

    if (resource === 'watched-status') {
      const mediaKey = normalizeTrim(media?.mediaKey) || buildMediaItemKey(media?.entityType, media?.entityId);

      if (!userId || !mediaKey) {
        return jsonResponse(200, {
          ok: true,
          resource,
          data: {
            isWatched: false,
            watched: null,
          },
        });
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
      const row =
        Array.isArray(result.data) && result.data.length > 0 ? (result.data[0] as Record<string, unknown>) : null;

      return jsonResponse(200, {
        ok: true,
        resource,
        data: {
          isWatched: Boolean(row),
          watched: row ? normalizeWatchedRow(row) : null,
        },
      });
    }

    let watchedQuery = admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(payload.limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      watchedQuery = watchedQuery.limit(resolvedLimitCount);
    }

    const watchedResult = await executeCollectionQuery(watchedQuery, {
      strict,
      timeoutMs: 4000,
      fallbackValue: { data: [], error: null },
    });

    if (watchedResult.timedOut) {
      return jsonResponse(200, { ok: true, resource, data: [] });
    }

    assertResult(watchedResult, 'Watched list could not be loaded');

    const data = (watchedResult.data || [])
      .map((row) => normalizeWatchedRow(row as Record<string, unknown>))
      .filter((item) => isMovieMediaType(item.entityType));

    return jsonResponse(200, { ok: true, resource, data });
  } catch (error) {
    return errorResponse(mapErrorToStatus(error), String((error as Error)?.message || 'collections-read failed'));
  }
});
