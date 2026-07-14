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
