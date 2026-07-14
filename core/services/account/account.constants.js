import 'server-only';

export const ACCOUNT_READ_FUNCTION = 'account-read';
export const ACCOUNT_WRITE_FUNCTION = 'account-write';

export const EMPTY_EDITABLE_ACCOUNT_COUNTS = Object.freeze({
  followers: 0,
  following: 0,
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});

export const ACCOUNT_PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

export const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');

export const PROFILE_COUNTERS_TIMEOUT_MS = 1200;
export const FOLLOW_COUNTS_TIMEOUT_MS = 1200;
export const FOLLOW_STATUS_ACCEPTED = 'accepted';
