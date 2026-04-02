-- Tvizzie infra v2 transactional primitives
-- Atomic write RPCs for collection and follow mutation paths.

create or replace function public.assert_infra_v2_actor(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.role(), '');
  v_uid uuid := auth.uid();
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if v_role in ('service_role', 'supabase_admin') then
    return;
  end if;

  if v_uid is null or v_uid <> p_user_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.profile_counter_apply_delta_v2(
  p_user_id uuid,
  p_likes_delta integer default 0,
  p_lists_delta integer default 0,
  p_watched_delta integer default 0,
  p_watchlist_delta integer default 0,
  p_follower_delta integer default 0,
  p_following_delta integer default 0
)
returns public.profile_counters_v2
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.profile_counters_v2;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  perform public.assert_infra_v2_actor(p_user_id);

  insert into public.profile_counters_v2 (user_id, updated_at)
  values (p_user_id, timezone('utc', now()))
  on conflict (user_id) do nothing;

  update public.profile_counters_v2
  set likes_count = greatest(0, likes_count + coalesce(p_likes_delta, 0)),
      lists_count = greatest(0, lists_count + coalesce(p_lists_delta, 0)),
      watched_count = greatest(0, watched_count + coalesce(p_watched_delta, 0)),
      watchlist_count = greatest(0, watchlist_count + coalesce(p_watchlist_delta, 0)),
      follower_count = greatest(0, follower_count + coalesce(p_follower_delta, 0)),
      following_count = greatest(0, following_count + coalesce(p_following_delta, 0)),
      updated_at = timezone('utc', now())
  where user_id = p_user_id
  returning * into v_row;

  if not found then
    select *
    into v_row
    from public.refresh_profile_counters_v2(p_user_id);
  end if;

  return v_row;
end;
$$;

create or replace function public.collection_toggle_like_v2(
  p_user_id uuid,
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  is_liked boolean,
  media_key text,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_counters public.profile_counters_v2;
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('like:%s:%s', p_user_id::text, v_media_key))
  );

  select exists(
    select 1
    from public.likes
    where user_id = p_user_id
      and media_key = v_media_key
  )
  into v_existing;

  if v_existing then
    delete from public.likes
    where user_id = p_user_id
      and media_key = v_media_key;

    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_likes_delta := -1
    );
    is_liked := false;
  else
    insert into public.likes (
      user_id,
      media_key,
      entity_id,
      entity_type,
      title,
      poster_path,
      backdrop_path,
      payload,
      added_at,
      updated_at
    )
    values (
      p_user_id,
      v_media_key,
      nullif(trim(coalesce(p_entity_id, '')), ''),
      nullif(trim(coalesce(p_entity_type, '')), ''),
      nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_poster_path, '')), ''),
      nullif(trim(coalesce(p_backdrop_path, '')), ''),
      coalesce(p_payload, '{}'::jsonb),
      v_now,
      v_now
    )
    on conflict (user_id, media_key) do update
      set entity_id = excluded.entity_id,
          entity_type = excluded.entity_type,
          title = excluded.title,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          payload = excluded.payload,
          updated_at = excluded.updated_at;

    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_likes_delta := 1
    );
    is_liked := true;
  end if;

  media_key := v_media_key;
  likes_count := coalesce(v_counters.likes_count, 0);
  updated_at := coalesce(v_counters.updated_at, v_now);
  return next;
end;
$$;

create or replace function public.collection_remove_like_v2(
  p_user_id uuid,
  p_media_key text
)
returns table (
  removed boolean,
  media_key text,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_likes_count integer := 0;
  v_updated_at timestamptz := v_now;
  v_counters public.profile_counters_v2;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('like:%s:%s', p_user_id::text, v_media_key))
  );

  delete from public.likes
  where user_id = p_user_id
    and media_key = v_media_key;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_likes_delta := -1
    );
    v_likes_count := coalesce(v_counters.likes_count, 0);
    v_updated_at := coalesce(v_counters.updated_at, v_now);
  else
    select
      coalesce(pc.likes_count, 0),
      coalesce(pc.updated_at, v_now)
    into
      v_likes_count,
      v_updated_at
    from public.profile_counters_v2 pc
    where pc.user_id = p_user_id;
  end if;

  removed := v_deleted > 0;
  media_key := v_media_key;
  likes_count := coalesce(v_likes_count, 0);
  updated_at := v_updated_at;
  return next;
