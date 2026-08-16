import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/admin';

const REVIEW_LIMIT = 120;
const MEDIA_REVIEW_SELECT = 'content,created_at,is_spoiler,media_key,payload,rating,updated_at,user_id';
const LIST_REVIEW_SELECT = 'content,created_at,is_spoiler,list_id,payload,rating,updated_at,user_id';

function normalizeTrim(value) {
  return String(value ?? '').trim();
}

function normalizeLower(value) {
  return normalizeTrim(value).toLowerCase();
}

function normalizeTimestamp(value) {
  const raw = normalizeTrim(value);
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function buildMediaItemKey(entityType, entityId) {
  const normalizedEntityType = normalizeLower(entityType);
  const normalizedEntityId = normalizeTrim(entityId);
  return normalizedEntityType && normalizedEntityId ? `${normalizedEntityType}_${normalizedEntityId}` : null;
}

function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

function buildReviewDocPath(subject = {}, userId) {
  if (subject.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`;
  }
  return `media_items/${subject.subjectKey}/reviews/${userId}`;
}

function normalizeReviewRow(row = {}, subjectOverrides = {}, likes = []) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const user = payload.user && typeof payload.user === 'object' ? payload.user : {};

  const subject = {
    subjectHref: normalizeTrim(payload.subjectHref) || null,
    subjectId: normalizeTrim(payload.subjectId) || null,
    subjectKey: normalizeTrim(payload.subjectKey || row.media_key) || null,
    subjectOwnerId: normalizeTrim(payload.subjectOwnerId) || null,
    subjectOwnerUsername: normalizeTrim(payload.subjectOwnerUsername) || null,
    subjectPoster: normalizeTrim(payload.subjectPoster) || null,
    subjectSlug: normalizeTrim(payload.subjectSlug) || null,
    subjectTitle: normalizeTrim(payload.subjectTitle || payload.title) || 'Untitled',
    subjectType: normalizeTrim(payload.subjectType) || null,
    ...subjectOverrides,
  };
  const reviewUserId = normalizeTrim(row.user_id || payload.authorId || user.id) || null;
  const docPath = buildReviewDocPath(subject, reviewUserId);

  const resolvedContent =
    'content' in row && row.content !== undefined
      ? (row.content ?? '')
      : (payload.content ?? '');
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
    content: normalizeTrim(resolvedContent) || '',
    createdAt: normalizeTimestamp(row.created_at),
    docPath,
    id: `${docPath}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: normalizeTrim(row.media_key || subject.subjectKey) || null,
    rating: resolvedRating,
    reviewUserId,
    subjectHref: subject.subjectHref,
    subjectId: subject.subjectId,
    subjectKey: subject.subjectKey,
    subjectOwnerId: subject.subjectOwnerId,
    subjectOwnerUsername: subject.subjectOwnerUsername,
    subjectPoster: subject.subjectPoster,
    subjectSlug: subject.subjectSlug,
    subjectTitle: subject.subjectTitle,
    subjectType: subject.subjectType,
    updatedAt: normalizeTimestamp(row.updated_at),
    user: {
      avatarUrl: normalizeTrim(user.avatarUrl) || null,
      id: reviewUserId,
      name: normalizeTrim(user.name) || 'Anonymous User',
      username: normalizeTrim(user.username) || null,
    },
  };
}

function buildLikesMap(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${normalizeTrim(row.media_key)}:${normalizeTrim(row.review_user_id)}`;
    if (!key || key === ':') return;

    const current = map.get(key) || [];
    current.push(normalizeTrim(row.user_id));
    map.set(key, current.filter(Boolean));
  });
  return map;
}

async function fetchReviewLikes(admin, mediaKeys = []) {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const { data, error } = await admin
      .from('review_likes')
      .select('media_key,review_user_id,user_id')
      .in('media_key', chunk);

    if (error) {
      throw new Error(error.message || 'Review likes could not be loaded');
    }
    likesRows.push(...(data || []));
  }

  return buildLikesMap(likesRows);
}

async function loadListSubject(admin, { ownerId, listId }) {
  const { data: listData, error } = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .eq('id', listId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'List reviews could not be loaded');
  }

  if (!listData) {
    return {
      subjectHref: null,
      subjectId: listId,
      subjectKey: createListReviewLikeKey(ownerId, listId),
      subjectOwnerId: ownerId,
      subjectOwnerUsername: ownerId,
      subjectPoster: null,
      subjectPreviewItems: [],
      subjectSlug: listId,
      subjectTitle: 'Untitled List',
      subjectType: 'list',
    };
  }

  const payload = listData.payload && typeof listData.payload === 'object' ? listData.payload : {};
  const ownerSnapshot = payload.ownerSnapshot && typeof payload.ownerSnapshot === 'object' ? payload.ownerSnapshot : {};
  const ownerUsername = normalizeTrim(ownerSnapshot.username || listData.user_id || ownerId);
  const resolvedSlug = normalizeTrim(listData.slug || listData.id);

  let previewItems = Array.isArray(payload.previewItems) ? payload.previewItems.filter(Boolean) : [];
  if (previewItems.length === 0) {
    const { data: itemRows } = await admin
      .from('list_items')
      .select('payload')
      .eq('list_id', listData.id)
      .order('position', { ascending: true, nullsFirst: false })
      .order('added_at', { ascending: true })
      .limit(5);

    previewItems = (itemRows || []).map((row) => row.payload).filter(Boolean);
  }

  const coverUrl =
    normalizeTrim(listData.poster_path || payload.coverUrl) ||
    previewItems[0]?.poster_path_full ||
    (previewItems[0]?.poster_path ? `${TMDB_IMG}/w342${previewItems[0].poster_path}` : null) ||
    null;

  return {
    subjectHref: `/account/${ownerUsername}/lists/${resolvedSlug}`,
    subjectId: normalizeTrim(listData.id),
    subjectKey: createListReviewLikeKey(normalizeTrim(listData.user_id), normalizeTrim(listData.id)),
    subjectOwnerId: normalizeTrim(listData.user_id),
    subjectOwnerUsername: ownerUsername,
    subjectPoster: coverUrl,
    subjectPreviewItems: previewItems,
    subjectSlug: resolvedSlug,
    subjectTitle: normalizeTrim(listData.title) || 'Untitled List',
    subjectType: 'list',
  };
}

export async function getMediaReviewsResource({ entityId, entityType, limitCount = REVIEW_LIMIT }) {
  const mediaKey = buildMediaItemKey(entityType, entityId);
  if (!mediaKey) return [];

  const limit = Math.max(1, Math.min(Math.floor(Number(limitCount) || REVIEW_LIMIT), REVIEW_LIMIT));
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('media_reviews')
    .select(MEDIA_REVIEW_SELECT)
    .eq('media_key', mediaKey)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Media reviews could not be loaded');
  }

  const likesMap = await fetchReviewLikes(admin, [mediaKey]);

  return (rows || []).map((row) =>
    normalizeReviewRow(
      row,
      {},
      likesMap.get(`${mediaKey}:${normalizeTrim(row.user_id)}`) || []
    )
  );
}

export async function getListReviewsResource({ ownerId, listId, limitCount = REVIEW_LIMIT }) {
  if (!listId || !ownerId) return [];

  const limit = Math.max(1, Math.min(Math.floor(Number(limitCount) || REVIEW_LIMIT), REVIEW_LIMIT));
  const admin = createAdminClient();

  const subject = await loadListSubject(admin, { ownerId, listId });
  const { data: rows, error } = await admin
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .eq('list_id', listId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'List reviews could not be loaded');
  }

  const userIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
  const [likesMap, authorProfilesResult] = await Promise.all([
    fetchReviewLikes(admin, [normalizeTrim(subject.subjectKey)]),
    userIds.length > 0
      ? admin.from('profiles').select('id,username,display_name,avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map();
  (authorProfilesResult.data || []).forEach((p) => {
    userMap.set(p.id, {
      avatarUrl: p.avatar_url || null,
      id: p.id,
      name: p.display_name || p.username || 'Anonymous User',
      username: p.username || null,
    });
  });

  return (rows || []).map((row) =>
    normalizeReviewRow(
      row,
      subject,
      likesMap.get(`${normalizeTrim(subject.subjectKey)}:${normalizeTrim(row.user_id)}`) || [],
      userMap.get(row.user_id),
    ),
  );
}
