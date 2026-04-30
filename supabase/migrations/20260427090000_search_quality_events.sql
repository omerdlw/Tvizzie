create table if not exists public.search_quality_events (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null,
  query_length integer not null default 0,
  search_type text not null default 'movie',
  search_scope text not null default 'preview',
  page integer not null default 1,
  status integer not null default 200,
  duration_ms integer not null default 0,
  result_count integer not null default 0,
  total_results integer not null default 0,
  empty_results boolean not null default false,
  slow_query boolean not null default false,
  low_quality_count integer not null default 0,
  low_quality_samples jsonb not null default '[]'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.search_quality_events enable row level security;

create policy "search_quality_events_service_role_all"
  on public.search_quality_events
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists search_quality_events_created_at_idx
  on public.search_quality_events (created_at desc);

create index if not exists search_quality_events_query_idx
  on public.search_quality_events (normalized_query, created_at desc);

create index if not exists search_quality_events_empty_idx
  on public.search_quality_events (created_at desc)
  where empty_results = true;

create index if not exists search_quality_events_slow_idx
  on public.search_quality_events (created_at desc)
  where slow_query = true;

create index if not exists search_quality_events_low_quality_idx
  on public.search_quality_events (created_at desc)
  where low_quality_count > 0;