end;
$$;

create or replace function public.collection_toggle_watchlist_v2(
  p_user_id uuid,
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  is_in_watchlist boolean,
  media_key text,
  watchlist_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_counters public.profile_counters_v2;
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('watchlist:%s:%s', p_user_id::text, v_media_key))
  );

  select exists(
    select 1
    from public.watchlist
    where user_id = p_user_id
      and media_key = v_media_key
  )
  into v_existing;

  if v_existing then
    delete from public.watchlist
    where user_id = p_user_id
      and media_key = v_media_key;

    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_watchlist_delta := -1
    );
    is_in_watchlist := false;
  else
    insert into public.watchlist (
      user_id,
      media_key,
      entity_id,
      entity_type,
      title,
      poster_path,
      backdrop_path,
      payload,
      added_at,
      updated_at
    )
    values (
      p_user_id,
      v_media_key,
      nullif(trim(coalesce(p_entity_id, '')), ''),
      nullif(trim(coalesce(p_entity_type, '')), ''),
      nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_poster_path, '')), ''),
      nullif(trim(coalesce(p_backdrop_path, '')), ''),
      coalesce(p_payload, '{}'::jsonb),
      v_now,
      v_now
    )
    on conflict (user_id, media_key) do update
      set entity_id = excluded.entity_id,
          entity_type = excluded.entity_type,
          title = excluded.title,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          payload = excluded.payload,
          updated_at = excluded.updated_at;

    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_watchlist_delta := 1
    );
    is_in_watchlist := true;
  end if;

  media_key := v_media_key;
  watchlist_count := coalesce(v_counters.watchlist_count, 0);
  updated_at := coalesce(v_counters.updated_at, v_now);
  return next;
end;
$$;

create or replace function public.collection_remove_watchlist_v2(
  p_user_id uuid,
  p_media_key text
)
returns table (
  removed boolean,
  media_key text,
  watchlist_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_watchlist_count integer := 0;
  v_updated_at timestamptz := v_now;
  v_counters public.profile_counters_v2;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('watchlist:%s:%s', p_user_id::text, v_media_key))
  );

  delete from public.watchlist
  where user_id = p_user_id
    and media_key = v_media_key;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_watchlist_delta := -1
    );
    v_watchlist_count := coalesce(v_counters.watchlist_count, 0);
    v_updated_at := coalesce(v_counters.updated_at, v_now);
  else
    select
      coalesce(pc.watchlist_count, 0),
      coalesce(pc.updated_at, v_now)
    into
      v_watchlist_count,
      v_updated_at
    from public.profile_counters_v2 pc
    where pc.user_id = p_user_id;
  end if;

  removed := v_deleted > 0;
  media_key := v_media_key;
  watchlist_count := coalesce(v_watchlist_count, 0);
  updated_at := v_updated_at;
  return next;
end;
$$;

