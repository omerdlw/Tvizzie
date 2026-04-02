drop policy if exists "diary_entries_select_visible" on public.diary_entries;
drop policy if exists "diary_entries_write_own" on public.diary_entries;

drop trigger if exists set_diary_entries_updated_at on public.diary_entries;

drop index if exists public.diary_entries_user_watched_idx;

drop table if exists public.diary_entries;

alter table if exists public.profiles
drop column if exists diary_count,
drop column if exists last_diary_at;
