-- Tvizzie 2.0 - Auth support tables for Supabase-only backend flows

create table if not exists public.auth_challenges (
  challenge_key text primary key,
  purpose text not null,
  user_id uuid references auth.users(id) on delete cascade,
  email_hash text not null,
  code_hash text not null,
  salt text not null,
  jti text not null,
  dummy boolean not null default false,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  status text not null default 'pending'
    check (status in ('pending', 'used', 'expired', 'exhausted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  used_at timestamptz,
  password_reset_completed_at timestamptz,
  device_hash text,
  ip_hash text
);

create index if not exists auth_challenges_email_hash_idx
  on public.auth_challenges(email_hash);
create index if not exists auth_challenges_status_idx
  on public.auth_challenges(status);
create index if not exists auth_challenges_expires_idx
  on public.auth_challenges(expires_at);
create index if not exists auth_challenges_user_idx
  on public.auth_challenges(user_id);
create index if not exists auth_challenges_updated_idx
  on public.auth_challenges(updated_at);

create table if not exists public.auth_audit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc', now()),
  event_type text not null,
  status text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_id_hash text,
  email_hash text,
  email_masked text,
  ip_hash text,
  provider text,
  metadata jsonb,
  request_context jsonb
);

create index if not exists auth_audit_logs_created_idx
  on public.auth_audit_logs(created_at desc);
create index if not exists auth_audit_logs_event_idx
  on public.auth_audit_logs(event_type, created_at desc);
create index if not exists auth_audit_logs_user_hash_idx
  on public.auth_audit_logs(user_id_hash);
create index if not exists auth_audit_logs_email_hash_idx
  on public.auth_audit_logs(email_hash);

create table if not exists public.auth_rate_limit_windows (
  key_hash text primary key,
  namespace text not null,
  bucket_key text not null,
  dimension text not null,
  value_hash text not null,
  entries bigint[] not null default '{}'::bigint[],
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
);

create index if not exists auth_rate_limit_windows_expires_idx
  on public.auth_rate_limit_windows(expires_at);
create index if not exists auth_rate_limit_windows_namespace_idx
  on public.auth_rate_limit_windows(namespace, dimension);
