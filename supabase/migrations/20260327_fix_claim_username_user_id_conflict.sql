-- Fix username claim upsert to target the per-user unique key.
-- This prevents `duplicate key value violates unique constraint "usernames_user_id_key"`
-- when a user changes username.

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
  on conflict (user_id)
  do update
    set username = excluded.username,
        username_lower = excluded.username_lower,
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