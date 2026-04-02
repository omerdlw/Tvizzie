alter table public.auth_challenges
add column if not exists signup_completed_at timestamptz;