-- Fix: clean duplicate media collection rows that break status reads
-- and enforce uniqueness on (user_id, media_key) for likes/watchlist/watched.
-- Run in Supabase SQL Editor.

begin;

-- 1) Deduplicate likes (keep newest row per user_id + media_key)
with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, media_key
      order by updated_at desc nulls last, added_at desc nulls last, ctid desc
    ) as rn
  from public.likes
)
delete from public.likes t
using ranked r
where t.ctid = r.ctid
  and r.rn > 1;

-- 2) Deduplicate watchlist (keep newest row per user_id + media_key)
with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, media_key
      order by updated_at desc nulls last, added_at desc nulls last, ctid desc
    ) as rn
  from public.watchlist
)
delete from public.watchlist t
using ranked r
where t.ctid = r.ctid
  and r.rn > 1;

-- 3) Deduplicate watched (keep newest row per user_id + media_key)
with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, media_key
      order by last_watched_at desc nulls last, updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.watched
)
delete from public.watched t
using ranked r
where t.ctid = r.ctid
  and r.rn > 1;

-- 4) Ensure unique/pk protection exists for likes(user_id, media_key)
do $$
declare
  v_user_attnum smallint;
  v_media_attnum smallint;
begin
  select attnum
  into v_user_attnum
  from pg_attribute
  where attrelid = 'public.likes'::regclass
    and attname = 'user_id'
    and attisdropped = false
  limit 1;

  select attnum
  into v_media_attnum
  from pg_attribute
  where attrelid = 'public.likes'::regclass
    and attname = 'media_key'
    and attisdropped = false
  limit 1;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.likes'::regclass
      and c.contype in ('p', 'u')
      and (c.conkey = array[v_user_attnum, v_media_attnum]::smallint[]
        or c.conkey = array[v_media_attnum, v_user_attnum]::smallint[])
  ) then
    alter table public.likes
      add constraint likes_user_media_key_unique unique (user_id, media_key);
  end if;
end $$;

-- 5) Ensure unique/pk protection exists for watchlist(user_id, media_key)
do $$
declare
  v_user_attnum smallint;
  v_media_attnum smallint;
begin
  select attnum
  into v_user_attnum
  from pg_attribute
  where attrelid = 'public.watchlist'::regclass
    and attname = 'user_id'
    and attisdropped = false
  limit 1;

  select attnum
  into v_media_attnum
  from pg_attribute
  where attrelid = 'public.watchlist'::regclass
    and attname = 'media_key'
    and attisdropped = false
  limit 1;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.watchlist'::regclass
      and c.contype in ('p', 'u')
      and (c.conkey = array[v_user_attnum, v_media_attnum]::smallint[]
        or c.conkey = array[v_media_attnum, v_user_attnum]::smallint[])
  ) then
    alter table public.watchlist
      add constraint watchlist_user_media_key_unique unique (user_id, media_key);
  end if;
end $$;

-- 6) Ensure unique/pk protection exists for watched(user_id, media_key)
do $$
declare
  v_user_attnum smallint;
  v_media_attnum smallint;
begin
  select attnum
  into v_user_attnum
  from pg_attribute
  where attrelid = 'public.watched'::regclass
    and attname = 'user_id'
    and attisdropped = false
  limit 1;

  select attnum
  into v_media_attnum
  from pg_attribute
  where attrelid = 'public.watched'::regclass
    and attname = 'media_key'
    and attisdropped = false
  limit 1;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.watched'::regclass
      and c.contype in ('p', 'u')
      and (c.conkey = array[v_user_attnum, v_media_attnum]::smallint[]
        or c.conkey = array[v_media_attnum, v_user_attnum]::smallint[])
  ) then
    alter table public.watched
      add constraint watched_user_media_key_unique unique (user_id, media_key);
  end if;
end $$;

commit;

-- Optional verification (should return no rows):
-- select user_id, media_key, count(*) from public.likes group by 1,2 having count(*) > 1;
-- select user_id, media_key, count(*) from public.watchlist group by 1,2 having count(*) > 1;
-- select user_id, media_key, count(*) from public.watched group by 1,2 having count(*) > 1;
