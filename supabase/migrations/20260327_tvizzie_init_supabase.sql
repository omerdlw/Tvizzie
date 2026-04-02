-- Tvizzie 2.0 - Firebase -> Supabase schema-only bootstrap

create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  username_lower text unique,
  display_name text not null default 'Anonymous User',
  display_name_lower text not null default 'anonymous user',
  email text,
  avatar_url text,
  banner_url text,
  description text not null default '',
  is_private boolean not null default false,
  watched_count integer not null default 0,
  favorite_showcase jsonb not null default '[]'::jsonb,
  last_activity_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.usernames (
  username text primary key,
  username_lower text not null unique,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted', 'pending', 'rejected')),
  follower_display_name text,
  follower_username text,
  follower_avatar_url text,
  following_display_name text,
  following_username text,
  following_avatar_url text,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_key text not null,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, media_key)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_key text not null,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, media_key)
);

create table if not exists public.watchlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_key text not null,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, media_key)
);

create table if not exists public.watched (
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_key text not null,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  payload jsonb not null default '{}'::jsonb,
  watch_count integer not null default 1,
  last_watched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, media_key)
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  poster_path text,
  backdrop_path text,
  is_ranked boolean not null default false,
  is_private boolean not null default false,
  likes_count integer not null default 0,
  reviews_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, slug)
);

create table if not exists public.list_items (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_key text not null,
  entity_id text,
  entity_type text,
  title text,
  poster_path text,
  backdrop_path text,
  position integer,
  payload jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (list_id, media_key)
);

create table if not exists public.media_reviews (
  media_key text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  rating numeric(3,1),
  is_spoiler boolean not null default false,
  likes_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (media_key, user_id),
  constraint media_reviews_rating_range check (rating is null or (rating >= 0.5 and rating <= 5.0))
);

create table if not exists public.list_reviews (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  rating numeric(3,1),
  is_spoiler boolean not null default false,
  likes_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (list_id, user_id),
  constraint list_reviews_rating_range check (rating is null or (rating >= 0.5 and rating <= 5.0))
);

create table if not exists public.review_likes (
  media_key text not null,
  review_user_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (media_key, review_user_id, user_id)
);

