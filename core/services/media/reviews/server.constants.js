import 'server-only';

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