create or replace function public.collection_mark_watched_v2(
  p_user_id uuid,
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb,
  p_last_watched_at timestamptz default timezone('utc', now()),
  p_source_last_action text default 'watched'
)
returns table (
  is_new boolean,
  media_key text,
  watch_count integer,
  watched_count integer,
  watchlist_count integer,
  was_removed_from_watchlist boolean,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing public.watched%rowtype;
  v_is_new boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_last_watched_at timestamptz := coalesce(p_last_watched_at, timezone('utc', now()));
  v_watch_count integer := 1;
  v_first_watched_at timestamptz := v_last_watched_at;
  v_watchlist_deleted integer := 0;
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_payload jsonb;
  v_counters public.profile_counters_v2;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('watched:%s:%s', p_user_id::text, v_media_key))
  );

  select *
  into v_existing
  from public.watched
  where user_id = p_user_id
    and media_key = v_media_key
  for update;

  v_is_new := not found;

  if v_is_new then
    v_watch_count := 1;
    v_first_watched_at := v_last_watched_at;
  else
    v_watch_count := greatest(1, coalesce(v_existing.watch_count, 1));
    v_first_watched_at := coalesce(v_existing.created_at, v_last_watched_at);
  end if;

  v_payload := coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
    'firstWatchedAt', v_first_watched_at,
    'lastWatchedAt', v_last_watched_at,
    'sourceLastAction', coalesce(nullif(trim(coalesce(p_source_last_action, '')), ''), 'watched'),
    'watchCount', v_watch_count
  );

  insert into public.watched (
    user_id,
    media_key,
    entity_id,
    entity_type,
    title,
    poster_path,
    backdrop_path,
    payload,
    watch_count,
    last_watched_at,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    v_media_key,
    coalesce(nullif(trim(coalesce(p_entity_id, '')), ''), v_existing.entity_id),
    coalesce(nullif(trim(coalesce(p_entity_type, '')), ''), v_existing.entity_type),
    coalesce(nullif(trim(coalesce(p_title, '')), ''), v_existing.title),
    coalesce(nullif(trim(coalesce(p_poster_path, '')), ''), v_existing.poster_path),
    coalesce(nullif(trim(coalesce(p_backdrop_path, '')), ''), v_existing.backdrop_path),
    v_payload,
    v_watch_count,
    v_last_watched_at,
    coalesce(v_existing.created_at, v_last_watched_at),
    v_now
  )
  on conflict (user_id, media_key) do update
    set entity_id = excluded.entity_id,
        entity_type = excluded.entity_type,
        title = excluded.title,
        poster_path = excluded.poster_path,
        backdrop_path = excluded.backdrop_path,
        payload = excluded.payload,
        watch_count = excluded.watch_count,
        last_watched_at = excluded.last_watched_at,
        updated_at = excluded.updated_at;

  delete from public.watchlist
  where user_id = p_user_id
    and media_key = v_media_key;
  get diagnostics v_watchlist_deleted = row_count;

  v_counters := public.profile_counter_apply_delta_v2(
    p_user_id,
    p_watched_delta := case when v_is_new then 1 else 0 end,
    p_watchlist_delta := case when v_watchlist_deleted > 0 then -1 else 0 end
  );

  is_new := v_is_new;
  media_key := v_media_key;
  watch_count := v_watch_count;
  watched_count := coalesce(v_counters.watched_count, 0);
  watchlist_count := coalesce(v_counters.watchlist_count, 0);
  was_removed_from_watchlist := v_watchlist_deleted > 0;
  updated_at := coalesce(v_counters.updated_at, v_now);
  return next;
end;
$$;

create or replace function public.collection_remove_watched_v2(
  p_user_id uuid,
  p_media_key text
)
returns table (
  removed boolean,
  media_key text,
  watched_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_watched_count integer := 0;
  v_updated_at timestamptz := v_now;
  v_counters public.profile_counters_v2;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('watched:%s:%s', p_user_id::text, v_media_key))
  );

  delete from public.watched
  where user_id = p_user_id
    and media_key = v_media_key;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    v_counters := public.profile_counter_apply_delta_v2(
      p_user_id,
      p_watched_delta := -1
    );
    v_watched_count := coalesce(v_counters.watched_count, 0);
    v_updated_at := coalesce(v_counters.updated_at, v_now);
  else
    select
      coalesce(pc.watched_count, 0),
      coalesce(pc.updated_at, v_now)
    into
      v_watched_count,
      v_updated_at
    from public.profile_counters_v2 pc
    where pc.user_id = p_user_id;
  end if;

  removed := v_deleted > 0;
  media_key := v_media_key;
  watched_count := coalesce(v_watched_count, 0);
  updated_at := v_updated_at;
  return next;
end;
$$;

