import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/server';
import { getOrLoadCachedValue } from '@/infrastructure/http/server';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/domains/account/server';
import { normalizeTimestamp, normalizeValue } from '@/shared';
import { TMDB_IMG } from '@/shared';
import {
  LIST_REVIEW_SELECT,
  MEDIA_REVIEW_SELECT,
  REVIEW_LIMIT,
} from '@/domains/reviews/utils/constants';

export function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

export function parseListReviewLikeKey(value) {
  const match = String(value || '').match(/^list:([^:]+):(.+)$/);

  if (!match) {
    return null;
  }

  return {
    listId: match[2],
    ownerId: match[1],
  };
}

function buildReviewDocPath(subject = {}, userId) {
  if (subject.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`;
  }

  return `media_items/${subject.subjectKey}/reviews/${userId}`;
}

export function normalizeReviewRow(
  row = {},
  subjectOverrides = {},
  likes = [],
  userOverride = null,
) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const rawUser = payload.user && typeof payload.user === 'object' ? payload.user : {};
  const user = userOverride
    ? {
        avatarUrl: userOverride.avatarUrl ?? userOverride.avatar_url ?? rawUser.avatarUrl ?? null,
        id: userOverride.id || rawUser.id || row.user_id,
        name:
          userOverride.name ||
          userOverride.display_name ||
          rawUser.name ||
          rawUser.displayName ||
          'Anonymous User',
        username: userOverride.username || rawUser.username || null,
      }
    : rawUser;
  const rawKey = String(row.media_key || payload.subjectKey || '').toLowerCase();
  const inferredSubjectType = rawKey.startsWith('tv_')
    ? 'tv'
    : rawKey.startsWith('movie_')
      ? 'movie'
      : rawKey.startsWith('list:')
        ? 'list'
        : 'movie';

  const subject = {
    subjectHref: payload.subjectHref || null,
    subjectId: payload.subjectId || null,
    subjectKey: payload.subjectKey || row.media_key || null,
    subjectOwnerId: payload.subjectOwnerId || null,
    subjectOwnerUsername: payload.subjectOwnerUsername || null,
    subjectPreviewItems: Array.isArray(payload.subjectPreviewItems)
      ? payload.subjectPreviewItems
      : [],
    subjectPoster: payload.subjectPoster || null,
    subjectSlug: payload.subjectSlug || null,
    subjectTitle: payload.subjectTitle || payload.title || 'Untitled',
    subjectType: payload.subjectType || inferredSubjectType,
    ...subjectOverrides,
  };
  const reviewUserId = row.user_id || payload.authorId || user.id || null;

  const resolvedContent =
    'content' in row && row.content !== undefined ? (row.content ?? '') : (payload.content ?? '');
  const resolvedRating =
    'rating' in row && row.rating !== undefined
      ? row.rating !== null
        ? Number(row.rating)
        : null
      : payload.rating !== null && payload.rating !== undefined
        ? Number(payload.rating)
        : null;

  return {
    authorId: reviewUserId,
    content: resolvedContent,
    createdAt: normalizeTimestamp(row.created_at),
    docPath: buildReviewDocPath(subject, reviewUserId),
    id: `${buildReviewDocPath(subject, reviewUserId)}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: row.media_key || subject.subjectKey || null,
    rating: resolvedRating,
    reviewUserId,
    subjectHref: subject.subjectHref,
    subjectId: subject.subjectId,
    subjectKey: subject.subjectKey,
    subjectOwnerId: subject.subjectOwnerId,
    subjectOwnerUsername: subject.subjectOwnerUsername,
    subjectPreviewItems: subject.subjectPreviewItems,
    subjectPoster: subject.subjectPoster,
    subjectSlug: subject.subjectSlug,
    subjectTitle: subject.subjectTitle,
    subjectType: subject.subjectType,
    updatedAt: normalizeTimestamp(row.updated_at),
    user: {
      avatarUrl: user.avatarUrl || null,
      id: reviewUserId,
      name: user.name || 'Anonymous User',
      username: user.username || null,
    },
  };
}

function getSortableTimestamp(value) {
  if (!value) return 0;

  const parsedTime = new Date(value).getTime();

  return Number.isFinite(parsedTime) ? parsedTime : 0;
}

export function sortReviewsByUpdatedAtDesc(items = []) {
  return [...items].sort((left, right) => {
    const updatedDiff =
      getSortableTimestamp(right?.updatedAt) - getSortableTimestamp(left?.updatedAt);

    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
}

export function dedupeReviews(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = String(item?.id || '').trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function paginateReviewItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
  const nextItems = items.slice(offset, offset + pageSize);
  const nextOffset = offset + nextItems.length;
  const totalCount = items.length;

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
    totalCount,
  };
}

export function resolveReviewWindow({ cursor = null, pageSize = 20 } = {}) {
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.min(Math.floor(Number(pageSize)), 100))
    : 20;
  const offset = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
  const fetchLimit = Math.min(
    Math.max(offset + normalizedPageSize * 2, normalizedPageSize * 2),
    300,
  );

  return {
    fetchLimit,
    offset,
    pageSize: normalizedPageSize,
  };
}

