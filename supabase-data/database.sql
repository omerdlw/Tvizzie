-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  dedupe_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT activity_pkey PRIMARY KEY (id),
  CONSTRAINT activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.auth_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  event_type text NOT NULL,
  status text NOT NULL,
  user_id uuid,
  user_id_hash text,
  email_hash text,
  email_masked text,
  ip_hash text,
  provider text,
  metadata jsonb,
  request_context jsonb,
  CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.auth_challenges (
  challenge_key text NOT NULL,
  purpose text NOT NULL,
  user_id uuid,
  email_hash text NOT NULL,
  code_hash text NOT NULL,
  salt text NOT NULL,
  jti text NOT NULL,
  dummy boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'used'::text, 'expired'::text, 'exhausted'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL,
  resend_available_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  password_reset_completed_at timestamp with time zone,
  device_hash text,
  ip_hash text,
  signup_completed_at timestamp with time zone,
  CONSTRAINT auth_challenges_pkey PRIMARY KEY (challenge_key),
  CONSTRAINT auth_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.auth_rate_limit_windows (
  key_hash text NOT NULL,
  namespace text NOT NULL,
  bucket_key text NOT NULL,
  dimension text NOT NULL,
  value_hash text NOT NULL,
  entries ARRAY NOT NULL DEFAULT '{}'::bigint[],
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT auth_rate_limit_windows_pkey PRIMARY KEY (key_hash)
);
CREATE TABLE public.auth_revocation_state (
  user_id uuid NOT NULL,
  revoke_before timestamp with time zone NOT NULL,
  exempt_session_jti text,
  reason text,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT auth_revocation_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT auth_revocation_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  added_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT favorites_pkey PRIMARY KEY (user_id, media_key),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'accepted'::text CHECK (status = ANY (ARRAY['accepted'::text, 'pending'::text, 'rejected'::text])),
  follower_display_name text,
  follower_username text,
  follower_avatar_url text,
  following_display_name text,
  following_username text,
  following_avatar_url text,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.likes (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  added_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT likes_pkey PRIMARY KEY (user_id, media_key),
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.list_items (
  list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  position integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  added_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT list_items_pkey PRIMARY KEY (list_id, media_key),
  CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id),
  CONSTRAINT list_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.list_likes (
  list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT list_likes_pkey PRIMARY KEY (list_id, user_id),
  CONSTRAINT list_likes_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id),
  CONSTRAINT list_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.list_reviews (
  list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  rating numeric CHECK (rating IS NULL OR rating >= 0.5 AND rating <= 5.0),
  is_spoiler boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT list_reviews_pkey PRIMARY KEY (list_id, user_id),
  CONSTRAINT list_reviews_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id),
  CONSTRAINT list_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  poster_path text,
  backdrop_path text,
  is_ranked boolean NOT NULL DEFAULT false,
  is_private boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT lists_pkey PRIMARY KEY (id),
  CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.media_reviews (
  media_key text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  rating numeric CHECK (rating IS NULL OR rating >= 0.5 AND rating <= 5.0),
  is_spoiler boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT media_reviews_pkey PRIMARY KEY (media_key, user_id),
  CONSTRAINT media_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_user_id uuid,
  event_type text NOT NULL,
  title text,
  body text,
  href text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_counters (
  user_id uuid NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  lists_count integer NOT NULL DEFAULT 0,
  watched_count integer NOT NULL DEFAULT 0,
  watchlist_count integer NOT NULL DEFAULT 0,
  follower_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profile_counters_pkey PRIMARY KEY (user_id),
  CONSTRAINT profile_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  username_lower text UNIQUE,
  display_name text NOT NULL DEFAULT 'Anonymous User'::text,
  display_name_lower text NOT NULL DEFAULT 'anonymous user'::text,
  email text,
  avatar_url text,
  banner_url text,
  description text NOT NULL DEFAULT ''::text,
  is_private boolean NOT NULL DEFAULT false,
  watched_count integer NOT NULL DEFAULT 0,
  favorite_showcase jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.review_likes (
  media_key text NOT NULL,
  review_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT review_likes_pkey PRIMARY KEY (media_key, review_user_id, user_id),
  CONSTRAINT review_likes_review_user_id_fkey FOREIGN KEY (review_user_id) REFERENCES public.profiles(id),
  CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.usernames (
  username text NOT NULL,
  username_lower text NOT NULL UNIQUE,
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT usernames_pkey PRIMARY KEY (username),
  CONSTRAINT usernames_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.watched (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  watch_count integer NOT NULL DEFAULT 1,
  last_watched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT watched_pkey PRIMARY KEY (user_id, media_key),
  CONSTRAINT watched_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.watchlist (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  added_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT watchlist_pkey PRIMARY KEY (user_id, media_key),
  CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
