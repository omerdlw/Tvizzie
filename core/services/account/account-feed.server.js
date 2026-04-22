import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACTIVITY_EVENT_TYPE_SET, ACTIVITY_EVENT_TYPES } from '@/core/services/activity/activity-events.constants';
import { canViewerAccessUserContent, createPrivateProfileError, getAccountProfileByUserId } from '@/core/services/account/account-profile.server';
import { getCollectionResource } from '@/core/services/account/account-collections.server';
import { fetchProfileReviewFeedServer } from '@/core/services/media/reviews.server';
import { normalizeTimestamp } from '@/core/utils';
import { normalizeMediaType } from '@/core/utils/media';

const ACTIVITY_SELECT = ['created_at', 'dedupe_key', 'event_type', 'id', 'payload', 'updated_at', 'user_id'].join(',');
const ACTIVITY_SUBJECT_FILTERS = new Set(['all', 'list', 'movie']);
const ACTIVITY_SORT_MODES = new Set(['newest', 'oldest']);
const FOLLOW_STATUS_ACCEPTED = 'accepted';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeActor(value = {}) {
  return {
    avatarUrl: value?.avatarUrl || null,
    displayName: value?.displayName || value?.name || 'Someone',
    id: value?.id || null,
    username: value?.username || null,
  };
}

