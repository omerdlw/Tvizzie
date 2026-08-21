begin;

-- account_lifecycle_state_check stores canonical uppercase states. The Auth
-- trigger previously inserted lowercase "active", causing every new Supabase
-- Auth user transaction to fail with SQLSTATE 23514.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_username text;
  v_display_name text;
  v_avatar_url text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'name',
    v_username
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (
    id,
    display_name,
    display_name_lower,
    email,
    username,
    username_lower,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_display_name,
    lower(v_display_name),
    new.email,
    v_username,
    lower(v_username),
    v_avatar_url,
    coalesce(new.created_at, now()),
    coalesce(new.created_at, now())
  )
  on conflict (id) do nothing;

  insert into public.profile_counters (
    user_id,
    likes_count,
    lists_count,
    watched_count,
    watchlist_count,
    follower_count,
    following_count,
    updated_at
  )
  values (
    new.id,
    0,
    0,
    0,
    0,
    0,
    0,
    coalesce(new.created_at, now())
  )
  on conflict (user_id) do nothing;

  insert into public.account_lifecycle (
    user_id,
    state,
    created_at,
    updated_at
  )
  values (
    new.id,
    'ACTIVE',
    coalesce(new.created_at, now()),
    coalesce(new.created_at, now())
  )
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user()
  to service_role;

commit;
