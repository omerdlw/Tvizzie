import 'server-only';

import { ACTIVITY_EVENT_TYPES } from '@/core/services/activity/activity-events.constants';
import { getCollectionResource } from '@/core/services/account/account-collections.server';
import { getAccountProfileByUserId } from '@/core/services/account/account-profile.server';
import { fetchProfileReviewFeedServer } from '@/core/services/media/reviews/server.js';
import { normalizeTimestamp } from '@/core/utils';
import { normalizeMediaType } from '@/core/utils/media';
import {
  isVisibleActivityItem,
  normalizeActor,
  normalizeReviewCard,
  normalizeSubject,
  normalizeValue,
} from './account-feed.normalizers';

function resolveDerivedFetchLimit(offset = 0, pageSize = 20) {
  const normalizedOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;
  const normalizedPageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.floor(Number(pageSize))) : 20;

  return Math.min(200, Math.max(normalizedOffset + normalizedPageSize * 3, 48));
}

function createDerivedActor(profile = null, fallbackUserId = null) {
  return normalizeActor({
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || profile?.username || 'Someone',
    id: profile?.id || fallbackUserId || null,
    username: profile?.username || null,
  });
}

function buildMediaHref(subjectType, subjectId) {
  const normalizedType = normalizeMediaType(subjectType);
  const normalizedId = normalizeValue(subjectId);

  if (!normalizedType || !normalizedId) {
    return null;
  }

  return `/${normalizedType}/${normalizedId}`;
}

function createDerivedMediaSubject(item = {}) {
  const subjectType = normalizeMediaType(item?.entityType || item?.media_type);
  const subjectId = normalizeValue(item?.entityId || item?.id);

  if (!subjectType || !subjectId) {
    return null;
  }

  return normalizeSubject({
    href: buildMediaHref(subjectType, subjectId),
    id: subjectId,
    poster: item?.poster_path || item?.poster || null,
    title: item?.title || item?.name || 'Untitled',
    type: subjectType,
  });
}

function createDerivedListSubject(list = {}, actor = {}) {
  const listId = normalizeValue(list?.id);
  const ownerId = normalizeValue(list?.ownerId || actor?.id);
  const ownerUsername = normalizeValue(list?.ownerSnapshot?.username || actor?.username);
  const slug = normalizeValue(list?.slug || listId);

  if (!listId || !slug) {
    return null;
  }

  return normalizeSubject({
    href: ownerUsername ? `/account/${ownerUsername}/lists/${slug}` : null,
    id: listId,
    ownerId: ownerId || null,
    ownerUsername: ownerUsername || null,
    poster: list?.coverUrl || null,
    slug,
    title: list?.title || 'Untitled List',
    type: 'list',
  });
}

function createDerivedReviewSubject(review = {}) {
  const subjectType = normalizeMediaType(review?.subjectType);
  const subjectId = normalizeValue(review?.subjectId);

  if (!subjectType || !subjectId) {
    return null;
  }

  return normalizeSubject({
    href: review?.subjectHref || buildMediaHref(subjectType, subjectId),
    id: subjectId,
    ownerId: review?.subjectOwnerId || null,
    ownerUsername: review?.subjectOwnerUsername || null,
    poster: review?.subjectPoster || null,
    slug: review?.subjectSlug || null,
    title: review?.subjectTitle || 'Untitled',
    type: subjectType,
  });
}

function createDerivedReviewCard(review = {}) {
  return normalizeReviewCard({
    authorId: review?.authorId || review?.reviewUserId || review?.user?.id || null,
    content: review?.content || '',
    createdAt: review?.createdAt || review?.updatedAt,
    id: review?.id || review?.docPath || null,
    isSpoiler: Boolean(review?.isSpoiler),
    likes: Array.isArray(review?.likes) ? review.likes : [],
    rating: review?.rating ?? null,
    reviewUserId: review?.reviewUserId || review?.authorId || review?.user?.id || null,
    subjectHref: review?.subjectHref || null,
    subjectId: review?.subjectId || null,
    subjectKey: review?.subjectKey || null,
    subjectOwnerId: review?.subjectOwnerId || null,
    subjectOwnerUsername: review?.subjectOwnerUsername || null,
    subjectPoster: review?.subjectPoster || null,
    subjectPreviewItems: Array.isArray(review?.subjectPreviewItems) ? review.subjectPreviewItems : [],
    subjectSlug: review?.subjectSlug || null,
    subjectTitle: review?.subjectTitle || 'Untitled',
    subjectType: review?.subjectType || null,
    updatedAt: review?.updatedAt || review?.createdAt,
    user: {
      avatarUrl: review?.user?.avatarUrl || null,
      id: review?.user?.id || review?.reviewUserId || review?.authorId || null,
      name: review?.user?.name || 'Anonymous User',
      username: review?.user?.username || null,
    },
  });
}

