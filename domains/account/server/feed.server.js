import 'server-only';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  ACTIVITY_EVENT_TYPES,
} from '@/domains/social/client/activity';
import {
  ACTIVITY_EVENT_TYPE_SET,
} from '@/domains/social/utils/constants';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
  getAccountProfileByUserId,
} from './profile.server';
import { getAccountResource } from './collections.server';
import { fetchProfileReviewFeedServer } from '@/domains/reviews/server/feeds.server';
import {
  ACTIVITY_SELECT,
  ACTIVITY_SORT_MODES,
  ACTIVITY_SUBJECT_FILTERS,
  FOLLOW_STATUS_ACCEPTED,
} from '@/domains/account/utils/constants';
import {
  normalizeMediaType,
} from '@/domains/media/utils/media-key';
import { chunkArray, normalizeTimestamp, normalizeValue } from '@/domains/shell/shared/utils';

const ACTIVITY_QUERY_MINIMUM_WINDOW = 50;
const ACTIVITY_QUERY_WINDOW_MULTIPLIER = 3;

// ============================================================
// Feed Normalizers
// ============================================================

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
  if (!value || typeof value !== 'object') return null;
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
  if (Number(payload.version) !== 2) return null;

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
  if (!item || !ACTIVITY_EVENT_TYPE_SET.has(item.eventType)) return false;
  const subjectType = String(item.subject?.type || '').toLowerCase();
  return !subjectType || subjectType === 'movie' || subjectType === 'tv' || subjectType === 'list';
}

