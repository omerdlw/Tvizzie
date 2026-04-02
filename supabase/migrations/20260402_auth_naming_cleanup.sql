-- Auth naming cleanup: introduce canonical RPC names without _v2 suffix.
-- Keep underlying _v2 functions for backward compatibility during rollout.

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
  select *
  from public.auth_get_user_by_email_v2(p_email);
$$;

create or replace function public.auth_is_session_revoked(
  p_user_id uuid,
  p_session_jti text,
  p_iat timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.auth_is_session_revoked_v2(p_user_id, p_session_jti, p_iat);
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
  select public.auth_set_revocation_state_v2(
    p_user_id,
    p_revoke_before,
    p_exempt_session_jti,
    p_reason
  );
$$;

revoke all on function public.auth_get_user_by_email(text) from public, anon, authenticated;
revoke all on function public.auth_is_session_revoked(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.auth_set_revocation_state(uuid, timestamptz, text, text) from public, anon, authenticated;

grant execute on function public.auth_get_user_by_email(text) to service_role;
grant execute on function public.auth_is_session_revoked(uuid, text, timestamptz) to service_role;
grant execute on function public.auth_set_revocation_state(uuid, timestamptz, text, text) to service_role;
