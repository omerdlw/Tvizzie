import 'server-only';

import { createClient as createServerClient } from '@/core/clients/supabase/server';
import { buildMediaItemKey } from '@/core/services/shared/media-key.service';
import { normalizeTimestamp } from '@/core/utils';

const REVIEW_LIMIT = 120;
const MEDIA_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'media_key',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');
const LIST_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'list_id',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');

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
    subjectHref: payload.subjectHref || null,
    subjectId: payload.subjectId || null,
    subjectKey: payload.subjectKey || row.media_key || null,
    subjectOwnerId: payload.subjectOwnerId || null,
    subjectOwnerUsername: payload.subjectOwnerUsername || null,
    subjectPoster: payload.subjectPoster || null,
    subjectSlug: payload.subjectSlug || null,
    subjectTitle: payload.subjectTitle || payload.title || 'Untitled',
    subjectType: payload.subjectType || null,
    ...subjectOverrides,
  };
  const reviewUserId = row.user_id || payload.authorId || user.id || null;

  return {
    authorId: reviewUserId,
    content: row.content || payload.content || '',
    createdAt: normalizeTimestamp(row.created_at),
    docPath: buildReviewDocPath(subject, reviewUserId),
    id: `${buildReviewDocPath(subject, reviewUserId)}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: row.media_key || subject.subjectKey || null,
    rating: row.rating === null || row.rating === undefined ? (payload.rating ?? null) : Number(row.rating),
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
      avatarUrl: user.avatarUrl || null,
      id: reviewUserId,
      name: user.name || 'Anonymous User',
      username: user.username || null,
    },
  };
}

function buildLikesMap(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const key = `${row.media_key}:${row.review_user_id}`;
    const current = map.get(key) || [];

    current.push(row.user_id);
    map.set(key, current);
  });

  return map;
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result;
}

function resolveLimitCount(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return REVIEW_LIMIT;
  }

  return Math.max(1, Math.min(Math.floor(parsed), REVIEW_LIMIT));
}

async function fetchReviewLikes(client, mediaKeys = []) {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const result = await client
      .from('review_likes')
      .select('media_key, review_user_id, user_id')
      .in('media_key', chunk);

    assertResult(result, 'Review likes could not be loaded');
    likesRows.push(...(result.data || []));
  }

  return buildLikesMap(likesRows);
}

async function loadListSubject(client, { ownerId, listId }) {
  const listResult = await client
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle();

  assertResult(listResult, 'List reviews could not be loaded');

  if (!listResult.data) {
    return {
      subjectHref: null,
      subjectId: listId,
      subjectKey: createListReviewLikeKey(ownerId, listId),
      subjectOwnerId: ownerId,
      subjectOwnerUsername: ownerId,
      subjectPoster: null,
      subjectSlug: listId,
      subjectTitle: 'Untitled List',
      subjectType: 'list',
    };
  }

  const payload = listResult.data.payload && typeof listResult.data.payload === 'object' ? listResult.data.payload : {};
  const ownerUsername = payload?.ownerSnapshot?.username || listResult.data.user_id || ownerId;
  const slug = listResult.data.slug || listResult.data.id;

  return {
    subjectHref: `/account/${ownerUsername}/lists/${slug}`,
    subjectId: listResult.data.id,
    subjectKey: createListReviewLikeKey(listResult.data.user_id, listResult.data.id),
    subjectOwnerId: listResult.data.user_id,
    subjectOwnerUsername: ownerUsername,
    subjectPoster: listResult.data.poster_path || payload.coverUrl || null,
    subjectSlug: slug,
    subjectTitle: listResult.data.title || 'Untitled List',
    subjectType: 'list',
  };
}

export async function getMediaReviewsResource({ entityId, entityType, limitCount = REVIEW_LIMIT }) {
  if (!entityId || !entityType) {
    return [];
  }

  const client = await createServerClient();
  const mediaKey = buildMediaItemKey(entityType, entityId);
  const result = await client
    .from('media_reviews')
    .select(MEDIA_REVIEW_SELECT)
    .eq('media_key', mediaKey)
    .order('updated_at', { ascending: false })
    .limit(resolveLimitCount(limitCount));

  assertResult(result, 'Media reviews could not be loaded');

  const likesMap = await fetchReviewLikes(client, [mediaKey]);

  return (result.data || []).map((row) =>
    normalizeReviewRow(row, {}, likesMap.get(`${mediaKey}:${row.user_id}`) || [])
  );
}

export async function getListReviewsResource({ listId, ownerId, limitCount = REVIEW_LIMIT }) {
  if (!listId || !ownerId) {
    return [];
  }

  const client = await createServerClient();
  const subject = await loadListSubject(client, { listId, ownerId });
  const result = await client
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .eq('list_id', listId)
    .order('updated_at', { ascending: false })
    .limit(resolveLimitCount(limitCount));

  assertResult(result, 'List reviews could not be loaded');

  const likesMap = await fetchReviewLikes(client, [subject.subjectKey]);

  return (result.data || []).map((row) =>
    normalizeReviewRow(row, subject, likesMap.get(`${subject.subjectKey}:${row.user_id}`) || [])
  );
}