function normalizeSubject(value = {}) {
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

function normalizeReviewCard(value = {}) {
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

function normalizeActivityRow(row = {}) {
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

function isVisibleActivityItem(item = {}) {
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

function sortActivityItems(items = []) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left);

    if (timestampDiff !== 0) {
      return timestampDiff;
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
}

function normalizeActivitySubjectFilter(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SUBJECT_FILTERS.has(normalized) ? normalized : 'all';
}

function normalizeActivitySort(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return ACTIVITY_SORT_MODES.has(normalized) ? normalized : 'newest';
}

function filterActivityItemsBySubject(items = [], subject = 'all') {
  const normalizedSubject = normalizeActivitySubjectFilter(subject);

  if (normalizedSubject === 'all') {
    return Array.isArray(items) ? items : [];
  }

  return (Array.isArray(items) ? items : []).filter((item) => normalizeMediaType(item?.subject?.type) === normalizedSubject);
}

function sortActivityItemsForMode(items = [], sort = 'newest') {
  const normalizedItems = sortActivityItems(items);

  if (normalizeActivitySort(sort) === 'oldest') {
    return [...normalizedItems].reverse();
  }

  return normalizedItems;
}

function dedupeActivityItems(items = []) {
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

function paginateItems(items = [], cursor = null, pageSize = 20) {
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

function chunkArray(values = [], size = 100) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

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

function createDerivedActivityItem({ actor = {}, details = {}, eventType, occurredAt, reviewCard = null, subject = null }) {
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
  const subject = resource === 'lists' ? createDerivedListSubject(item, actor) : createDerivedMediaSubject(item);

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

async function fetchDerivedUserActivityItems({ offset = 0, pageSize = 20, userId, viewerId = null }) {
  const fetchLimit = resolveDerivedFetchLimit(offset, pageSize);
  const [profile, likes, watchlist, watched, lists, reviewFeed] = await Promise.all([
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
    ...(Array.isArray(watched) ? watched : []).map((item) => createDerivedCollectionActivityItem('watched', item, actor)),
    ...(Array.isArray(lists) ? lists : []).map((item) => createDerivedCollectionActivityItem('lists', item, actor)),
    ...(Array.isArray(reviewFeed?.items) ? reviewFeed.items : []).map((item) => createDerivedReviewActivityItem(item, actor)),
  ];

  return derivedItems.filter(isVisibleActivityItem);
}

function buildAccountHref({ id = null, username = null } = {}) {
  const normalizedUsername = normalizeValue(username);
  const normalizedId = normalizeValue(id);

  if (normalizedUsername) {
    return `/account/${normalizedUsername}`;
  }

  if (normalizedId) {
    return `/account/${normalizedId}`;
  }

  return null;
}

function createTextPart(text) {
  return {
    kind: 'text',
    text,
  };
}

function createRatingPart(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return {
    kind: 'rating',
    rating: numericValue,
  };
}

function createLinkPart(kind, text, href = null) {
  return {
    href: href || null,
    kind,
    text,
  };
}

function getPossessiveSuffix(label) {
  return normalizeValue(label).toLowerCase().endsWith('s') ? "' " : "'s ";
}

function createActorPart(actor = {}, viewerId = null) {
  const isViewerActor = normalizeValue(actor.id) && normalizeValue(actor.id) === normalizeValue(viewerId);

  return {
    href: buildAccountHref(actor),
    kind: 'actor',
    text: isViewerActor ? 'You' : actor.displayName || actor.username || 'Someone',
  };
}

function createSubjectPart(subject = {}) {
  return createLinkPart('subject', subject.title || 'Untitled', subject.href || null);
}

function buildListReferenceParts(item, viewerId = null) {
  const isViewerActor = normalizeValue(item?.actor?.id) && normalizeValue(item.actor.id) === normalizeValue(viewerId);
  const isOwnList = normalizeValue(item?.subject?.ownerId) && normalizeValue(item.subject.ownerId) === normalizeValue(item?.actor?.id);

  if (isOwnList) {
    return [createTextPart(isViewerActor ? 'your own ' : 'their own '), createSubjectPart(item.subject), createTextPart(' list')];
  }

  const ownerLabel = item?.subject?.ownerUsername || 'someone';
  return [createTextPart(`${ownerLabel}${getPossessiveSuffix(ownerLabel)}`), createSubjectPart(item.subject), createTextPart(' list')];
}

function projectActivityLine(item = {}, viewerId = null) {
  const actorPart = createActorPart(item.actor, viewerId);
  const subjectPart = createSubjectPart(item.subject);
  const ratingPart = createRatingPart(item?.details?.rating);

  switch (item.eventType) {
    case ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED:
      return {
        parts: [actorPart, createTextPart(' added '), subjectPart, createTextPart(actorPart.text === 'You' ? ' to your watchlist' : ' to their watchlist')],
      };
    case ACTIVITY_EVENT_TYPES.LIKED_ADDED:
      return {
        parts: [actorPart, createTextPart(' liked '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.WATCHED_ADDED:
      return {
        parts: [actorPart, createTextPart(' watched '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.RATING_LOGGED:
      return {
        parts: [actorPart, createTextPart(' rated '), subjectPart, ...(ratingPart ? [createTextPart(' '), ratingPart] : [])],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED:
      return {
        parts: [actorPart, createTextPart(' reviewed '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.LIST_CREATED:
      return {
        parts: [actorPart, createTextPart(' created a list: '), subjectPart],
      };
    case ACTIVITY_EVENT_TYPES.LIST_COMMENTED:
      return {
        parts: [actorPart, createTextPart(' commented on '), ...buildListReferenceParts(item, viewerId)],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_LIKED: {
      const reviewOwnerLabel = item?.details?.reviewOwnerDisplayName || item?.details?.reviewOwnerUsername || 'Someone';
      const reviewOwnerHref = buildAccountHref({
        id: item?.details?.reviewOwnerId,
        username: item?.details?.reviewOwnerUsername,
      });
      const likedReviewRatingPart =
        normalizeMediaType(item?.subject?.type) === 'movie' ? createRatingPart(item?.details?.reviewRating) : null;

      return {
        parts: likedReviewRatingPart
          ? [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(getPossessiveSuffix(reviewOwnerLabel)),
              likedReviewRatingPart,
              createTextPart(' review of '),
              subjectPart,
            ]
          : [
              actorPart,
              createTextPart(' liked '),
              createLinkPart('account', reviewOwnerLabel, reviewOwnerHref),
              createTextPart(`${getPossessiveSuffix(reviewOwnerLabel)}review of `),
              subjectPart,
            ],
      };
    }
    default:
      return {
        parts: [actorPart, createTextPart(' updated '), subjectPart],
      };
  }
}

function projectActivityItem(item = {}, viewerId = null) {
  const line = projectActivityLine(item, viewerId);

  return {
    ...item,
    line,
    renderKind: item.renderKind === 'text_with_review' && item.reviewCard ? 'text_with_review' : 'text',
    reviewCard: item.renderKind === 'text_with_review' ? item.reviewCard : null,
  };
}

async function fetchActivitiesForSources(admin, sourceIds = [], pageSize = null) {
  const uniqueSourceIds = [...new Set(sourceIds.map((value) => normalizeValue(value)).filter(Boolean))];

  if (!uniqueSourceIds.length) {
    return [];
  }

  const perSourceLimit = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : null;
  const groups = await Promise.all(
    chunkArray(uniqueSourceIds, 100).map(async (idChunk) => {
      let queryBuilder = admin
        .from('activity')
        .select(ACTIVITY_SELECT)
        .in('event_type', [...ACTIVITY_EVENT_TYPE_SET])
        .in('user_id', idChunk)
        .order('updated_at', { ascending: false });

      if (perSourceLimit) {
        queryBuilder = queryBuilder.limit(idChunk.length * perSourceLimit);
      }

      const result = await queryBuilder;

      if (result.error) {
        throw new Error(result.error.message || 'Activity feed could not be loaded');
      }

      return (result.data || []).map(normalizeActivityRow).filter(isVisibleActivityItem);
    })
  );

  const countsBySource = new Map();
  const normalizedItems = sortActivityItems(groups.flat()).filter((item) => {
    if (!perSourceLimit) {
      return true;
    }

    const sourceUserId = normalizeValue(item?.sourceUserId);

    if (!sourceUserId) {
      return false;
    }

    const currentCount = countsBySource.get(sourceUserId) || 0;

    if (currentCount >= perSourceLimit) {
      return false;
    }

    countsBySource.set(sourceUserId, currentCount + 1);
    return true;
  });

  return normalizedItems;
}

async function fetchAcceptedFollowingIds(admin, userId) {
  const result = await admin.from('follows').select('following_id').eq('follower_id', userId).eq('status', FOLLOW_STATUS_ACCEPTED);

  if (result.error) {
    throw new Error(result.error.message || 'Following list could not be loaded');
  }

  return (result.data || []).map((item) => item.following_id).filter(Boolean);
}

export async function fetchAccountActivityFeedServer({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });

  if (!canViewProfile) {
    throw createPrivateProfileError();
  }

  const followingIds = await fetchAcceptedFollowingIds(admin, userId).catch(() => []);
  const sourceIds = scope === 'following' ? [...new Set(followingIds)] : [userId];
  const normalizedPageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.floor(Number(pageSize))) : 20;
  const normalizedOffset = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
  const normalizedSubject = normalizeActivitySubjectFilter(subject);
  const normalizedSort = normalizeActivitySort(sort);
  const shouldResolveFullFilteredSet = normalizedSubject !== 'all' || normalizedSort !== 'newest';
  const sourcePageSize = shouldResolveFullFilteredSet ? null : Math.max(normalizedOffset + normalizedPageSize * 2, 24);

  if (sourceIds.length === 0) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const rawActivityItems = (await fetchActivitiesForSources(admin, sourceIds, sourcePageSize)).map((item) => ({
    ...item,
    isFromFollowing: normalizeValue(item?.sourceUserId) !== normalizeValue(userId),
  }));
  const derivedUserActivityItems =
    rawActivityItems.length === 0 && scope === 'user'
      ? (await fetchDerivedUserActivityItems({
          offset: normalizedOffset,
          pageSize: normalizedPageSize,
          userId,
          viewerId,
        })).map((item) => ({
          ...item,
          isFromFollowing: false,
        }))
      : [];
  const items = sortActivityItemsForMode(
    filterActivityItemsBySubject(
      dedupeActivityItems(rawActivityItems.length > 0 ? rawActivityItems : derivedUserActivityItems),
      normalizedSubject
    ),
    normalizedSort
  );

  const paginated = paginateItems(items, cursor, pageSize);

  return {
    ...paginated,
    items: paginated.items.map((item) => projectActivityItem(item, viewerId)),
    totalCount: items.length,
  };
}
