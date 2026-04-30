export function getLikesLabel(likesCount) {
  if (likesCount === 0) return 'No likes yet';
  if (likesCount === 1) return '1 like';
  return `${likesCount} likes`;
}

export const REVIEW_SORT_MODE = Object.freeze({
  NEWEST: 'newest',
  OLDEST: 'oldest',
  RATING_DESC: 'rating_desc',
  RATING_ASC: 'rating_asc',
  LIKES_DESC: 'likes_desc',
  LIKES_ASC: 'likes_asc',
});

export const REVIEW_SORT_OPTIONS = Object.freeze([
  { value: REVIEW_SORT_MODE.NEWEST, label: 'Newest to oldest' },
  { value: REVIEW_SORT_MODE.OLDEST, label: 'Oldest to newest' },
  { value: REVIEW_SORT_MODE.RATING_DESC, label: 'Highest rating to lowest rating' },
  { value: REVIEW_SORT_MODE.RATING_ASC, label: 'Lowest rating to highest rating' },
  { value: REVIEW_SORT_MODE.LIKES_DESC, label: 'Most liked to least liked' },
  { value: REVIEW_SORT_MODE.LIKES_ASC, label: 'Least liked to most liked' },
]);

const REVIEW_SORT_MODE_SET = new Set(REVIEW_SORT_OPTIONS.map((option) => option.value));

export function isReviewSortMode(value) {
  return REVIEW_SORT_MODE_SET.has(String(value || '').trim());
}

export function parseReviewSortMode(value, fallback = REVIEW_SORT_MODE.NEWEST) {
  const normalizedValue = String(value || '').trim();
  return isReviewSortMode(normalizedValue) ? normalizedValue : fallback;
}

export function hasReviewText(review = {}) {
  return Boolean(String(review?.content || '').trim());
}