create table if not exists public.list_likes (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (list_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_username_lower_idx on public.profiles(username_lower);
create index if not exists profiles_display_name_lower_idx on public.profiles(display_name_lower);
create index if not exists follows_following_status_created_idx on public.follows(following_id, status, created_at desc);
create index if not exists follows_follower_status_created_idx on public.follows(follower_id, status, created_at desc);
create index if not exists favorites_user_added_idx on public.favorites(user_id, added_at desc);
create index if not exists likes_user_added_idx on public.likes(user_id, added_at desc);
create index if not exists watchlist_user_added_idx on public.watchlist(user_id, added_at desc);
create index if not exists watched_user_last_watched_idx on public.watched(user_id, last_watched_at desc);
create index if not exists activity_user_created_idx on public.activity(user_id, created_at desc);
create index if not exists lists_user_updated_idx on public.lists(user_id, updated_at desc);
create index if not exists list_items_list_added_idx on public.list_items(list_id, added_at desc);
create index if not exists media_reviews_updated_idx on public.media_reviews(updated_at desc);
create index if not exists media_reviews_user_updated_idx on public.media_reviews(user_id, updated_at desc);
create index if not exists list_reviews_updated_idx on public.list_reviews(updated_at desc);
create index if not exists review_likes_user_idx on public.review_likes(user_id);
create index if not exists list_likes_user_idx on public.list_likes(user_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read);

create or replace function public.can_view_private_content(owner_id uuid)
returns boolean
language sql
stable
as $$
  select case
    when owner_id is null then false
    when owner_id = auth.uid() then true
    when exists (
      select 1
      from public.profiles p
      where p.id = owner_id
        and p.is_private = false
    ) then true
    when auth.uid() is not null and exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = owner_id
        and f.status = 'accepted'
    ) then true
    else false
  end;
$$;

grant execute on function public.can_view_private_content(uuid) to anon, authenticated;

create or replace function public.list_owner_id(p_list_id uuid)
returns uuid
language sql
stable
as $$
  select l.user_id
  from public.lists l
  where l.id = p_list_id;
$$;

grant execute on function public.list_owner_id(uuid) to anon, authenticated;

create or replace function public.claim_username(
  p_user_id uuid,
  p_username text,
  p_display_name text,
  p_email text default null,
  p_avatar_url text default null,
  p_preserve_existing boolean default false,
  p_fail_if_profile_has_username boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_profile public.profiles%rowtype;
  v_owner uuid;
  v_display_name text;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  v_username := lower(trim(coalesce(p_username, '')));

  if v_username = '' then
    raise exception 'USERNAME_REQUIRED';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if p_fail_if_profile_has_username
    and v_profile.username is not null
    and v_profile.username <> v_username then
    raise exception 'PROFILE_USERNAME_EXISTS';
  end if;

  select user_id
  into v_owner
  from public.usernames
  where username_lower = v_username
  for update;

  if v_owner is not null and v_owner <> p_user_id then
    raise exception 'USERNAME_TAKEN';
  end if;

  v_display_name := coalesce(nullif(trim(p_display_name), ''), 'Anonymous User');

  if v_profile.id is null then
    insert into public.profiles (
      id,
      username,
      username_lower,
      display_name,
      display_name_lower,
      email,
      avatar_url,
      is_private,
      created_at,
      updated_at
    )
    values (
      p_user_id,
      v_username,
      v_username,
      v_display_name,
      lower(v_display_name),
      nullif(trim(p_email), ''),
      nullif(trim(p_avatar_url), ''),
      false,
      timezone('utc', now()),
      timezone('utc', now())
    );
  else
    update public.profiles
    set username = v_username,
        username_lower = v_username,
        display_name = case
          when p_preserve_existing and coalesce(v_profile.display_name, '') <> '' then v_profile.display_name
          else v_display_name
        end,
        display_name_lower = case
          when p_preserve_existing and coalesce(v_profile.display_name, '') <> '' then lower(v_profile.display_name)
          else lower(v_display_name)
        end,
        email = coalesce(nullif(trim(p_email), ''), v_profile.email),
        avatar_url = case
          when p_preserve_existing and v_profile.avatar_url is not null then v_profile.avatar_url
          else coalesce(nullif(trim(p_avatar_url), ''), v_profile.avatar_url)
        end,
        is_private = coalesce(v_profile.is_private, false),
        updated_at = timezone('utc', now())
    where id = p_user_id;
  end if;

  insert into public.usernames (
    username,
    username_lower,
    user_id,
    created_at,
    updated_at
  )
  values (
    v_username,
    v_username,
    p_user_id,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (username_lower)
  do update
    set username = excluded.username,
        user_id = excluded.user_id,
        updated_at = excluded.updated_at;

  if v_profile.username is not null and v_profile.username <> v_username then
    delete from public.usernames
    where username_lower = v_profile.username_lower
      and user_id = p_user_id;
  end if;

  return true;
end;
$$;

grant execute on function public.claim_username(uuid, text, text, text, text, boolean, boolean) to authenticated;

create or replace function public.promote_pending_followers_to_accepted(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.follows
  set status = 'accepted',
      responded_at = coalesce(responded_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where following_id = p_user_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return coalesce(v_updated, 0);
end;
$$;

grant execute on function public.promote_pending_followers_to_accepted(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.usernames enable row level security;
alter table public.follows enable row level security;
alter table public.favorites enable row level security;
alter table public.likes enable row level security;
alter table public.watchlist enable row level security;
alter table public.watched enable row level security;
alter table public.activity enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.media_reviews enable row level security;
alter table public.list_reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.list_likes enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles
for select
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "usernames_select_all" on public.usernames;
create policy "usernames_select_all"
on public.usernames
for select
using (true);

drop policy if exists "usernames_insert_own" on public.usernames;
create policy "usernames_insert_own"
on public.usernames
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "usernames_update_own" on public.usernames;
create policy "usernames_update_own"
on public.usernames
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "usernames_delete_own" on public.usernames;
create policy "usernames_delete_own"
on public.usernames
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "follows_select_authenticated" on public.follows;
create policy "follows_select_authenticated"
on public.follows
for select
to authenticated
using (
  (select auth.uid()) = follower_id
  or (select auth.uid()) = following_id
  or public.can_view_private_content(following_id)
);

drop policy if exists "follows_select_anon" on public.follows;
create policy "follows_select_anon"
on public.follows
for select
to anon
using (public.can_view_private_content(following_id));

drop policy if exists "follows_insert_participant" on public.follows;
create policy "follows_insert_participant"
on public.follows
for insert
to authenticated
with check ((select auth.uid()) = follower_id);

drop policy if exists "follows_update_participant" on public.follows;
create policy "follows_update_participant"
on public.follows
for update
to authenticated
using ((select auth.uid()) in (follower_id, following_id))
with check ((select auth.uid()) in (follower_id, following_id));

drop policy if exists "follows_delete_participant" on public.follows;
create policy "follows_delete_participant"
on public.follows
for delete
to authenticated
using ((select auth.uid()) in (follower_id, following_id));

drop policy if exists "favorites_select_visible" on public.favorites;
create policy "favorites_select_visible"
on public.favorites
for select
using (public.can_view_private_content(user_id));

drop policy if exists "favorites_write_own" on public.favorites;
create policy "favorites_write_own"
on public.favorites
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "likes_select_visible" on public.likes;
create policy "likes_select_visible"
on public.likes
for select
using (public.can_view_private_content(user_id));

drop policy if exists "likes_write_own" on public.likes;
create policy "likes_write_own"
on public.likes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "watchlist_select_visible" on public.watchlist;
create policy "watchlist_select_visible"
on public.watchlist
for select
using (public.can_view_private_content(user_id));

drop policy if exists "watchlist_write_own" on public.watchlist;
create policy "watchlist_write_own"
on public.watchlist
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "watched_select_visible" on public.watched;
create policy "watched_select_visible"
on public.watched
for select
using (public.can_view_private_content(user_id));

drop policy if exists "watched_write_own" on public.watched;
create policy "watched_write_own"
on public.watched
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "activity_select_visible" on public.activity;
create policy "activity_select_visible"
on public.activity
for select
using (public.can_view_private_content(user_id));

drop policy if exists "activity_write_own" on public.activity;
create policy "activity_write_own"
on public.activity
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "lists_select_visible" on public.lists;
create policy "lists_select_visible"
on public.lists
for select
using (public.can_view_private_content(user_id));

drop policy if exists "lists_write_own" on public.lists;
create policy "lists_write_own"
on public.lists
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "list_items_select_visible" on public.list_items;
create policy "list_items_select_visible"
on public.list_items
for select
using (public.can_view_private_content(public.list_owner_id(list_id)));

drop policy if exists "list_items_write_owner" on public.list_items;
create policy "list_items_write_owner"
on public.list_items
for all
to authenticated
using ((select auth.uid()) = public.list_owner_id(list_id))
with check ((select auth.uid()) = public.list_owner_id(list_id));

drop policy if exists "media_reviews_select_all" on public.media_reviews;
create policy "media_reviews_select_all"
on public.media_reviews
for select
using (true);

drop policy if exists "media_reviews_write_own" on public.media_reviews;
create policy "media_reviews_write_own"
on public.media_reviews
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "list_reviews_select_visible" on public.list_reviews;
create policy "list_reviews_select_visible"
on public.list_reviews
for select
using (public.can_view_private_content(public.list_owner_id(list_id)));

drop policy if exists "list_reviews_write_own" on public.list_reviews;
create policy "list_reviews_write_own"
on public.list_reviews
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "review_likes_select_all" on public.review_likes;
create policy "review_likes_select_all"
on public.review_likes
for select
using (true);

drop policy if exists "review_likes_write_own" on public.review_likes;
create policy "review_likes_write_own"
on public.review_likes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "list_likes_select_visible" on public.list_likes;
create policy "list_likes_select_visible"
on public.list_likes
for select
using (public.can_view_private_content(public.list_owner_id(list_id)));

drop policy if exists "list_likes_write_own" on public.list_likes;
create policy "list_likes_write_own"
on public.list_likes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
using ((select auth.uid()) = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
on public.notifications
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_usernames_updated_at on public.usernames;
create trigger set_usernames_updated_at
before update on public.usernames
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_follows_updated_at on public.follows;
create trigger set_follows_updated_at
before update on public.follows
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_favorites_updated_at on public.favorites;
create trigger set_favorites_updated_at
before update on public.favorites
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_likes_updated_at on public.likes;
create trigger set_likes_updated_at
before update on public.likes
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_watchlist_updated_at on public.watchlist;
create trigger set_watchlist_updated_at
before update on public.watchlist
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_watched_updated_at on public.watched;
create trigger set_watched_updated_at
before update on public.watched
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_activity_updated_at on public.activity;
create trigger set_activity_updated_at
before update on public.activity
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_lists_updated_at on public.lists;
create trigger set_lists_updated_at
before update on public.lists
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_list_items_updated_at on public.list_items;
create trigger set_list_items_updated_at
before update on public.list_items
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_media_reviews_updated_at on public.media_reviews;
create trigger set_media_reviews_updated_at
before update on public.media_reviews
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_list_reviews_updated_at on public.list_reviews;
create trigger set_list_reviews_updated_at
before update on public.list_reviews
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_current_timestamp_updated_at();