function createDerivedActivityItem({
  actor = {},
  details = {},
  eventType,
  occurredAt,
  reviewCard = null,
  subject = null,
}) {
  if (!subject) {
    return null;
  }

  const normalizedOccurredAt = normalizeTimestamp(occurredAt);

  if (!normalizedOccurredAt) {
    return null;
  }

  const dedupeKey = [
    'derived',
    normalizeValue(actor?.id) || 'anonymous',
    normalizeValue(eventType) || 'UNKNOWN',
    normalizeValue(subject?.type) || 'unknown',
    normalizeValue(subject?.id) || 'unknown',
    normalizedOccurredAt,
  ].join(':');

  return {
    actor: normalizeActor(actor),
    createdAt: normalizedOccurredAt,
    dedupeKey,
    details: details && typeof details === 'object' ? details : {},
    eventType,
    id: dedupeKey,
    occurredAt: normalizedOccurredAt,
    renderKind: reviewCard ? 'text_with_review' : 'text',
    reviewCard,
    slotType: null,
    sourceUserId: actor?.id || null,
    subject,
    updatedAt: normalizedOccurredAt,
    version: 2,
    visibility: 'public',
  };
}

function createDerivedCollectionActivityItem(resource, item, actor) {
  const subject =
    resource === 'lists' || resource === 'liked-lists'
      ? createDerivedListSubject(item, actor)
      : createDerivedMediaSubject(item);

  if (!subject) {
    return null;
  }

  switch (resource) {
    case 'likes':
      return createDerivedActivityItem({
        actor,
        eventType: ACTIVITY_EVENT_TYPES.LIKED_ADDED,
        occurredAt: item?.addedAt || item?.updatedAt,
        subject,
      });
    case 'watchlist':
      return createDerivedActivityItem({
        actor,
        eventType: ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED,
        occurredAt: item?.addedAt || item?.updatedAt,
        subject,
      });
    case 'watched': {
      const watchedAt = item?.lastWatchedAt || item?.updatedAt || item?.addedAt;

      return createDerivedActivityItem({
        actor,
        details: watchedAt ? { watchedAt } : {},
        eventType: ACTIVITY_EVENT_TYPES.WATCHED_ADDED,
        occurredAt: watchedAt,
        subject,
      });
    }
    case 'lists':
      return createDerivedActivityItem({
        actor,
        eventType: ACTIVITY_EVENT_TYPES.LIST_CREATED,
        occurredAt: item?.updatedAt || item?.createdAt,
        subject,
      });
    case 'liked-lists':
      return createDerivedActivityItem({
        actor,
        eventType: ACTIVITY_EVENT_TYPES.LIST_LIKED,
        occurredAt: item?.likedAt || item?.updatedAt || item?.createdAt,
        subject,
      });
    default:
      return null;
  }
}

function createDerivedReviewActivityItem(review = {}, actor = {}) {
  const subject = createDerivedReviewSubject(review);

  if (!subject) {
    return null;
  }

  const normalizedContent = normalizeValue(review?.content);
  const normalizedRating = Number(review?.rating);
  const hasRating = Number.isFinite(normalizedRating) && normalizedRating > 0;
  const isListSubject = subject.type === 'list';
  const eventType = isListSubject
    ? ACTIVITY_EVENT_TYPES.LIST_COMMENTED
    : normalizedContent
      ? ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED
      : hasRating
        ? ACTIVITY_EVENT_TYPES.RATING_LOGGED
        : null;

  if (!eventType) {
    return null;
  }

  return createDerivedActivityItem({
    actor,
    details: hasRating ? { rating: normalizedRating } : {},
    eventType,
    occurredAt: review?.updatedAt || review?.createdAt,
    reviewCard:
      eventType === ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED || eventType === ACTIVITY_EVENT_TYPES.LIST_COMMENTED
        ? createDerivedReviewCard(review)
        : null,
    subject,
  });
}

export async function fetchDerivedUserActivityItems({ offset = 0, pageSize = 20, userId, viewerId = null }) {
  const fetchLimit = resolveDerivedFetchLimit(offset, pageSize);
  const [profile, likes, watchlist, watched, lists, likedLists, reviewFeed] = await Promise.all([
    getAccountProfileByUserId(userId, { viewerId }).catch(() => null),
    getCollectionResource({
      limitCount: fetchLimit,
      resource: 'likes',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getCollectionResource({
      limitCount: fetchLimit,
      resource: 'watchlist',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getCollectionResource({
      limitCount: fetchLimit,
      resource: 'watched',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getCollectionResource({
      limitCount: fetchLimit,
      resource: 'lists',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getCollectionResource({
      limitCount: fetchLimit,
      resource: 'liked-lists',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    fetchProfileReviewFeedServer({
      mode: 'authored',
      pageSize: fetchLimit,
      userId,
      viewerId,
    }).catch(() => ({ items: [] })),
  ]);

  const actor = createDerivedActor(profile, userId);
  const derivedItems = [
    ...(Array.isArray(likes) ? likes : []).map((item) => createDerivedCollectionActivityItem('likes', item, actor)),
    ...(Array.isArray(watchlist) ? watchlist : []).map((item) =>
      createDerivedCollectionActivityItem('watchlist', item, actor)
    ),
    ...(Array.isArray(watched) ? watched : []).map((item) =>
      createDerivedCollectionActivityItem('watched', item, actor)
    ),
    ...(Array.isArray(lists) ? lists : []).map((item) => createDerivedCollectionActivityItem('lists', item, actor)),
    ...(Array.isArray(likedLists) ? likedLists : []).map((item) =>
      createDerivedCollectionActivityItem('liked-lists', item, actor)
    ),
    ...(Array.isArray(reviewFeed?.items) ? reviewFeed.items : []).map((item) =>
      createDerivedReviewActivityItem(item, actor)
    ),
  ];

  return derivedItems.filter(isVisibleActivityItem);
}
