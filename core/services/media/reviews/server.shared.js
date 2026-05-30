import 'server-only';

import { normalizeTimestamp } from '@/core/utils/format';
import { isListSubjectType, isMovieMediaType, isTvReference } from '@/core/utils/media';

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

export function normalizeReviewRow(row = {}, subjectOverrides = {}, likes = []) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const user = payload.user && typeof payload.user === 'object' ? payload.user : {};
  const subject = {
    subjectHref: payload.subjectHref || null,
    subjectId: payload.subjectId || null,
    subjectKey: payload.subjectKey || row.media_key || null,
    subjectOwnerId: payload.subjectOwnerId || null,
    subjectOwnerUsername: payload.subjectOwnerUsername || null,
    subjectPreviewItems: Array.isArray(payload.subjectPreviewItems) ? payload.subjectPreviewItems : [],
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
    const updatedDiff = getSortableTimestamp(right?.updatedAt) - getSortableTimestamp(left?.updatedAt);

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

export function isSupportedReviewItem(item = {}) {
  if (isListSubjectType(item?.subjectType)) {
    return true;
  }

  if (!isMovieMediaType(item?.subjectType)) {
    return false;
  }

  return !isTvReference(item?.subjectHref);
}

export function paginateReviewItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Number(cursor) : 0;
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
  const fetchLimit = Math.min(Math.max(offset + normalizedPageSize * 2, normalizedPageSize * 2), 300);

  return {
    fetchLimit,
    offset,
    pageSize: normalizedPageSize,
  };
}
