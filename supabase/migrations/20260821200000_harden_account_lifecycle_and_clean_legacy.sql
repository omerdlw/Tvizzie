begin;

-- 1. account_lifecycle least-privilege hardening
revoke all privileges on table public.account_lifecycle from public, anon, authenticated;
grant select, insert, update, delete on table public.account_lifecycle to service_role;

-- 2. Drop unused legacy tables and their indexes/constraints
drop table if exists public.favorites cascade;
drop table if exists public.auth_rate_limit_windows cascade;

-- 3. Modernize assert_infra_actor using auth.jwt() claims
create or replace function public.assert_infra_actor(p_user_id uuid)
returns void
language plpgsql
stable security definer
set search_path = ''
as $function$
declare
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(v_jwt->>'role', auth.role(), '');
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
$function$;

revoke execute on function public.assert_infra_actor(uuid) from public, anon, authenticated;
grant execute on function public.assert_infra_actor(uuid) to service_role;

-- 4. Queue-empty guard for 15-minute cron worker
create or replace function public.invoke_app_event_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  app_base_url text;
  internal_token text;
  request_id bigint;
  has_pending_messages boolean := false;
begin
  -- Queue guard: Henüz işlenmeyi bekleyen mesaj yoksa HTTP worker çağrısını atla
  select exists (
    select 1
    from pgmq.q_tvizzie_app_events
    where vt <= clock_timestamp()
    limit 1
  ) into has_pending_messages;

  if not has_pending_messages then
    return null;
  end if;

  select decrypted_secret
  into app_base_url
  from vault.decrypted_secrets
  where name = 'tvizzie_app_base_url'
  limit 1;

  select decrypted_secret
  into internal_token
  from vault.decrypted_secrets
  where name = 'infra_internal_token'
  limit 1;

  app_base_url := rtrim(coalesce(app_base_url, ''), '/');
  internal_token := btrim(coalesce(internal_token, ''));

  if app_base_url = '' or internal_token = '' then
    return null;
  end if;

  select net.http_post(
    url := app_base_url || '/api/internal/jobs/app-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-infra-internal-token', internal_token
    ),
    body := jsonb_build_object(
      'limit', 25,
      'source', 'supabase-cron'
    ),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$function$;

revoke execute on function public.invoke_app_event_worker() from public, anon, authenticated;
grant execute on function public.invoke_app_event_worker() to service_role;

notify pgrst, 'reload schema';

commit;