function getActivityTimestamp(item = {}) {
  const timestamp = item?.occurredAt || item?.updatedAt || item?.createdAt;
  const parsed = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortActivityItems(items = []) {
  return [...items].sort((left, right) => {
    const timestampDiff = getActivityTimestamp(right) - getActivityTimestamp(left);
    if (timestampDiff !== 0) return timestampDiff;
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
  if (normalizedSubject === 'all') return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeMediaType(item?.subject?.type) === normalizedSubject,
  );
}

function sortActivityItemsForMode(items = [], sort = 'newest') {
  const normalizedItems = sortActivityItems(items);
  if (normalizeActivitySort(sort) === 'oldest') return [...normalizedItems].reverse();
  return normalizedItems;
}

function getActivityDeduplicationKey(item = {}) {
  const eventType = normalizeValue(item?.eventType).toUpperCase();
  const actorId = normalizeValue(item?.sourceUserId || item?.actor?.id);
  const subjectId = normalizeValue(item?.subject?.id);
  const subjectType = normalizeMediaType(item?.subject?.type);

  // Persisted activity uses canonical slot keys, while legacy fallbacks use
  // derived keys. They still describe the same user action, so reconcile them
  // by their stable event/actor/subject identity before falling back to a row
  // identifier for events without a complete subject.
  if (eventType && actorId && subjectType && subjectId) {
    return `activity:${eventType}:${actorId}:${subjectType}:${subjectId}`;
  }

  return normalizeValue(item?.dedupeKey) || normalizeValue(item?.id);
}

function dedupeActivityItems(items = []) {
  const seenKeys = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = getActivityDeduplicationKey(item);
    if (!key || seenKeys.has(key)) return false;
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

// ============================================================
// Feed Projector & Item Line Builder
// ============================================================

function buildAccountHref({ id = null, username = null } = {}) {
  const normalizedUsername = normalizeValue(username);
  const normalizedId = normalizeValue(id);
  if (normalizedUsername) return `/account/${normalizedUsername}`;
  if (normalizedId) return `/account/${normalizedId}`;
  return null;
}

function createTextPart(text) {
  return { kind: 'text', text };
}

function createRatingPart(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return { kind: 'rating', rating: numericValue };
}

function createLinkPart(kind, text, href = null) {
  return { href: href || null, kind, text };
}

function getPossessiveSuffix(label) {
  return normalizeValue(label).toLowerCase().endsWith('s') ? "' " : "'s ";
}

function createActorPart(actor = {}, viewerId = null) {
  const isViewerActor =
    normalizeValue(actor.id) && normalizeValue(actor.id) === normalizeValue(viewerId);
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
  const isViewerActor =
    normalizeValue(item?.actor?.id) && normalizeValue(item.actor.id) === normalizeValue(viewerId);
  const isOwnList =
    normalizeValue(item?.subject?.ownerId) &&
    normalizeValue(item.subject.ownerId) === normalizeValue(item?.actor?.id);

  if (isOwnList) {
    return [
      createTextPart(isViewerActor ? 'your own ' : 'their own '),
      createSubjectPart(item.subject),
      createTextPart(' list'),
    ];
  }
  const ownerLabel = item?.subject?.ownerUsername || 'someone';
  return [
    createTextPart(`${ownerLabel}${getPossessiveSuffix(ownerLabel)}`),
    createSubjectPart(item.subject),
    createTextPart(' list'),
  ];
}

function projectActivityLine(item = {}, viewerId = null) {
  const actorPart = createActorPart(item.actor, viewerId);
  const subjectPart = createSubjectPart(item.subject);
  const ratingPart = createRatingPart(item?.details?.rating);

  switch (item.eventType) {
    case ACTIVITY_EVENT_TYPES.WATCHLIST_ADDED:
      return {
        parts: [
          actorPart,
          createTextPart(' added '),
          subjectPart,
          createTextPart(actorPart.text === 'You' ? ' to your watchlist' : ' to their watchlist'),
        ],
      };
    case ACTIVITY_EVENT_TYPES.LIKED_ADDED:
      return { parts: [actorPart, createTextPart(' liked '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.WATCHED_ADDED:
      return { parts: [actorPart, createTextPart(' watched '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.RATING_LOGGED:
      return {
        parts: [
          actorPart,
          createTextPart(' rated '),
          subjectPart,
          ...(ratingPart ? [createTextPart(' '), ratingPart] : []),
        ],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED:
      return { parts: [actorPart, createTextPart(' reviewed '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.LIST_CREATED:
      return { parts: [actorPart, createTextPart(' created a list: '), subjectPart] };
    case ACTIVITY_EVENT_TYPES.LIST_COMMENTED:
      return {
        parts: [
          actorPart,
          createTextPart(' commented on '),
          ...buildListReferenceParts(item, viewerId),
        ],
      };
    case ACTIVITY_EVENT_TYPES.LIST_LIKED:
      return {
        parts: [actorPart, createTextPart(' liked '), ...buildListReferenceParts(item, viewerId)],
      };
    case ACTIVITY_EVENT_TYPES.REVIEW_LIKED: {
      const reviewOwnerLabel =
        item?.details?.reviewOwnerDisplayName || item?.details?.reviewOwnerUsername || 'Someone';
      const reviewOwnerHref = buildAccountHref({
        id: item?.details?.reviewOwnerId,
        username: item?.details?.reviewOwnerUsername,
      });
      const likedReviewRatingPart =
        normalizeMediaType(item?.subject?.type) === 'movie'
          ? createRatingPart(item?.details?.reviewRating)
          : null;
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
      return { parts: [actorPart, createTextPart(' updated '), subjectPart] };
  }
}

function projectActivityItem(item = {}, viewerId = null) {
  const line = projectActivityLine(item, viewerId);
  return {
    ...item,
    line,
    renderKind:
      item.renderKind === 'text_with_review' && item.reviewCard ? 'text_with_review' : 'text',
    reviewCard: item.renderKind === 'text_with_review' ? item.reviewCard : null,
  };
}

// ============================================================
// Derived Feed Generators & Readers
// ============================================================

export async function fetchDerivedUserActivityItems({
  offset = 0,
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  const normalizedOffset = Number.isFinite(Number(offset))
    ? Math.max(0, Math.floor(Number(offset)))
    : 0;
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.floor(Number(pageSize)))
    : 20;
  const fetchLimit = Math.min(50, Math.max(normalizedOffset + normalizedPageSize * 2, 8));

  const [profile, likes, watchlist, watched, lists, likedLists, reviewFeed] = await Promise.all([
    getAccountProfileByUserId(userId, { viewerId }).catch(() => null),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'likes',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'watchlist',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'watched',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
      limitCount: fetchLimit,
      resource: 'lists',
      strict: false,
      userId,
      viewerId,
    }).catch(() => []),
    getAccountResource({
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

  const actor = normalizeActor({
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || profile?.username || 'Someone',
    id: profile?.id || userId || null,
    username: profile?.username || null,
  });
  const derivedItems = [];

  (reviewFeed?.items || []).forEach((review) => {
    const timestamp = normalizeTimestamp(review.createdAt || review.updatedAt || review.created_at);
    const mediaKey = String(
      review.mediaKey || review.subjectKey || review.docPath || '',
    ).toLowerCase();
    const inferredType = mediaKey.startsWith('tv_')
      ? 'tv'
      : mediaKey.startsWith('list:')
        ? 'list'
        : 'movie';
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:review:${review.id || review.docPath}`,
      details: { rating: review.rating ?? null },
      eventType: ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED,
      id: `derived-review-${review.id || review.docPath}`,
      occurredAt: timestamp,
      renderKind: 'text_with_review',
      reviewCard: normalizeReviewCard({
        ...review,
        authorId: userId,
        reviewUserId: userId,
        user: { avatarUrl: actor.avatarUrl, name: actor.displayName, username: actor.username },
      }),
      sourceUserId: userId,
      subject: normalizeSubject({
        id: review.subjectId || review.mediaId || review.id,
        poster: review.subjectPoster || review.posterPath || review.poster_path,
        title: review.subjectTitle || review.title || review.name,
        type: review.subjectType || review.mediaType || inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(watched) ? watched : []).forEach((item) => {
    const timestamp = normalizeTimestamp(
      item.addedAt || item.added_at || item.created_at || item.updated_at,
    );
    const mediaKey = String(item.mediaKey || item.media_key || item.id || '').toLowerCase();
    const inferredType =
      item.entityType ||
      item.entity_type ||
      item.media_type ||
      (mediaKey.startsWith('tv_') ? 'tv' : 'movie');
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:watched:${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      details: {},
      eventType: ACTIVITY_EVENT_TYPES.WATCHED_ADDED,
      id: `derived-watched-${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: item.entityId || item.entity_id || item.id,
        poster: item.poster_path || item.posterPath,
        title: item.title || item.name,
        type: inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(lists) ? lists : []).forEach((list) => {
    const timestamp = normalizeTimestamp(list.createdAt || list.updated_at || list.created_at);
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:list:${list.id || list.slug}`,
      details: { itemCount: list.itemCount || 0 },
      eventType: ACTIVITY_EVENT_TYPES.LIST_CREATED,
      id: `derived-list-${list.id || list.slug}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: list.id,
        poster: list.coverPosterPath || list.posterPath || list.poster_path,
        slug: list.slug,
        title: list.title || list.name,
        type: 'list',
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  (Array.isArray(likes) ? likes : []).forEach((item) => {
    const timestamp = normalizeTimestamp(item.addedAt || item.added_at || item.created_at);
    const mediaKey = String(item.mediaKey || item.media_key || item.id || '').toLowerCase();
    const inferredType =
      item.entityType ||
      item.entity_type ||
      item.media_type ||
      (mediaKey.startsWith('tv_') ? 'tv' : 'movie');
    derivedItems.push({
      actor,
      createdAt: timestamp,
      dedupeKey: `derived:like:${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      details: {},
      eventType: ACTIVITY_EVENT_TYPES.LIKED_ADDED,
      id: `derived-like-${item.mediaKey || item.media_key || item.entityId || item.entity_id || item.id}`,
      occurredAt: timestamp,
      renderKind: 'text',
      reviewCard: null,
      sourceUserId: userId,
      subject: normalizeSubject({
        id: item.entityId || item.entity_id || item.id,
        poster: item.poster_path || item.posterPath,
        title: item.title || item.name,
        type: inferredType,
      }),
      updatedAt: timestamp,
      version: 2,
      visibility: 'public',
    });
  });

  return derivedItems.filter(isVisibleActivityItem);
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
  if (!userId) return { hasMore: false, items: [], nextCursor: null };

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });
  if (!canViewProfile) throw createPrivateProfileError();

  let followingIds = [];
  if (scope === 'following') {
    const followingResult = await admin
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', FOLLOW_STATUS_ACCEPTED);
    if (followingResult.error) {
      throw new Error(followingResult.error.message || 'Following accounts could not be loaded');
    }
    followingIds = (followingResult.data || []).map((i) => i.following_id).filter(Boolean);
  }
  const sourceIds = scope === 'following' ? [...new Set(followingIds)] : [userId];

  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.floor(Number(pageSize)))
    : 20;
  const normalizedOffset = Number.isFinite(Number(cursor))
    ? Math.max(0, Math.floor(Number(cursor)))
    : 0;
  const normalizedSubject = normalizeActivitySubjectFilter(subject);
  const normalizedSort = normalizeActivitySort(sort);
  const queryWindowSize = Math.max(
    ACTIVITY_QUERY_MINIMUM_WINDOW,
    normalizedOffset + normalizedPageSize * ACTIVITY_QUERY_WINDOW_MULTIPLIER,
  );

  if (sourceIds.length === 0) return { hasMore: false, items: [], nextCursor: null };

  const groups = await Promise.all(
    chunkArray(sourceIds, 100).map(async (idChunk) => {
      const res = await admin
        .from('activity')
        .select(ACTIVITY_SELECT)
        .in('event_type', [...ACTIVITY_EVENT_TYPE_SET])
        .in('user_id', idChunk)
        .order('updated_at', { ascending: normalizedSort === 'oldest' })
        .range(0, queryWindowSize);
      if (res.error) throw new Error(res.error.message || 'Activity feed could not be loaded');
      const rows = res.data || [];
      const hasMore = rows.length > queryWindowSize;
      const windowRows = hasMore ? rows.slice(0, queryWindowSize) : rows;
      const items = windowRows.map(normalizeActivityRow).filter(isVisibleActivityItem);
      return {
        hasMore,
        items,
        totalCount: items.length,
      };
    }),
  );

  const rawActivityItems = sortActivityItemsForMode(
    groups.flatMap((group) => group.items),
    normalizedSort,
  ).map((item) => ({
    ...item,
    isFromFollowing: normalizeValue(item?.sourceUserId) !== normalizeValue(userId),
  }));
  const hasMoreSourceItems = groups.some((group) => group.hasMore);

  // Activity is now persisted for every supported event. The derived readers
  // remain as a compatibility fallback for legacy users, but they fan out to
  // all collections and reviews and can be much slower than the activity
  // query itself. Only pay that cost when the persisted feed cannot fill the
  // requested page after subject filtering and the persisted source is
  // exhausted.
  const rawFilteredItemCount = filterActivityItemsBySubject(
    dedupeActivityItems(rawActivityItems),
    normalizedSubject,
  ).length;
  const minimumItemsNeeded = normalizedOffset + normalizedPageSize;
  const shouldLoadDerivedUserActivity =
    scope === 'user' && !hasMoreSourceItems && rawFilteredItemCount < minimumItemsNeeded;

  const derivedUserActivityItems = shouldLoadDerivedUserActivity
    ? (
        await fetchDerivedUserActivityItems({
          offset: normalizedOffset,
          pageSize: normalizedPageSize,
          userId,
          viewerId,
        })
      ).map((item) => ({ ...item, isFromFollowing: false }))
    : [];

  const combinedItems = dedupeActivityItems([...rawActivityItems, ...derivedUserActivityItems]);

  const items = sortActivityItemsForMode(
    filterActivityItemsBySubject(combinedItems, normalizedSubject),
    normalizedSort,
  );

  const paginated = paginateItems(items, cursor, pageSize);
  const hasMore = paginated.hasMore || (paginated.items.length > 0 && hasMoreSourceItems);
  const nextCursor = hasMore ? normalizedOffset + paginated.items.length : null;
  return {
    ...paginated,
    hasMore,
    items: paginated.items.map((item) => projectActivityItem(item, viewerId)),
    nextCursor,
    totalCount: Math.max(
      items.length,
      groups.reduce((total, group) => total + group.totalCount, 0),
    ),
  };
}
