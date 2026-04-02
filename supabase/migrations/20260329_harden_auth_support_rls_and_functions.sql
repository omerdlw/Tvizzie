-- Harden auth support tables that should remain backend-only and
-- fix mutable search_path warnings on public helper functions.

alter table public.auth_challenges enable row level security;
alter table public.auth_audit_logs enable row level security;
alter table public.auth_rate_limit_windows enable row level security;

revoke all on table public.auth_challenges from anon, authenticated;
revoke all on table public.auth_audit_logs from anon, authenticated;
revoke all on table public.auth_rate_limit_windows from anon, authenticated;

drop policy if exists "No direct access to auth_challenges" on public.auth_challenges;
create policy "No direct access to auth_challenges"
  on public.auth_challenges
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No direct access to auth_audit_logs" on public.auth_audit_logs;
create policy "No direct access to auth_audit_logs"
  on public.auth_audit_logs
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No direct access to auth_rate_limit_windows" on public.auth_rate_limit_windows;
create policy "No direct access to auth_rate_limit_windows"
  on public.auth_rate_limit_windows
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.can_view_private_content(owner_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when owner_id is null then false
    when owner_id = auth.uid() then true
    when exists (
      select 1
      from public.profiles p
      where p.id = owner_id
        and p.is_private = false
    ) then true
    when auth.uid() is not null and exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = owner_id
        and f.status = 'accepted'
    ) then true
    else false
  end;
$$;

create or replace function public.list_owner_id(p_list_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select l.user_id
  from public.lists l
  where l.id = p_list_id;
$$;
