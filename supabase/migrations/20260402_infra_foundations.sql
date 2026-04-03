-- Tvizzie infra foundations
-- Auth revocation primitives, O(1) auth identity lookup RPC, and account counters model.

create table if not exists public.auth_revocation_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revoke_before timestamptz not null,
  exempt_session_jti text,
  reason text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists auth_revocation_state_revoke_before_idx
  on public.auth_revocation_state(revoke_before desc);

alter table public.auth_revocation_state enable row level security;
revoke all on table public.auth_revocation_state from anon, authenticated;

drop policy if exists "No direct access to auth_revocation_state" on public.auth_revocation_state;
create policy "No direct access to auth_revocation_state"
  on public.auth_revocation_state
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.auth_get_user_by_email(p_email text)
returns table (
  id uuid,
  email text,
  app_metadata jsonb,
  user_metadata jsonb,
  email_confirmed_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  banned_until timestamptz,
  identities jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email,
    coalesce(u.raw_app_meta_data, '{}'::jsonb) as app_metadata,
    coalesce(u.raw_user_meta_data, '{}'::jsonb) as user_metadata,
    u.email_confirmed_at,
    u.confirmed_at,
    u.last_sign_in_at,
    u.created_at,
    u.banned_until,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'identity_data', i.identity_data,
            'provider', i.provider,
            'user_id', i.user_id,
            'created_at', i.created_at,
            'updated_at', i.updated_at
          )
        )
        from auth.identities i
        where i.user_id = u.id
      ),
      '[]'::jsonb
    ) as identities
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(p_email, '')))
  limit 1;
$$;

create or replace function public.auth_is_session_revoked(
  p_user_id uuid,
  p_session_jti text,
  p_iat timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_state public.auth_revocation_state%rowtype;
begin
  if p_user_id is null then
    return false;
  end if;

  select *
  into v_state
  from public.auth_revocation_state
  where user_id = p_user_id;

  if not found then
    return false;
  end if;

  if coalesce(trim(v_state.exempt_session_jti), '') <> ''
    and trim(coalesce(p_session_jti, '')) = trim(v_state.exempt_session_jti) then
    return false;
  end if;

  if p_iat is null then
    return true;
  end if;

  return p_iat < v_state.revoke_before;
end;
$$;

create or replace function public.auth_set_revocation_state(
  p_user_id uuid,
  p_revoke_before timestamptz default timezone('utc', now()),
  p_exempt_session_jti text default null,
  p_reason text default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.auth_revocation_state (
    user_id,
    revoke_before,
    exempt_session_jti,
    reason,
    updated_at
  )
  values (
    p_user_id,
    coalesce(p_revoke_before, timezone('utc', now())),
    nullif(trim(coalesce(p_exempt_session_jti, '')), ''),
    nullif(trim(coalesce(p_reason, '')), ''),
    timezone('utc', now())
  )
  on conflict (user_id) do update
    set revoke_before = excluded.revoke_before,
        exempt_session_jti = excluded.exempt_session_jti,
        reason = excluded.reason,
        updated_at = excluded.updated_at;
$$;

revoke all on function public.auth_get_user_by_email(text) from public, anon, authenticated;
revoke all on function public.auth_is_session_revoked(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.auth_set_revocation_state(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.auth_get_user_by_email(text) to service_role;
grant execute on function public.auth_is_session_revoked(uuid, text, timestamptz) to service_role;
grant execute on function public.auth_set_revocation_state(uuid, timestamptz, text, text) to service_role;

create table if not exists public.profile_counters (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  likes_count integer not null default 0,
  lists_count integer not null default 0,
  watched_count integer not null default 0,
  watchlist_count integer not null default 0,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profile_counters enable row level security;
revoke all on table public.profile_counters from anon, authenticated;

drop policy if exists "No direct access to profile_counters" on public.profile_counters;
create policy "No direct access to profile_counters"
  on public.profile_counters
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.refresh_profile_counters(p_user_id uuid)
returns public.profile_counters
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.profile_counters;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

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
    p_user_id,
    (select count(*)::integer from public.likes where user_id = p_user_id),
    (select count(*)::integer from public.lists where user_id = p_user_id),
    (select count(*)::integer from public.watched where user_id = p_user_id),
    (select count(*)::integer from public.watchlist where user_id = p_user_id),
    (select count(*)::integer from public.follows where following_id = p_user_id and status = 'accepted'),
    (select count(*)::integer from public.follows where follower_id = p_user_id and status = 'accepted'),
    timezone('utc', now())
  )
  on conflict (user_id) do update
    set likes_count = excluded.likes_count,
        lists_count = excluded.lists_count,
        watched_count = excluded.watched_count,
        watchlist_count = excluded.watchlist_count,
        follower_count = excluded.follower_count,
        following_count = excluded.following_count,
        updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.refresh_profile_counters(uuid) from public, anon, authenticated;
grant execute on function public.refresh_profile_counters(uuid) to service_role;
