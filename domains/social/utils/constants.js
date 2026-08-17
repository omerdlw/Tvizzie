export const FOLLOW_SELECT = [
  'created_at',
  'follower_avatar_url',
  'follower_display_name',
  'follower_id',
  'follower_username',
  'following_avatar_url',
  'following_display_name',
  'following_id',
  'following_username',
  'responded_at',
  'status',
  'updated_at',
].join(',');

export const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

export const ACTIVITY_EVENT_TYPES = Object.freeze({
  WATCHLIST_ADDED: 'WATCHLIST_ADDED',
  REVIEW_LIKED: 'REVIEW_LIKED',
  RATING_LOGGED: 'RATING_LOGGED',
  REVIEW_PUBLISHED: 'REVIEW_PUBLISHED',
  LIST_CREATED: 'LIST_CREATED',
  LIST_COMMENTED: 'LIST_COMMENTED',
  LIST_LIKED: 'LIST_LIKED',
  WATCHED_ADDED: 'WATCHED_ADDED',
  LIKED_ADDED: 'LIKED_ADDED',
});

export const ACTIVITY_EVENT_TYPE_SET = new Set(Object.values(ACTIVITY_EVENT_TYPES));

export const ACTIVITY_SLOT_TYPES = Object.freeze({
  WATCHLIST_ENTRY: 'WATCHLIST_ENTRY',
  REVIEW_LIKE: 'REVIEW_LIKE',
  MEDIA_OPINION: 'MEDIA_OPINION',
  LIST_CREATED: 'LIST_CREATED',
  LIST_LIKE: 'LIST_LIKE',
  LIST_OPINION: 'LIST_OPINION',
  WATCHED_ENTRY: 'WATCHED_ENTRY',
  LIKED_ENTRY: 'LIKED_ENTRY',
});

export const ACTOR_PROFILE_SELECT = [
  'avatar_url',
  'display_name',
  'email',
  'is_private',
  'username',
].join(',');

export const NOTIFICATION_TYPES = Object.freeze({
  FOLLOW_REQUEST: 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED: 'FOLLOW_ACCEPTED',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  REVIEW_LIKE: 'REVIEW_LIKE',
  LIST_LIKE: 'LIST_LIKE',
  LIST_COMMENT: 'LIST_COMMENT',
});

export const NOTIFICATION_TYPE_SET = new Set(Object.values(NOTIFICATION_TYPES));

export const NOTIFICATION_EVENT_TYPES = Object.freeze({
  FOLLOW_CREATED: 'FOLLOW_CREATED',
  FOLLOW_ACCEPTED: 'FOLLOW_ACCEPTED',
  REVIEW_LIKED: 'REVIEW_LIKED',
  LIST_LIKED: 'LIST_LIKED',
  LIST_COMMENTED: 'LIST_COMMENTED',
});

export const NOTIFICATION_EVENT_TYPE_SET = new Set(Object.values(NOTIFICATION_EVENT_TYPES));