create or replace function public.collection_toggle_list_item_v2(
  p_user_id uuid,
  p_list_id uuid,
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb,
  p_position integer default null
)
returns table (
  is_in_list boolean,
  media_key text,
  items_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_list public.lists%rowtype;
  v_existing boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_items_count integer := 0;
  v_preview_items jsonb := '[]'::jsonb;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if p_list_id is null then
    raise exception 'LIST_ID_REQUIRED';
  end if;

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  select *
  into v_list
  from public.lists
  where id = p_list_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'LIST_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('list-item:%s:%s', p_list_id::text, v_media_key))
  );

  select exists(
    select 1
    from public.list_items
    where list_id = p_list_id
      and user_id = p_user_id
      and media_key = v_media_key
  )
  into v_existing;

  if v_existing then
    delete from public.list_items
    where list_id = p_list_id
      and user_id = p_user_id
      and media_key = v_media_key;
    is_in_list := false;
  else
    insert into public.list_items (
      list_id,
      user_id,
      media_key,
      entity_id,
      entity_type,
      title,
      poster_path,
      backdrop_path,
      position,
      payload,
      added_at,
      updated_at
    )
    values (
      p_list_id,
      p_user_id,
      v_media_key,
      nullif(trim(coalesce(p_entity_id, '')), ''),
      nullif(trim(coalesce(p_entity_type, '')), ''),
      nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_poster_path, '')), ''),
      nullif(trim(coalesce(p_backdrop_path, '')), ''),
      p_position,
      coalesce(p_payload, '{}'::jsonb),
      v_now,
      v_now
    )
    on conflict (list_id, media_key) do update
      set entity_id = excluded.entity_id,
          entity_type = excluded.entity_type,
          title = excluded.title,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          position = excluded.position,
          payload = excluded.payload,
          updated_at = excluded.updated_at;

    is_in_list := true;
  end if;

  select count(*)::integer
  into v_items_count
  from public.list_items li
  where li.list_id = p_list_id
    and li.user_id = p_user_id;

  select coalesce(
    jsonb_agg(preview_row.payload order by preview_row.added_at desc),
    '[]'::jsonb
  )
  into v_preview_items
  from (
    select li.payload, li.added_at
    from public.list_items li
    where li.list_id = p_list_id
      and li.user_id = p_user_id
    order by li.added_at desc
    limit 5
  ) as preview_row;

  update public.lists
  set payload = coalesce(v_list.payload, '{}'::jsonb) || jsonb_build_object(
      'itemsCount', v_items_count,
      'previewItems', coalesce(v_preview_items, '[]'::jsonb)
    ),
    updated_at = v_now
  where id = p_list_id
    and user_id = p_user_id;

  media_key := v_media_key;
  items_count := coalesce(v_items_count, 0);
  updated_at := v_now;
  return next;
end;
$$;

create or replace function public.collection_toggle_list_like_v2(
  p_owner_id uuid,
  p_list_id uuid,
  p_user_id uuid
)
returns table (
  is_liked boolean,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_list public.lists%rowtype;
  v_existing boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_next_likes jsonb := '[]'::jsonb;
  v_likes_count integer := 0;
begin
  perform public.assert_infra_v2_actor(p_user_id);

  if p_owner_id is null or p_list_id is null or p_user_id is null then
    raise exception 'OWNER_ID_LIST_ID_AND_USER_ID_REQUIRED';
  end if;

  if p_owner_id = p_user_id then
    raise exception 'CANNOT_LIKE_OWN_LIST';
  end if;

  select *
  into v_list
  from public.lists
  where id = p_list_id
    and user_id = p_owner_id
  for update;

  if not found then
    raise exception 'LIST_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('list-like:%s:%s', p_list_id::text, p_user_id::text))
  );

  select exists(
    select 1
    from public.list_likes
    where list_id = p_list_id
      and user_id = p_user_id
  )
  into v_existing;

  if v_existing then
    delete from public.list_likes
    where list_id = p_list_id
      and user_id = p_user_id;
    is_liked := false;
  else
    insert into public.list_likes (
      list_id,
      user_id,
      created_at
    )
    values (
      p_list_id,
      p_user_id,
      v_now
    )
    on conflict (list_id, user_id) do nothing;
    is_liked := true;
  end if;

  select coalesce(
    jsonb_agg(ll.user_id::text order by ll.created_at asc),
    '[]'::jsonb
  )
  into v_next_likes
  from public.list_likes ll
  where ll.list_id = p_list_id;

  v_likes_count := greatest(
    0,
    coalesce(v_list.likes_count, 0) + case when is_liked then 1 else -1 end
  );

  update public.lists
  set likes_count = v_likes_count,
      payload = coalesce(v_list.payload, '{}'::jsonb) || jsonb_build_object(
        'likes', v_next_likes
      ),
      updated_at = v_now
  where id = p_list_id
    and user_id = p_owner_id;

  likes_count := v_likes_count;
  updated_at := v_now;
  return next;
