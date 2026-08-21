begin;

-- New database objects remain private by default. Data API exposure must be an
-- explicit decision paired with RLS and a narrow grant in the same migration.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete, truncate, references, trigger on tables to service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

-- Favorite showcase entries are a projection of likes. Keep that invariant in
-- the same transaction as unlike instead of a later browser read/write pair.
create or replace function private.remove_favorite_showcase_item(
  p_user_id uuid,
  p_media_key text
)
returns void
language sql
set search_path = ''
as $function$
  update public.profiles as profile
  set favorite_showcase = coalesce(
        (
          select jsonb_agg(entry.value order by entry.ordinality)
          from jsonb_array_elements(
            case
              when jsonb_typeof(profile.favorite_showcase) = 'array'
                then profile.favorite_showcase
              else '[]'::jsonb
            end
          ) with ordinality as entry(value, ordinality)
          where coalesce(entry.value->>'mediaKey', entry.value->>'media_key', '')
            <> p_media_key
        ),
        '[]'::jsonb
      ),
      updated_at = timezone('utc', now())
  where profile.id = p_user_id;
$function$;

revoke execute on function private.remove_favorite_showcase_item(uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.collection_toggle_like(
  p_user_id uuid,
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table(
  is_liked boolean,
  media_key text,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_counters public.profile_counters;
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
begin
  perform public.assert_infra_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('like:%s:%s', p_user_id::text, v_media_key))
  );

  select exists(
    select 1
    from public.likes as existing_like
    where existing_like.user_id = p_user_id
      and existing_like.media_key = v_media_key
  ) into v_existing;

  if v_existing then
    delete from public.likes as existing_like
    where existing_like.user_id = p_user_id
      and existing_like.media_key = v_media_key;

    perform private.remove_favorite_showcase_item(p_user_id, v_media_key);
    v_counters := public.profile_counter_apply_delta(
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
    on conflict on constraint likes_pkey do update
      set entity_id = excluded.entity_id,
          entity_type = excluded.entity_type,
          title = excluded.title,
          poster_path = excluded.poster_path,
          backdrop_path = excluded.backdrop_path,
          payload = excluded.payload,
          updated_at = excluded.updated_at;

    v_counters := public.profile_counter_apply_delta(
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
$function$;

create or replace function public.collection_remove_like(
  p_user_id uuid,
  p_media_key text
)
returns table(
  removed boolean,
  media_key text,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_likes_count integer := 0;
  v_updated_at timestamptz := v_now;
  v_counters public.profile_counters;
begin
  perform public.assert_infra_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('like:%s:%s', p_user_id::text, v_media_key))
  );

  delete from public.likes as existing_like
  where existing_like.user_id = p_user_id
    and existing_like.media_key = v_media_key;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    perform private.remove_favorite_showcase_item(p_user_id, v_media_key);
    v_counters := public.profile_counter_apply_delta(
      p_user_id,
      p_likes_delta := -1
    );
    v_likes_count := coalesce(v_counters.likes_count, 0);
    v_updated_at := coalesce(v_counters.updated_at, v_now);
  else
    select coalesce(counters.likes_count, 0), coalesce(counters.updated_at, v_now)
    into v_likes_count, v_updated_at
    from public.profile_counters as counters
    where counters.user_id = p_user_id;
  end if;

  removed := v_deleted > 0;
  media_key := v_media_key;
  likes_count := coalesce(v_likes_count, 0);
  updated_at := v_updated_at;
  return next;
end;
$function$;

-- Changing the return contract requires replacing both overloads. The browser
-- overload remains JWT-owned; the UUID-first core remains service-role-only.
drop function public.collection_remove_watched(text);
drop function public.collection_remove_watched(uuid, text);

create function public.collection_remove_watched(
  p_user_id uuid,
  p_media_key text
)
returns table(
  removed boolean,
  media_key text,
  watched_count integer,
  was_unliked boolean,
  likes_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_watched_deleted integer := 0;
  v_like_deleted integer := 0;
  v_now timestamptz := timezone('utc', now());
  v_media_key text := nullif(trim(coalesce(p_media_key, '')), '');
  v_counters public.profile_counters;
begin
  perform public.assert_infra_actor(p_user_id);

  if v_media_key is null then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('watched:%s:%s', p_user_id::text, v_media_key))
  );
  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(pg_catalog.format('like:%s:%s', p_user_id::text, v_media_key))
  );

  delete from public.watched as watched_row
  where watched_row.user_id = p_user_id
    and watched_row.media_key = v_media_key;
  get diagnostics v_watched_deleted = row_count;

  delete from public.likes as like_row
  where like_row.user_id = p_user_id
    and like_row.media_key = v_media_key;
  get diagnostics v_like_deleted = row_count;

  if v_like_deleted > 0 then
    perform private.remove_favorite_showcase_item(p_user_id, v_media_key);
  end if;

  if v_watched_deleted > 0 or v_like_deleted > 0 then
    v_counters := public.profile_counter_apply_delta(
      p_user_id,
      p_likes_delta := -v_like_deleted,
      p_watched_delta := -v_watched_deleted
    );
  else
    select * into v_counters
    from public.profile_counters as counters
    where counters.user_id = p_user_id;
  end if;

  removed := v_watched_deleted > 0;
  media_key := v_media_key;
  watched_count := coalesce(v_counters.watched_count, 0);
  was_unliked := v_like_deleted > 0;
  likes_count := coalesce(v_counters.likes_count, 0);
  updated_at := coalesce(v_counters.updated_at, v_now);
  return next;
end;
$function$;

create function public.collection_remove_watched(p_media_key text)
returns table(
  removed boolean,
  media_key text,
  watched_count integer,
  was_unliked boolean,
  likes_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_remove_watched(
    p_user_id => auth.uid(),
    p_media_key => p_media_key
  );
$function$;

revoke execute on function public.collection_remove_watched(uuid, text)
  from public, anon, authenticated;
grant execute on function public.collection_remove_watched(uuid, text)
  to service_role;
revoke execute on function public.collection_remove_watched(text)
  from public, anon, service_role;
grant execute on function public.collection_remove_watched(text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
