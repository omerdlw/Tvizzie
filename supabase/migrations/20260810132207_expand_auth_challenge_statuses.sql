alter table public.auth_challenges drop constraint if exists auth_challenges_status_check;

alter table public.auth_challenges
  add constraint auth_challenges_status_check
  check (status = any (array['pending', 'used', 'processing', 'completed', 'expired', 'exhausted']));
