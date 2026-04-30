create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net;

select pgmq.create('tvizzie_app_events')
where not exists (
  select 1
  from pgmq.meta
  where queue_name = 'tvizzie_app_events'
);

create table if not exists public.search_quality_daily_rollups (
  rollup_date date not null,
  search_type text not null,
  search_scope text not null,
  query_count integer not null default 0,
  distinct_query_count integer not null default 0,
  empty_result_count integer not null default 0,
  slow_query_count integer not null default 0,
  low_quality_event_count integer not null default 0,
  low_quality_sample_count integer not null default 0,
  error_count integer not null default 0,
  avg_duration_ms numeric(10, 2) not null default 0,
  p95_duration_ms numeric(10, 2) not null default 0,
  max_duration_ms integer not null default 0,
  result_count integer not null default 0,
  total_results integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (rollup_date, search_type, search_scope)
);

alter table public.search_quality_daily_rollups enable row level security;

create policy "search_quality_daily_rollups_service_role_all"
  on public.search_quality_daily_rollups
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists search_quality_daily_rollups_date_idx
  on public.search_quality_daily_rollups (rollup_date desc);

create or replace function public.refresh_search_quality_daily_rollups(
  p_since timestamptz default now() - interval '14 days'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer := 0;
begin
  with aggregate_rows as (
    select
      sqe.created_at::date as rollup_date,
      sqe.search_type,
      sqe.search_scope,
      count(*)::integer as query_count,
      count(distinct sqe.normalized_query)::integer as distinct_query_count,
      count(*) filter (where sqe.empty_results)::integer as empty_result_count,
      count(*) filter (where sqe.slow_query)::integer as slow_query_count,
      count(*) filter (where sqe.low_quality_count > 0)::integer as low_quality_event_count,
      coalesce(sum(sqe.low_quality_count), 0)::integer as low_quality_sample_count,
      count(*) filter (where sqe.error_message is not null)::integer as error_count,
      coalesce(avg(sqe.duration_ms), 0)::numeric(10, 2) as avg_duration_ms,
      coalesce(percentile_cont(0.95) within group (order by sqe.duration_ms), 0)::numeric(10, 2) as p95_duration_ms,
      coalesce(max(sqe.duration_ms), 0)::integer as max_duration_ms,
      coalesce(sum(sqe.result_count), 0)::integer as result_count,
      coalesce(sum(sqe.total_results), 0)::integer as total_results
    from public.search_quality_events sqe
    where sqe.created_at >= p_since
    group by sqe.created_at::date, sqe.search_type, sqe.search_scope
  ),
  upserted as (
    insert into public.search_quality_daily_rollups (
      rollup_date,
      search_type,
      search_scope,
      query_count,
      distinct_query_count,
      empty_result_count,
      slow_query_count,
      low_quality_event_count,
      low_quality_sample_count,
      error_count,
      avg_duration_ms,
      p95_duration_ms,
      max_duration_ms,
      result_count,
      total_results,
      updated_at
    )
    select
      rollup_date,
      search_type,
      search_scope,
      query_count,
      distinct_query_count,
      empty_result_count,
      slow_query_count,
      low_quality_event_count,
      low_quality_sample_count,
      error_count,
      avg_duration_ms,
      p95_duration_ms,
      max_duration_ms,
      result_count,
      total_results,
      now()
    from aggregate_rows
    on conflict (rollup_date, search_type, search_scope)
    do update set
      query_count = excluded.query_count,
      distinct_query_count = excluded.distinct_query_count,
      empty_result_count = excluded.empty_result_count,
      slow_query_count = excluded.slow_query_count,
      low_quality_event_count = excluded.low_quality_event_count,
      low_quality_sample_count = excluded.low_quality_sample_count,
      error_count = excluded.error_count,
      avg_duration_ms = excluded.avg_duration_ms,
      p95_duration_ms = excluded.p95_duration_ms,
      max_duration_ms = excluded.max_duration_ms,
      result_count = excluded.result_count,
      total_results = excluded.total_results,
      updated_at = now()
    returning 1
  )
  select count(*)::integer
  into affected_count
  from upserted;

  return affected_count;
end;
$$;

create or replace function public.cleanup_operational_events()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_search_events integer := 0;
  deleted_cron_runs integer := 0;
begin
  delete from public.search_quality_events
  where created_at < now() - interval '90 days';
  get diagnostics deleted_search_events = row_count;

  delete from cron.job_run_details
  where end_time < now() - interval '30 days';
  get diagnostics deleted_cron_runs = row_count;

  return jsonb_build_object(
    'deletedSearchQualityEvents', deleted_search_events,
    'deletedCronRuns', deleted_cron_runs
  );
end;
$$;

create or replace function public.enqueue_app_event(
  p_job_kind text,
  p_actor_user_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_source text default 'app',
  p_dedupe_key text default null,
  p_delay_seconds integer default 0
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg_id bigint;
  normalized_job_kind text := btrim(coalesce(p_job_kind, ''));
  normalized_event_type text := btrim(coalesce(p_event_type, ''));
begin
  if normalized_job_kind not in ('activity_event', 'notification_event') then
    raise exception 'unsupported app event job kind: %', normalized_job_kind;
  end if;

  if p_actor_user_id is null or normalized_event_type = '' then
    raise exception 'invalid app event input';
  end if;

  select sent.msg_id
  into msg_id
  from pgmq.send(
    'tvizzie_app_events',
    jsonb_build_object(
      'jobKind', normalized_job_kind,
      'actorUserId', p_actor_user_id,
      'eventType', normalized_event_type,
      'payload', coalesce(p_payload, '{}'::jsonb),
      'source', btrim(coalesce(p_source, 'app')),
      'dedupeKey', nullif(btrim(coalesce(p_dedupe_key, '')), ''),
      'enqueuedAt', now()
    ),
    greatest(0, coalesce(p_delay_seconds, 0))
  ) as sent(msg_id);

  return msg_id;
end;
$$;

create or replace function public.read_app_event_queue(
  p_qty integer default 10,
  p_visibility_timeout_seconds integer default 60
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    msg.msg_id,
    msg.read_ct,
    msg.enqueued_at,
    msg.vt,
    msg.message
  from pgmq.read(
    'tvizzie_app_events',
    greatest(1, coalesce(p_visibility_timeout_seconds, 60)),
    least(50, greatest(1, coalesce(p_qty, 10)))
  ) as msg;
$$;

create or replace function public.complete_app_event_queue_message(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.delete('tvizzie_app_events', p_msg_id);
$$;

create or replace function public.archive_app_event_queue_message(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.archive('tvizzie_app_events', p_msg_id);
$$;

create or replace function public.invoke_app_event_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_base_url text;
  internal_token text;
  request_id bigint;
begin
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
$$;

grant execute on function public.refresh_search_quality_daily_rollups(timestamptz) to service_role;
grant execute on function public.cleanup_operational_events() to service_role;
grant execute on function public.enqueue_app_event(text, uuid, text, jsonb, text, text, integer) to service_role;
grant execute on function public.read_app_event_queue(integer, integer) to service_role;
grant execute on function public.complete_app_event_queue_message(bigint) to service_role;
grant execute on function public.archive_app_event_queue_message(bigint) to service_role;
grant execute on function public.invoke_app_event_worker() to service_role;

revoke execute on function public.refresh_search_quality_daily_rollups(timestamptz) from public, anon, authenticated;
revoke execute on function public.cleanup_operational_events() from public, anon, authenticated;
revoke execute on function public.enqueue_app_event(text, uuid, text, jsonb, text, text, integer) from public, anon, authenticated;
revoke execute on function public.read_app_event_queue(integer, integer) from public, anon, authenticated;
revoke execute on function public.complete_app_event_queue_message(bigint) from public, anon, authenticated;
revoke execute on function public.archive_app_event_queue_message(bigint) from public, anon, authenticated;
revoke execute on function public.invoke_app_event_worker() from public, anon, authenticated;

select cron.schedule(
  'tvizzie-app-event-worker',
  '* * * * *',
  $$ select public.invoke_app_event_worker(); $$
);

select cron.schedule(
  'tvizzie-search-quality-daily-rollup',
  '15 3 * * *',
  $$ select public.refresh_search_quality_daily_rollups(now() - interval '14 days'); $$
);

select cron.schedule(
  'tvizzie-operational-cleanup',
  '30 3 * * 0',
  $$ select public.cleanup_operational_events(); $$
);