function buildLikesMap(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const mediaKey = String(row.media_key || '')
      .trim()
      .toLowerCase();
    const reviewUserId = String(row.review_user_id || '')
      .trim()
      .toLowerCase();
    const key = `${mediaKey}:${reviewUserId}`;
    const current = map.get(key) || [];

    if (row.user_id && !current.includes(row.user_id)) {
      current.push(row.user_id);
    }
    map.set(key, current);
  });

  return map;
}

export async function fetchReviewLikes(admin, mediaKeys = []) {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const result = await admin
      .from('review_likes')
      .select('media_key, review_user_id, user_id')
      .in('media_key', chunk);

    if (result.error) {
      throw new Error(result.error.message || 'Review likes could not be loaded');
    }

    likesRows.push(...(result.data || []));
  }

  return buildLikesMap(likesRows);
}

export async function loadListSubjectMap(admin, listIds = []) {
  const uniqueListIds = [...new Set(listIds.filter(Boolean))];

  if (uniqueListIds.length === 0) {
    return new Map();
  }

  const listsResult = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .in('id', uniqueListIds);

  if (listsResult.error) {
    throw new Error(listsResult.error.message || 'List context could not be loaded');
  }

  const listRows = listsResult.data || [];
  const ownerIds = [...new Set(listRows.map((row) => row.user_id).filter(Boolean))];
  const ownerMap = new Map();

  if (ownerIds.length > 0) {
    const ownerResult = await admin.from('profiles').select('id,username').in('id', ownerIds);

    if (ownerResult.error) {
      throw new Error(ownerResult.error.message || 'List owners could not be loaded');
    }

    (ownerResult.data || []).forEach((owner) => {
      ownerMap.set(owner.id, owner.username || owner.id);
    });
  }

  const listsNeedingPreview = listRows.filter((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    return !Array.isArray(payload.previewItems) || payload.previewItems.length === 0;
  });

  const previewItemsMap = new Map();
  if (listsNeedingPreview.length > 0) {
    const listIds = listsNeedingPreview.map((r) => r.id);
    const { data: itemRows } = await admin
      .from('list_items')
      .select('list_id,payload')
      .in('list_id', listIds)
      .order('position', { ascending: true, nullsFirst: false })
      .order('added_at', { ascending: true });

    (itemRows || []).forEach((item) => {
      const current = previewItemsMap.get(item.list_id) || [];
      if (current.length < 5 && item.payload) {
        current.push(item.payload);
        previewItemsMap.set(item.list_id, current);
      }
    });
  }

  const listMap = new Map();

  listRows.forEach((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    const ownerUsername =
      payload?.ownerSnapshot?.username || ownerMap.get(row.user_id) || row.user_id;
    const slug = row.slug || row.id;
    const previewItems =
      Array.isArray(payload.previewItems) && payload.previewItems.length > 0
        ? payload.previewItems.filter(Boolean)
        : previewItemsMap.get(row.id) || [];
    const poster =
      row.poster_path ||
      payload.coverUrl ||
      previewItems[0]?.poster_path_full ||
      (previewItems[0]?.poster_path ? `${TMDB_IMG}/w342${previewItems[0].poster_path}` : null) ||
      null;

    listMap.set(row.id, {
      subjectHref: `/account/${ownerUsername}/lists/${slug}`,
      subjectId: row.id,
      subjectKey: createListReviewLikeKey(row.user_id, row.id),
      subjectOwnerId: row.user_id,
      subjectOwnerUsername: ownerUsername,
      subjectPreviewItems: previewItems,
      subjectPoster: poster,
      subjectSlug: slug,
      subjectTitle: row.title || 'Untitled List',
      subjectType: 'list',
    });
  });

  return listMap;
}

function buildMediaItemKey(entityType, entityId) {
  const normalizedEntityType = String(entityType || '')
    .trim()
    .toLowerCase();
  const normalizedEntityId = String(entityId || '').trim();
  return normalizedEntityType && normalizedEntityId
    ? `${normalizedEntityType}_${normalizedEntityId}`
    : null;
}

function resolveLimit(limitCount) {
  const numericLimit = Number(limitCount);
  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return REVIEW_LIMIT;
  }
  return Math.min(numericLimit, REVIEW_LIMIT);
}

