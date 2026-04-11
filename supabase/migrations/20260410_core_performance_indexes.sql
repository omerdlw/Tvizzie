-- Core performance indexes for high-traffic read paths.
-- Safe to run multiple times because every index uses IF NOT EXISTS.

-- Activity/feed paths
create index if not exists idx_activity_user_updated_at
  on public.activity (user_id, updated_at desc);

-- Follows visibility + social proof lookups
create index if not exists idx_follows_follower_status_following
  on public.follows (follower_id, status, following_id);

create index if not exists idx_follows_following_status_follower
  on public.follows (following_id, status, follower_id);

-- Collections: likes / watchlist / watched
create index if not exists idx_likes_user_added_at
  on public.likes (user_id, added_at desc);

create index if not exists idx_likes_media_user
  on public.likes (media_key, user_id);

create index if not exists idx_watchlist_user_added_at
  on public.watchlist (user_id, added_at desc);

create index if not exists idx_watchlist_user_media_key
  on public.watchlist (user_id, media_key);

create index if not exists idx_watched_user_last_watched_at
  on public.watched (user_id, last_watched_at desc);

create index if not exists idx_watched_user_media_key_last_watched_at
  on public.watched (user_id, media_key, last_watched_at desc);

-- Reviews: authored/liked/media/list
create index if not exists idx_media_reviews_user_updated_at
  on public.media_reviews (user_id, updated_at desc);

create index if not exists idx_media_reviews_media_updated_at
  on public.media_reviews (media_key, updated_at desc);

create index if not exists idx_media_reviews_media_user
  on public.media_reviews (media_key, user_id);

create index if not exists idx_list_reviews_user_updated_at
  on public.list_reviews (user_id, updated_at desc);

create index if not exists idx_list_reviews_list_updated_at
  on public.list_reviews (list_id, updated_at desc);

create index if not exists idx_list_reviews_list_user
  on public.list_reviews (list_id, user_id);

create index if not exists idx_review_likes_user_created_at
  on public.review_likes (user_id, created_at desc);

create index if not exists idx_review_likes_media_review_user
  on public.review_likes (media_key, review_user_id, user_id);

-- Lists and list items
create index if not exists idx_lists_user_updated_at
  on public.lists (user_id, updated_at desc);

create index if not exists idx_list_items_user_list_added_at
  on public.list_items (user_id, list_id, added_at desc);

create index if not exists idx_list_likes_user_created_at
  on public.list_likes (user_id, created_at desc);

create index if not exists idx_list_likes_list_user
  on public.list_likes (list_id, user_id);
