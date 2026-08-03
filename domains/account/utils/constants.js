// ============================================================
// Account Constants & Select Queries
// ============================================================

export const ACCOUNT_SECTION_KEYS = Object.freeze([
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export const DEFAULT_MEDIA_BUCKET = 'profile-media';
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_BY_TARGET = Object.freeze({
  avatar: 3 * 1024 * 1024,
  banner: MAX_UPLOAD_BYTES,
});

export const MIME_EXTENSION_MAP = Object.freeze({
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));
export const AVIF_BRANDS = new Set(['avif', 'avis']);

export const MEDIA_COLLECTION_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_COLLECTION_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_ITEM_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'position',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const WATCHED_SELECT = [
  'backdrop_path',
  'created_at',
  'entity_id',
  'entity_type',
  'last_watched_at',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
  'watch_count',
].join(',');

export const ACTIVITY_SELECT = [
  'created_at',
  'dedupe_key',
  'event_type',
  'id',
  'payload',
  'updated_at',
  'user_id',
].join(',');

export const ACTIVITY_SUBJECT_FILTERS = new Set(['all', 'list', 'movie']);
export const ACTIVITY_SORT_MODES = new Set(['newest', 'oldest']);
export const FOLLOW_STATUS_ACCEPTED = 'accepted';

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

export const OVERVIEW_ACTIVITY_LIMIT = 36;
export const OVERVIEW_LISTS_LIMIT = 3;
export const OVERVIEW_REVIEW_LIMIT = 3;
export const OVERVIEW_WATCHED_LIMIT = 12;
export const OVERVIEW_WATCHLIST_LIMIT = 12;
export const ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS = 2400;
export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_ROUTE_FEED = Object.freeze({
  hasMore: false,
  items: EMPTY_ARRAY,
  nextCursor: null,
});
