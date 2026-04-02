-- Reduce read amplification on hot application paths.

create index if not exists auth_audit_logs_user_idx
  on public.auth_audit_logs(user_id);

create index if not exists list_items_user_list_added_idx
  on public.list_items(user_id, list_id, added_at desc);

create index if not exists media_reviews_user_media_idx
  on public.media_reviews(user_id, media_key);

create index if not exists list_reviews_user_list_idx
  on public.list_reviews(user_id, list_id);

create index if not exists review_likes_review_user_media_idx
  on public.review_likes(review_user_id, media_key);

create index if not exists notifications_actor_user_created_idx
  on public.notifications(actor_user_id, created_at desc);