end;
$$;

create or replace function public.follow_upsert_v2(
  p_follower_id uuid,
  p_following_id uuid,
  p_status text,
  p_follower_display_name text default null,
  p_follower_username text default null,
  p_follower_avatar_url text default null,
  p_following_display_name text default null,
  p_following_username text default null,
  p_following_avatar_url text default null,
  p_created_at timestamptz default null
)
returns table (
  status text,
  accepted_delta integer,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing public.follows%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_status text := lower(trim(coalesce(p_status, '')));
  v_prev_accepted boolean := false;
  v_next_accepted boolean := false;
begin
  perform public.assert_infra_v2_actor(p_follower_id);

  if p_follower_id is null or p_following_id is null then
    raise exception 'FOLLOW_IDS_REQUIRED';
  end if;

  if p_follower_id = p_following_id then
    raise exception 'CANNOT_FOLLOW_SELF';
  end if;

  if v_status not in ('accepted', 'pending', 'rejected') then
    raise exception 'INVALID_FOLLOW_STATUS';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('follow:%s:%s', p_follower_id::text, p_following_id::text))
  );

  select *
  into v_existing
  from public.follows
  where follower_id = p_follower_id
    and following_id = p_following_id
  for update;

  v_prev_accepted := found and v_existing.status = 'accepted';
  v_next_accepted := v_status = 'accepted';

  if found then
    update public.follows
    set status = v_status,
        follower_display_name = coalesce(nullif(trim(coalesce(p_follower_display_name, '')), ''), v_existing.follower_display_name),
        follower_username = coalesce(nullif(trim(coalesce(p_follower_username, '')), ''), v_existing.follower_username),
        follower_avatar_url = coalesce(nullif(trim(coalesce(p_follower_avatar_url, '')), ''), v_existing.follower_avatar_url),
        following_display_name = coalesce(nullif(trim(coalesce(p_following_display_name, '')), ''), v_existing.following_display_name),
        following_username = coalesce(nullif(trim(coalesce(p_following_username, '')), ''), v_existing.following_username),
        following_avatar_url = coalesce(nullif(trim(coalesce(p_following_avatar_url, '')), ''), v_existing.following_avatar_url),
        responded_at = case
          when v_status in ('accepted', 'rejected') then v_now
          else null
        end,
        created_at = coalesce(p_created_at, v_existing.created_at),
        updated_at = v_now
    where follower_id = p_follower_id
      and following_id = p_following_id;
  else
    insert into public.follows (
      follower_id,
      following_id,
      status,
      follower_display_name,
      follower_username,
      follower_avatar_url,
      following_display_name,
      following_username,
      following_avatar_url,
      responded_at,
      created_at,
      updated_at
    )
    values (
      p_follower_id,
      p_following_id,
      v_status,
      nullif(trim(coalesce(p_follower_display_name, '')), ''),
      nullif(trim(coalesce(p_follower_username, '')), ''),
      nullif(trim(coalesce(p_follower_avatar_url, '')), ''),
      nullif(trim(coalesce(p_following_display_name, '')), ''),
      nullif(trim(coalesce(p_following_username, '')), ''),
      nullif(trim(coalesce(p_following_avatar_url, '')), ''),
      case
        when v_status in ('accepted', 'rejected') then v_now
        else null
      end,
      coalesce(p_created_at, v_now),
      v_now
    );
  end if;

  accepted_delta := 0;

  if not v_prev_accepted and v_next_accepted then
    accepted_delta := 1;
    perform public.profile_counter_apply_delta_v2(
      p_follower_id,
      p_following_delta := 1
    );
    perform public.profile_counter_apply_delta_v2(
      p_following_id,
      p_follower_delta := 1
    );
  elsif v_prev_accepted and not v_next_accepted then
    accepted_delta := -1;
    perform public.profile_counter_apply_delta_v2(
      p_follower_id,
      p_following_delta := -1
    );
    perform public.profile_counter_apply_delta_v2(
      p_following_id,
      p_follower_delta := -1
    );
  end if;

  status := v_status;
  updated_at := v_now;
  return next;
