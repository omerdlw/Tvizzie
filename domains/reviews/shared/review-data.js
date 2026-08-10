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