export async function getMediaReviewsResource({ entityId, entityType, limitCount }) {
  const mediaKey = buildMediaItemKey(entityType, entityId);
  if (!mediaKey) return [];

  const admin = createAdminClient();
  const limit = resolveLimit(limitCount);

  const { data: rows, error: reviewError } = await admin
    .from('media_reviews')
    .select(MEDIA_REVIEW_SELECT)
    .eq('media_key', mediaKey)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (reviewError) {
    throw new Error(reviewError.message || 'Media reviews could not be loaded');
  }

  const reviewRows = rows || [];
  if (reviewRows.length === 0) return [];

  const userIds = [...new Set(reviewRows.map((r) => r.user_id).filter(Boolean))];
  const [likesMap, profilesResult] = await Promise.all([
    fetchReviewLikes(admin, [mediaKey]),
    userIds.length > 0
      ? admin.from('profiles').select('id,username,display_name,avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map();
  (profilesResult.data || []).forEach((p) => {
    userMap.set(p.id, {
      avatarUrl: p.avatar_url || null,
      id: p.id,
      name: p.display_name || p.username || 'Anonymous User',
      username: p.username || null,
    });
  });

  return sortReviewsByUpdatedAtDesc(
    reviewRows.map((row) =>
      normalizeReviewRow(
        row,
        {
          subjectHref: `/${entityType}/${entityId}`,
          subjectId: entityId,
          subjectKey: mediaKey,
          subjectType: entityType,
        },
        likesMap.get(
          `${String(mediaKey || '')
            .trim()
            .toLowerCase()}:${String(row.user_id || '')
            .trim()
            .toLowerCase()}`,
        ) || [],
        userMap.get(row.user_id),
      ),
    ),
  );
}

export async function getListReviewsResource({ limitCount, listId, ownerId, viewerId = null }) {
  if (!listId || !ownerId) return [];

  const admin = createAdminClient();
  const limit = resolveLimit(limitCount);
  const listResult = await admin.from('lists').select('user_id').eq('id', listId).maybeSingle();

  if (listResult.error) {
    throw new Error(listResult.error.message || 'List access could not be checked');
  }

  const actualOwnerId = normalizeValue(listResult.data?.user_id);
  if (!actualOwnerId || actualOwnerId !== normalizeValue(ownerId)) return [];

  const canAccess = await canViewerAccessUserContent({
    client: admin,
    ownerId: actualOwnerId,
    viewerId,
  });

  if (!canAccess) throw createPrivateProfileError();

  const { data: rows, error: reviewError } = await admin
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .eq('list_id', listId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (reviewError) {
    throw new Error(reviewError.message || 'List reviews could not be loaded');
  }

  const reviewRows = rows || [];
  if (reviewRows.length === 0) return [];

  const subjectKey = createListReviewLikeKey(ownerId, listId);
  const userIds = [...new Set(reviewRows.map((r) => r.user_id).filter(Boolean))];

  const [listMap, likesMap, profilesResult] = await Promise.all([
    loadListSubjectMap(admin, [listId]),
    fetchReviewLikes(admin, [subjectKey]),
    userIds.length > 0
      ? admin.from('profiles').select('id,username,display_name,avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map();
  (profilesResult.data || []).forEach((p) => {
    userMap.set(p.id, {
      avatarUrl: p.avatar_url || null,
      id: p.id,
      name: p.display_name || p.username || 'Anonymous User',
      username: p.username || null,
    });
  });

  const subject = listMap.get(listId) || {
    subjectHref: null,
    subjectId: listId,
    subjectKey,
    subjectOwnerId: ownerId,
    subjectOwnerUsername: ownerId,
    subjectPreviewItems: [],
    subjectPoster: null,
    subjectSlug: listId,
    subjectTitle: 'Untitled List',
    subjectType: 'list',
  };

  return sortReviewsByUpdatedAtDesc(
    reviewRows.map((row) =>
      normalizeReviewRow(
        row,
        subject,
        likesMap.get(
          `${String(subject.subjectKey || '')
            .trim()
            .toLowerCase()}:${String(row.user_id || '')
            .trim()
            .toLowerCase()}`,
        ) || [],
        userMap.get(row.user_id),
      ),
    ),
  );
}

function normalizeReviewReadRequest(query = {}) {
  const resource = normalizeValue(query.resource) === 'list' ? 'list' : 'media';
  const request = {
    entityId: normalizeValue(query.entityId),
    entityType: normalizeValue(query.entityType),
    limitCount: normalizeValue(query.limitCount),
    listId: normalizeValue(query.listId),
    ownerId: normalizeValue(query.ownerId),
    resource,
  };

  const isValid =
    resource === 'list'
      ? Boolean(request.listId && request.ownerId)
      : Boolean(request.entityId && request.entityType);

  return { isValid, request };
}

export async function readReviews(query = {}, { viewerId = null } = {}) {
  const { isValid, request } = normalizeReviewReadRequest(query);
  if (!isValid) return { data: [] };

  const cacheKey = `reviews|resource=${request.resource}|listId=${request.listId}|ownerId=${request.ownerId}|viewer=${normalizeValue(viewerId) || 'anon'}|entity=${request.entityType}:${request.entityId}|limit=${request.limitCount}`;

  const data = await getOrLoadCachedValue({
    cacheKey,
    enabled: true,
    ttlMs: 2000,
    loader: async () => {
      if (request.resource === 'list') {
        return getListReviewsResource({
          limitCount: request.limitCount,
          listId: request.listId,
          ownerId: request.ownerId,
          viewerId,
        });
      }

      return getMediaReviewsResource({
        entityId: request.entityId,
        entityType: request.entityType,
        limitCount: request.limitCount,
      });
    },
  });

  return {
    data: Array.isArray(data) ? data : [],
  };
}