end;
$$;

create or replace function public.follow_delete_v2(
  p_actor_id uuid,
  p_follower_id uuid,
  p_following_id uuid
)
returns table (
  removed boolean,
  was_accepted boolean,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_existing public.follows%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_role text := coalesce(auth.role(), '');
begin
  perform public.assert_infra_v2_actor(p_actor_id);

  if p_follower_id is null or p_following_id is null then
    raise exception 'FOLLOW_IDS_REQUIRED';
  end if;

  if v_role not in ('service_role', 'supabase_admin')
    and p_actor_id not in (p_follower_id, p_following_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('follow:%s:%s', p_follower_id::text, p_following_id::text))
  );

  select *
  into v_existing
  from public.follows
  where follower_id = p_follower_id
    and following_id = p_following_id
  for update;

  if not found then
    removed := false;
    was_accepted := false;
    updated_at := v_now;
    return next;
    return;
  end if;

  delete from public.follows
  where follower_id = p_follower_id
    and following_id = p_following_id;

  removed := true;
  was_accepted := v_existing.status = 'accepted';

  if was_accepted then
    perform public.profile_counter_apply_delta_v2(
      p_follower_id,
      p_following_delta := -1
    );
    perform public.profile_counter_apply_delta_v2(
      p_following_id,
      p_follower_delta := -1
    );
  end if;

  updated_at := v_now;
  return next;
end;
$$;

revoke all on function public.assert_infra_v2_actor(uuid) from public, anon, authenticated;
revoke all on function public.profile_counter_apply_delta_v2(uuid, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.collection_toggle_like_v2(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.collection_remove_like_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.collection_toggle_watchlist_v2(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.collection_remove_watchlist_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.collection_mark_watched_v2(uuid, text, text, text, text, text, text, jsonb, timestamptz, text) from public, anon, authenticated;
revoke all on function public.collection_remove_watched_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.collection_toggle_list_item_v2(uuid, uuid, text, text, text, text, text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.collection_toggle_list_like_v2(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.follow_upsert_v2(uuid, uuid, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.follow_delete_v2(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.profile_counter_apply_delta_v2(uuid, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.collection_toggle_like_v2(uuid, text, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.collection_remove_like_v2(uuid, text) to authenticated, service_role;
grant execute on function public.collection_toggle_watchlist_v2(uuid, text, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.collection_remove_watchlist_v2(uuid, text) to authenticated, service_role;
grant execute on function public.collection_mark_watched_v2(uuid, text, text, text, text, text, text, jsonb, timestamptz, text) to authenticated, service_role;
grant execute on function public.collection_remove_watched_v2(uuid, text) to authenticated, service_role;
grant execute on function public.collection_toggle_list_item_v2(uuid, uuid, text, text, text, text, text, text, jsonb, integer) to authenticated, service_role;
grant execute on function public.collection_toggle_list_like_v2(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.follow_upsert_v2(uuid, uuid, text, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.follow_delete_v2(uuid, uuid, uuid) to service_role;
