begin;

-- Browser-facing overloads never accept an actor id. The authenticated user is
-- read from the verified JWT and forwarded to the existing atomic core
-- functions, whose actor assertion remains defense in depth.
create or replace function public.collection_mark_watched(
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
returns table(
  is_new boolean,
  media_key text,
  watch_count integer,
  watched_count integer,
  watchlist_count integer,
  was_removed_from_watchlist boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_mark_watched(
    p_user_id => auth.uid(),
    p_media_key => p_media_key,
    p_entity_id => p_entity_id,
    p_entity_type => p_entity_type,
    p_title => p_title,
    p_poster_path => p_poster_path,
    p_backdrop_path => p_backdrop_path,
    p_payload => p_payload,
    p_last_watched_at => p_last_watched_at,
    p_source_last_action => p_source_last_action
  );
$function$;

create or replace function public.collection_remove_like(p_media_key text)
returns table(
  removed boolean,
  media_key text,
  likes_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_remove_like(
    p_user_id => auth.uid(),
    p_media_key => p_media_key
  );
$function$;

create or replace function public.collection_remove_watched(p_media_key text)
returns table(
  removed boolean,
  media_key text,
  watched_count integer,
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

create or replace function public.collection_remove_watchlist(p_media_key text)
returns table(
  removed boolean,
  media_key text,
  watchlist_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_remove_watchlist(
    p_user_id => auth.uid(),
    p_media_key => p_media_key
  );
$function$;

create or replace function public.collection_toggle_like(
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
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_toggle_like(
    p_user_id => auth.uid(),
    p_media_key => p_media_key,
    p_entity_id => p_entity_id,
    p_entity_type => p_entity_type,
    p_title => p_title,
    p_poster_path => p_poster_path,
    p_backdrop_path => p_backdrop_path,
    p_payload => p_payload
  );
$function$;

create or replace function public.collection_toggle_list_item(
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
returns table(
  is_in_list boolean,
  media_key text,
  items_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_toggle_list_item(
    p_user_id => auth.uid(),
    p_list_id => p_list_id,
    p_media_key => p_media_key,
    p_entity_id => p_entity_id,
    p_entity_type => p_entity_type,
    p_title => p_title,
    p_poster_path => p_poster_path,
    p_backdrop_path => p_backdrop_path,
    p_payload => p_payload,
    p_position => p_position
  );
$function$;

create or replace function public.collection_toggle_watchlist(
  p_media_key text,
  p_entity_id text default null,
  p_entity_type text default null,
  p_title text default null,
  p_poster_path text default null,
  p_backdrop_path text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table(
  is_in_watchlist boolean,
  media_key text,
  watchlist_count integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.collection_toggle_watchlist(
    p_user_id => auth.uid(),
    p_media_key => p_media_key,
    p_entity_id => p_entity_id,
    p_entity_type => p_entity_type,
    p_title => p_title,
    p_poster_path => p_poster_path,
    p_backdrop_path => p_backdrop_path,
    p_payload => p_payload
  );
$function$;

-- Actor-parametrized core signatures are operational APIs only.
revoke execute on function public.collection_mark_watched(uuid, text, text, text, text, text, text, jsonb, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.collection_mark_watched(uuid, text, text, text, text, text, text, jsonb, timestamptz, text)
  to service_role;

revoke execute on function public.collection_remove_like(uuid, text)
  from public, anon, authenticated;
grant execute on function public.collection_remove_like(uuid, text)
  to service_role;

revoke execute on function public.collection_remove_watched(uuid, text)
  from public, anon, authenticated;
grant execute on function public.collection_remove_watched(uuid, text)
  to service_role;

revoke execute on function public.collection_remove_watchlist(uuid, text)
  from public, anon, authenticated;
grant execute on function public.collection_remove_watchlist(uuid, text)
  to service_role;

revoke execute on function public.collection_toggle_like(uuid, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.collection_toggle_like(uuid, text, text, text, text, text, text, jsonb)
  to service_role;

revoke execute on function public.collection_toggle_list_item(uuid, uuid, text, text, text, text, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.collection_toggle_list_item(uuid, uuid, text, text, text, text, text, text, jsonb, integer)
  to service_role;

revoke execute on function public.collection_toggle_watchlist(uuid, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.collection_toggle_watchlist(uuid, text, text, text, text, text, text, jsonb)
  to service_role;

-- JWT-owned overloads are the complete browser mutation surface.
revoke execute on function public.collection_mark_watched(text, text, text, text, text, text, jsonb, timestamptz, text)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_mark_watched(text, text, text, text, text, text, jsonb, timestamptz, text)
  to authenticated;

revoke execute on function public.collection_remove_like(text)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_remove_like(text)
  to authenticated;

revoke execute on function public.collection_remove_watched(text)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_remove_watched(text)
  to authenticated;

revoke execute on function public.collection_remove_watchlist(text)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_remove_watchlist(text)
  to authenticated;

revoke execute on function public.collection_toggle_like(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_toggle_like(text, text, text, text, text, text, jsonb)
  to authenticated;

revoke execute on function public.collection_toggle_list_item(uuid, text, text, text, text, text, text, jsonb, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_toggle_list_item(uuid, text, text, text, text, text, text, jsonb, integer)
  to authenticated;

revoke execute on function public.collection_toggle_watchlist(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.collection_toggle_watchlist(text, text, text, text, text, text, jsonb)
  to authenticated;

notify pgrst, 'reload schema';

commit;
