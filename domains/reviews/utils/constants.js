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

export const REVIEW_MIN_LENGTH = 10;
export const REVIEW_MAX_LENGTH = 800;
export const REVIEW_LIMIT = 120;
export const REVIEW_LIVE_EVENT_TYPE = 'reviews';

export const PROFILE_REVIEW_FEED_MODE = Object.freeze({
  AUTHORED: 'authored',
  LIKED: 'liked',
});

export function normalizeProfileReviewFeedMode(value) {
  return value === PROFILE_REVIEW_FEED_MODE.LIKED
    ? PROFILE_REVIEW_FEED_MODE.LIKED
    : PROFILE_REVIEW_FEED_MODE.AUTHORED;
}

export const LIST_CONTEXT_SELECT = [
  'id',
  'payload',
  'poster_path',
  'slug',
  'title',
  'user_id',
].join(',');

export const ACCOUNT_REVIEWS_FEED_FUNCTION = 'account-reviews-feed';

export const MEDIA_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'media_key',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');

export const LIST_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'list_id',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');

export const REVIEW_LIKE_SELECT = ['created_at', 'media_key', 'review_user_id'].join(',');