function normalizeTimestamp(review = {}) {
  const timestampValue = review.updatedAt || review.createdAt || 0;
  const timestamp = new Date(timestampValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeRatingValue(review = {}) {
  const value = Number(review.rating);
  return Number.isFinite(value) ? value : null;
}

function normalizeLikeCount(review = {}) {
  if (Array.isArray(review.likes)) {
    return review.likes.length;
  }

  const directLikesCount = Number(review.likesCount);
  if (Number.isFinite(directLikesCount)) {
    return Math.max(0, directLikesCount);
  }

  const payloadLikesCount = Number(review?.payload?.likesCount);
  if (Number.isFinite(payloadLikesCount)) {
    return Math.max(0, payloadLikesCount);
  }

  return 0;
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

function compareNullableNumber(firstValue, secondValue, direction = 'desc') {
  const firstIsNull = firstValue === null;
  const secondIsNull = secondValue === null;

  if (firstIsNull && secondIsNull) return 0;
  if (firstIsNull) return 1;
  if (secondIsNull) return -1;

  return direction === 'asc' ? firstValue - secondValue : secondValue - firstValue;
}

function compareByTimestamp(firstMetrics, secondMetrics, direction = 'desc') {
  return direction === 'asc'
    ? firstMetrics.timestamp - secondMetrics.timestamp
    : secondMetrics.timestamp - firstMetrics.timestamp;
}

function compareByLikes(firstMetrics, secondMetrics, direction = 'desc') {
  return direction === 'asc'
    ? firstMetrics.likesCount - secondMetrics.likesCount
    : secondMetrics.likesCount - firstMetrics.likesCount;
}

function compareByRating(firstMetrics, secondMetrics, direction = 'desc') {
  return compareNullableNumber(firstMetrics.rating, secondMetrics.rating, direction);
}

function compareByIdentity(firstMetrics, secondMetrics) {
  return firstMetrics.identity.localeCompare(secondMetrics.identity);
}

function buildReviewMetrics(review = {}) {
  return {
    identity: normalizeIdentity(review),
    likesCount: normalizeLikeCount(review),
    rating: normalizeRatingValue(review),
    timestamp: normalizeTimestamp(review),
  };
}

function compareWithFallbacks(firstEntry, secondEntry, primaryComparator) {
  const primaryDiff = primaryComparator(firstEntry.metrics, secondEntry.metrics);
  if (primaryDiff !== 0) return primaryDiff;

  const fallbackComparators = [
    (firstMetrics, secondMetrics) => compareByTimestamp(firstMetrics, secondMetrics, 'desc'),
    (firstMetrics, secondMetrics) => compareByRating(firstMetrics, secondMetrics, 'desc'),
    (firstMetrics, secondMetrics) => compareByLikes(firstMetrics, secondMetrics, 'desc'),
    (firstMetrics, secondMetrics) => compareByIdentity(firstMetrics, secondMetrics),
  ];

  for (const comparator of fallbackComparators) {
    const diff = comparator(firstEntry.metrics, secondEntry.metrics);
    if (diff !== 0) return diff;
  }

  return firstEntry.index - secondEntry.index;
}

export function sortReviewsByMode(reviews = [], mode = REVIEW_SORT_MODE.NEWEST) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const decorated = safeReviews.map((review, index) => ({
    index,
    review,
    metrics: buildReviewMetrics(review),
  }));

  const resolvePrimaryComparator = () => {
    switch (mode) {
      case REVIEW_SORT_MODE.OLDEST:
        return (firstMetrics, secondMetrics) => compareByTimestamp(firstMetrics, secondMetrics, 'asc');
      case REVIEW_SORT_MODE.RATING_DESC:
        return (firstMetrics, secondMetrics) => compareByRating(firstMetrics, secondMetrics, 'desc');
      case REVIEW_SORT_MODE.RATING_ASC:
        return (firstMetrics, secondMetrics) => compareByRating(firstMetrics, secondMetrics, 'asc');
      case REVIEW_SORT_MODE.LIKES_DESC:
        return (firstMetrics, secondMetrics) => compareByLikes(firstMetrics, secondMetrics, 'desc');
      case REVIEW_SORT_MODE.LIKES_ASC:
        return (firstMetrics, secondMetrics) => compareByLikes(firstMetrics, secondMetrics, 'asc');
      case REVIEW_SORT_MODE.NEWEST:
      default:
        return (firstMetrics, secondMetrics) => compareByTimestamp(firstMetrics, secondMetrics, 'desc');
    }
  };

  const primaryComparator = resolvePrimaryComparator();

  return decorated
    .sort((firstEntry, secondEntry) => compareWithFallbacks(firstEntry, secondEntry, primaryComparator))
    .map((entry) => entry.review);
}

export function getRatingStats(reviews) {
  const ratedReviews = reviews.filter((review) => Number.isFinite(review.rating));

  if (ratedReviews.length === 0) {
    return { average: null, count: 0 };
  }

  const total = ratedReviews.reduce((sum, review) => {
    const value = Number(review.rating);
    return sum + (value > 5 ? value / 2 : value);
  }, 0);

  return {
    average: (total / ratedReviews.length).toFixed(1),
    count: ratedReviews.length,
  };
}

export function sortReviews(reviews, currentUserId) {
  return [...reviews].sort((first, second) => {
    if (first.user?.id === currentUserId) return -1;
    if (second.user?.id === currentUserId) return 1;

    const firstLikes = first.likes?.length || 0;
    const secondLikes = second.likes?.length || 0;

    if (firstLikes !== secondLikes) {
      return secondLikes - firstLikes;
    }

    const firstTime = new Date(first.updatedAt || first.createdAt || 0).getTime();
    const secondTime = new Date(second.updatedAt || second.createdAt || 0).getTime();

    return secondTime - firstTime;
  });
}

export function mergeReviewUser(review, userProfile) {
  if (!userProfile) {
    return review;
  }

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
