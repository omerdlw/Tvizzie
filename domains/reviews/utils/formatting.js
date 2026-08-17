import {
  assertTitleMedia,
  buildMediaItemKey,
} from '@/domains/media/utils/media-key';
import {
  ACTIVITY_SLOT_TYPES,
} from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';
import { normalizeValue } from '@/domains/shell/shared/utils.js';
import { REVIEW_SORT_MODE, REVIEW_SORT_OPTIONS } from './constants.js';

const REVIEW_SORT_MODE_SET = new Set(REVIEW_SORT_OPTIONS.map((opt) => opt.value));

export function isReviewSortMode(value) {
  return REVIEW_SORT_MODE_SET.has(String(value || '').trim());
}

export function parseReviewSortMode(value, fallback = REVIEW_SORT_MODE.NEWEST) {
  const normalized = String(value || '').trim();
  return isReviewSortMode(normalized) ? normalized : fallback;
}

export function getLikesLabel(likesCount) {
  if (!likesCount) return 'No likes yet';
  return likesCount === 1 ? '1 like' : `${likesCount} likes`;
}

function normalizeTimestamp(review = {}) {
  const ts = new Date(review.updatedAt || review.createdAt || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeRatingValue(review = {}) {
  const val = Number(review.rating);
  return Number.isFinite(val) ? val : null;
}

function normalizeLikeCount(review = {}) {
  if (Array.isArray(review.likes)) return review.likes.length;
  const direct = Number(review.likesCount ?? review.payload?.likesCount);
  return Number.isFinite(direct) ? Math.max(0, direct) : 0;
}

function normalizeIdentity(review = {}) {
  return (
    String(review.docPath || '').trim() ||
    String(review.id || '').trim() ||
    String(review.user?.id || '').trim() ||
    String(review.user?.username || '').trim() ||
    'unknown-review'
  );
}

function getReviewTimestamp(review = {}) {
  const timestamp = new Date(review.updatedAt || review.createdAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildReviewMetrics(review = {}) {
  return {
    identity: normalizeIdentity(review),
    likesCount: normalizeLikeCount(review),
    rating: normalizeRatingValue(review),
    timestamp: normalizeTimestamp(review),
  };
}

function compareNullableNumber(a, b, direction = 'desc') {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareByTimestamp(a, b, dir = 'desc') {
  return dir === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
}

function compareByLikes(a, b, dir = 'desc') {
  return dir === 'asc' ? a.likesCount - b.likesCount : b.likesCount - a.likesCount;
}

function compareByRating(a, b, dir = 'desc') {
  return compareNullableNumber(a.rating, b.rating, dir);
}

function compareWithFallbacks(entryA, entryB, primaryComparator) {
  const diff = primaryComparator(entryA.metrics, entryB.metrics);
  if (diff !== 0) return diff;

  const mA = entryA.metrics;
  const mB = entryB.metrics;

  return (
    compareByTimestamp(mA, mB, 'desc') ||
    compareByRating(mA, mB, 'desc') ||
    compareByLikes(mA, mB, 'desc') ||
    mA.identity.localeCompare(mB.identity) ||
    entryA.index - entryB.index
  );
}

export function sortReviewsByMode(reviews = [], mode = REVIEW_SORT_MODE.NEWEST) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const decorated = safeReviews.map((review, index) => ({
    index,
    review,
    metrics: buildReviewMetrics(review),
  }));

  const resolveComparator = () => {
    switch (mode) {
      case REVIEW_SORT_MODE.OLDEST:
        return (a, b) => compareByTimestamp(a, b, 'asc');
      case REVIEW_SORT_MODE.RATING_DESC:
        return (a, b) => compareByRating(a, b, 'desc');
      case REVIEW_SORT_MODE.RATING_ASC:
        return (a, b) => compareByRating(a, b, 'asc');
      case REVIEW_SORT_MODE.LIKES_DESC:
        return (a, b) => compareByLikes(a, b, 'desc');
      case REVIEW_SORT_MODE.LIKES_ASC:
        return (a, b) => compareByLikes(a, b, 'asc');
      case REVIEW_SORT_MODE.NEWEST:
      default:
        return (a, b) => compareByTimestamp(a, b, 'desc');
    }
  };

  const primaryComparator = resolveComparator();
  return decorated
    .sort((a, b) => compareWithFallbacks(a, b, primaryComparator))
    .map((entry) => entry.review);
}

export function sortReviews(reviews = [], currentUserId) {
  return [...reviews].sort((a, b) => {
    const leftIsCurrentUser = Boolean(currentUserId) && a.user?.id === currentUserId;
    const rightIsCurrentUser = Boolean(currentUserId) && b.user?.id === currentUserId;
    if (leftIsCurrentUser !== rightIsCurrentUser) return leftIsCurrentUser ? -1 : 1;

    const likesDifference = normalizeLikeCount(b) - normalizeLikeCount(a);
    if (likesDifference !== 0) return likesDifference;

    return getReviewTimestamp(b) - getReviewTimestamp(a);
  });
}

export function getRatingStats(reviews = []) {
  const rated = reviews.filter((r) => Number.isFinite(Number(r?.rating)));
  if (rated.length === 0) return { average: null, count: 0 };

  const total = rated.reduce((sum, r) => {
    const val = Number(r.rating);
    return sum + (val > 5 ? val / 2 : val);
  }, 0);

  return {
    average: (total / rated.length).toFixed(1),
    count: rated.length,
  };
}

export function mergeReviewUser(review, userProfile) {
  if (!userProfile) return review;
  return {
    ...review,
    user: {
      ...review.user,
      displayName: userProfile.displayName || review.user?.displayName || review.user?.name,
      username: userProfile.username || review.user?.username,
      avatarUrl: userProfile.avatarUrl || review.user?.avatarUrl,
    },
  };
}

export function normalizeRating(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0.5 || parsedValue > 5) {
    throw new Error('Rating must be a number between 0.5 and 5');
  }

  return Math.round(parsedValue * 2) / 2;
}

export function normalizeReviewContent(value) {
  return normalizeValue(value);
}

export function capitalizeLabel(value) {
  const normalizedValue = normalizeReviewContent(value);

  if (!normalizedValue) {
    return '';
  }

  return `${normalizedValue.charAt(0).toUpperCase()}${normalizedValue.slice(1)}`;
}

export function unwrapReviewWriteResult(payload = {}) {
  if (payload?.result && typeof payload.result === 'object') {
    return payload.result;
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  return {};
}

export function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

export function buildMediaSubjectMetadata(media = {}) {
  const mediaSnapshot = assertTitleMedia(media, 'Only movie and TV reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);

  return {
    subjectHref: `/${mediaSnapshot.entityType}/${mediaSnapshot.entityId}`,
    subjectId: mediaSnapshot.entityId,
    subjectKey: mediaKey,
    subjectPoster: media.posterPath || media.poster_path || null,
    subjectTitle: media.title || media.name || 'Untitled',
    subjectType: mediaSnapshot.entityType,
  };
}

export function buildListSubjectMetadata({ list = null, listId, ownerId, ownerUsername = null }) {
  const resolvedSlug = list?.slug || listId;
  const resolvedOwnerId = ownerId || list?.ownerId || list?.ownerSnapshot?.id;
  const resolvedOwnerUsername = ownerUsername || list?.ownerSnapshot?.username || resolvedOwnerId;
  const previewItems =
    Array.isArray(list?.previewItems) && list.previewItems.length > 0
      ? list.previewItems.filter(Boolean)
      : Array.isArray(list?.items) && list.items.length > 0
        ? list.items.slice(0, 5).filter(Boolean)
        : [];
  const poster =
    list?.coverUrl ||
    list?.poster_path ||
    list?.posterPath ||
    previewItems[0]?.poster_path_full ||
    previewItems[0]?.poster_path ||
    previewItems[0]?.posterPath ||
    null;

  return {
    subjectHref: `/account/${resolvedOwnerUsername}/lists/${resolvedSlug}`,
    subjectId: listId || list?.id,
    subjectKey: createListReviewLikeKey(resolvedOwnerId, listId || list?.id),
    subjectOwnerId: resolvedOwnerId,
    subjectOwnerUsername: resolvedOwnerUsername,
    subjectPreviewItems: previewItems,
    subjectPoster: poster,
    subjectSlug: resolvedSlug,
    subjectTitle: list?.title || 'Untitled List',
    subjectType: 'list',
  };
}

export function buildMediaOpinionDedupeKey(userId, subjectMetadata = {}) {
  return buildCanonicalActivityDedupeKey({
    actorUserId: userId,
    primaryRef: buildActivitySubjectRef({
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    slotType: ACTIVITY_SLOT_TYPES.MEDIA_OPINION,
  });
}

export function buildListOpinionDedupeKey(userId, subjectMetadata = {}) {
  return buildCanonicalActivityDedupeKey({
    actorUserId: userId,
    primaryRef: buildActivitySubjectRef({
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    slotType: ACTIVITY_SLOT_TYPES.LIST_OPINION,
  });
}

export function buildReviewCardPayload({
  content,
  isSpoiler = false,
  rating = null,
  subjectMetadata = {},
  user,
}) {
  return {
    content,
    reviewContent: content,
    reviewIsSpoiler: Boolean(isSpoiler),
    reviewRating: rating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectOwnerId: subjectMetadata.subjectOwnerId || null,
    subjectOwnerUsername: subjectMetadata.subjectOwnerUsername || null,
    subjectPoster: subjectMetadata.subjectPoster || null,
    subjectPreviewItems: Array.isArray(subjectMetadata.subjectPreviewItems)
      ? subjectMetadata.subjectPreviewItems
      : [],
    subjectSlug: subjectMetadata.subjectSlug || null,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
    user: {
      avatarUrl: user.avatarUrl || user.photoURL || null,
      id: user.id,
      name: user.displayName || user.name || user.email || 'Anonymous User',
      username: user.username || null,
    },
  };
}

export function buildReviewLikeActivityPayload(review = {}) {
  const subjectType = review.subjectType;
  const subjectId = review.subjectId;
  const reviewUserId = review.reviewUserId || review?.user?.id;
  const reviewKey = review.subjectKey || review.mediaKey || null;

  if (!subjectType || !subjectId || !reviewUserId || !reviewKey) {
    return null;
  }

  return {
    reviewKey,
    reviewOwnerDisplayName: review?.user?.name || 'Anonymous User',
    reviewOwnerId: reviewUserId,
    reviewOwnerUsername: review?.user?.username || null,
    reviewRating: review.rating ?? null,
    subjectHref: review.subjectHref || null,
    subjectId,
    subjectOwnerId: review.subjectOwnerId || null,
    subjectOwnerUsername: review.subjectOwnerUsername || null,
    subjectPoster: review.subjectPoster || null,
    subjectSlug: review.subjectSlug || null,
    subjectTitle: review.subjectTitle || 'Untitled',
    subjectType,
  };
}
