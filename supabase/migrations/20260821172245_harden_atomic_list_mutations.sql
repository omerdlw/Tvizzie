begin;

-- The legacy no-items create contract is server-only. It remains available for
-- operational callers, but now enforces the same actor invariant as all other
-- privileged mutations.
create or replace function public.list_create_atomic(
  p_user_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_poster_path text,
  p_payload jsonb
)
returns table(
  id uuid,
  user_id uuid,
  slug text,
  title text,
  description text,
  poster_path text,
  likes_count integer,
  reviews_count integer,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_list_id uuid := gen_random_uuid();
  v_row public.lists%rowtype;
begin
  perform public.assert_infra_actor(p_user_id);

  if p_title is null or btrim(p_title) = '' then
    raise exception 'TITLE_REQUIRED';
  end if;

  insert into public.lists (
    id,
    user_id,
    slug,
    title,
    description,
    poster_path,
    likes_count,
    reviews_count,
    payload,
    created_at,
    updated_at
  )
  values (
    v_list_id,
    p_user_id,
    coalesce(nullif(btrim(p_slug), ''), 'list'),
    btrim(p_title),
    coalesce(p_description, ''),
    nullif(btrim(coalesce(p_poster_path, '')), ''),
    0,
    0,
    coalesce(p_payload, '{}'::jsonb),
    v_now,
    v_now
  )
  returning * into v_row;

  perform public.profile_counter_apply_delta(
    p_user_id := p_user_id,
    p_lists_delta := 1
  );

  return query
  select
    v_row.id,
    v_row.user_id,
    v_row.slug,
    v_row.title,
    v_row.description,
    v_row.poster_path,
    v_row.likes_count,
    v_row.reviews_count,
    v_row.payload,
    v_row.created_at,
    v_row.updated_at;
end;
$function$;

-- List, initial items, and the profile counter now commit or roll back as one
-- transaction. The user id remains in the wire contract for compatibility but
-- is always checked against the authenticated JWT by assert_infra_actor().
create or replace function public.list_create_with_items_atomic(
  p_user_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_poster_path text,
  p_payload jsonb,
  p_items jsonb default '[]'::jsonb
)
returns table(
  id uuid,
  user_id uuid,
  slug text,
  title text,
  description text,
  poster_path text,
  likes_count integer,
  reviews_count integer,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_list_id uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
  v_row public.lists%rowtype;
begin
  perform public.assert_infra_actor(p_user_id);

  if p_title is null or btrim(p_title) = '' then
    raise exception 'TITLE_REQUIRED';
  end if;

  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'LIST_ITEMS_MUST_BE_AN_ARRAY';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_items) as item
    where nullif(btrim(item->>'media_key'), '') is null
  ) then
    raise exception 'MEDIA_KEY_REQUIRED';
  end if;

  insert into public.lists (
    id,
    user_id,
    slug,
    title,
    description,
    poster_path,
    likes_count,
    reviews_count,
    payload,
    created_at,
    updated_at
  )
  values (
    v_list_id,
    p_user_id,
    coalesce(nullif(btrim(p_slug), ''), 'list'),
    btrim(p_title),
    coalesce(p_description, ''),
    nullif(btrim(coalesce(p_poster_path, '')), ''),
    0,
    0,
    coalesce(p_payload, '{}'::jsonb),
    v_now,
    v_now
  )
  returning * into v_row;

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
  select
    v_list_id,
    p_user_id,
    btrim(item->>'media_key'),
    nullif(btrim(item->>'entity_id'), ''),
    nullif(btrim(item->>'entity_type'), ''),
    nullif(btrim(item->>'title'), ''),
    nullif(btrim(item->>'poster_path'), ''),
    nullif(btrim(item->>'backdrop_path'), ''),
    (nullif(item->>'position', ''))::integer,
    coalesce(item->'payload', '{}'::jsonb),
    v_now,
    v_now
  from jsonb_array_elements(v_items) as item;

  perform public.profile_counter_apply_delta(
    p_user_id := p_user_id,
    p_lists_delta := 1
  );

  return query
  select
    v_row.id,
    v_row.user_id,
    v_row.slug,
    v_row.title,
    v_row.description,
    v_row.poster_path,
    v_row.likes_count,
    v_row.reviews_count,
    v_row.payload,
    v_row.created_at,
    v_row.updated_at;
end;
$function$;

-- Child rows use ON DELETE CASCADE. Polymorphic review likes and activity rows
-- have no foreign key to lists, so remove them explicitly in the same lock and
-- transaction before deleting the list.
create or replace function public.list_delete_cascade(
  p_user_id uuid,
  p_list_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted_count integer := 0;
begin
  perform public.assert_infra_actor(p_user_id);

  if p_list_id is null then
    raise exception 'LIST_ID_REQUIRED';
  end if;

  perform 1
  from public.lists
  where id = p_list_id
    and user_id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  delete from public.review_likes
  where media_key = 'list:' || p_user_id::text || ':' || p_list_id::text;

  delete from public.activity
  where payload->'subject'->>'type' = 'list'
    and payload->'subject'->>'id' = p_list_id::text;

  delete from public.lists
  where id = p_list_id
    and user_id = p_user_id;
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 0 then
    perform public.profile_counter_apply_delta(
      p_user_id := p_user_id,
      p_lists_delta := -1
    );
  end if;

  return v_deleted_count > 0;
end;
$function$;

-- Browser clients no longer call these internal/server-only contracts.
revoke execute on function public.list_create_atomic(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.list_create_atomic(uuid, text, text, text, text, jsonb)
  to service_role;

revoke execute on function public.profile_counter_apply_delta(uuid, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.profile_counter_apply_delta(uuid, integer, integer, integer, integer, integer, integer)
  to service_role;

revoke execute on function public.collection_toggle_list_like(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.collection_toggle_list_like(uuid, uuid, uuid)
  to service_role;

revoke execute on function public.list_create_with_items_atomic(uuid, text, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.list_create_with_items_atomic(uuid, text, text, text, text, jsonb, jsonb)
  to authenticated, service_role;

revoke execute on function public.list_delete_cascade(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_delete_cascade(uuid, uuid)
  to authenticated, service_role;

commit;
