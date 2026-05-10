import 'server-only';

import { ACTIVITY_EVENT_TYPE_SET } from '@/core/services/activity/activity-events.constants';
import { normalizeTimestamp } from '@/core/utils';
import { normalizeMediaType } from '@/core/utils/media';
import { ACTIVITY_SORT_MODES, ACTIVITY_SUBJECT_FILTERS } from './account-feed.constants';

export function normalizeValue(value) {
  return String(value || '').trim();
}

export function normalizeActor(value = {}) {
  return {
    avatarUrl: value?.avatarUrl || null,
    displayName: value?.displayName || value?.name || 'Someone',
    id: value?.id || null,
    username: value?.username || null,
  };
}

export function normalizeSubject(value = {}) {
  return {
    href: value?.href || null,
    id: value?.id || null,
    ownerId: value?.ownerId || null,
    ownerUsername: value?.ownerUsername || null,
    poster: value?.poster || null,
    slug: value?.slug || null,
    title: value?.title || 'Untitled',
    type: normalizeMediaType(value?.type),
  };
}

export function normalizeReviewCard(value = {}) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    authorId: value.authorId || value.reviewUserId || null,
    content: value.content || '',
    createdAt: normalizeTimestamp(value.createdAt),
    id: value.id || null,
    isSpoiler: Boolean(value.isSpoiler),
    likes: Array.isArray(value.likes) ? value.likes : [],
    rating: value.rating === null || value.rating === undefined ? null : Number(value.rating),
    reviewUserId: value.reviewUserId || value.authorId || null,
    subjectHref: value.subjectHref || null,
    subjectId: value.subjectId || null,
    subjectKey: value.subjectKey || null,
    subjectOwnerId: value.subjectOwnerId || null,
    subjectOwnerUsername: value.subjectOwnerUsername || null,
    subjectPoster: value.subjectPoster || null,
    subjectPreviewItems: Array.isArray(value.subjectPreviewItems) ? value.subjectPreviewItems : [],
    subjectSlug: value.subjectSlug || null,
    subjectTitle: value.subjectTitle || 'Untitled',
    subjectType: normalizeMediaType(value.subjectType),
    updatedAt: normalizeTimestamp(value.updatedAt || value.createdAt),
    user: {
      avatarUrl: value?.user?.avatarUrl || null,
      id: value?.user?.id || value.reviewUserId || value.authorId || null,
      name: value?.user?.name || 'Anonymous User',
      username: value?.user?.username || null,
    },
  };
}

export function normalizeActivityRow(row = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};

  if (Number(payload.version) !== 2) {
    return null;
  }

  return {
    actor: normalizeActor(payload.actor || {}),
    createdAt: normalizeTimestamp(row.created_at || payload.occurredAt),
    dedupeKey: row.dedupe_key || payload.dedupeKey || null,
    details: payload.details && typeof payload.details === 'object' ? payload.details : {},
    eventType: row.event_type || payload.eventType || 'UNKNOWN',
    id: row.id || null,
    occurredAt: normalizeTimestamp(payload.occurredAt || row.updated_at || row.created_at),
    renderKind: payload.renderKind === 'text_with_review' ? 'text_with_review' : 'text',
    reviewCard: normalizeReviewCard(payload.reviewCard),
    slotType: payload.slotType || null,
    sourceUserId: row.user_id || null,
    subject: normalizeSubject(payload.subject || {}),
    updatedAt: normalizeTimestamp(row.updated_at || payload.occurredAt || row.created_at),
    version: 2,
    visibility: payload.visibility || 'public',
  };
}

export function isVisibleActivityItem(item = {}) {
  if (!item || !ACTIVITY_EVENT_TYPE_SET.has(item.eventType)) {
    return false;
  }

  return item.subject.type === 'movie' || item.subject.type === 'list';
}

function getActivityTimestamp(item = {}) {
  const timestamp = item?.occurredAt || item?.updatedAt || item?.createdAt;
  const parsed = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortActivityItems(items = []) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left);

    if (timestampDiff !== 0) {
      return timestampDiff;
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
}

export function normalizeActivitySubjectFilter(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SUBJECT_FILTERS.has(normalized) ? normalized : 'all';
}

export function normalizeActivitySort(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SORT_MODES.has(normalized) ? normalized : 'newest';
}

export function filterActivityItemsBySubject(items = [], subject = 'all') {
  const normalizedSubject = normalizeActivitySubjectFilter(subject);

  if (normalizedSubject === 'all') {
    return Array.isArray(items) ? items : [];
  }

  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeMediaType(item?.subject?.type) === normalizedSubject
  );
}

export function sortActivityItemsForMode(items = [], sort = 'newest') {
  const normalizedItems = sortActivityItems(items);

  if (normalizeActivitySort(sort) === 'oldest') {
    return [...normalizedItems].reverse();
  }

  return normalizedItems;
}

export function dedupeActivityItems(items = []) {
  const seenKeys = new Set();

  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = normalizeValue(item?.dedupeKey) || normalizeValue(item?.id);

    if (!key || seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

export function paginateItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Math.max(0, Number(cursor)) : 0;
  const normalizedPageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Number(pageSize)) : 20;
  const nextItems = items.slice(offset, offset + normalizedPageSize);
  const nextOffset = offset + nextItems.length;

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  };
}

export function chunkArray(values = [], size = 100) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}
