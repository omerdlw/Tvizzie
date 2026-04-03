-- Fix: remove legacy collection_* overloads that conflict with named-arg RPC calls.
-- Run in Supabase SQL Editor.

begin;

-- Legacy wrappers with old parameter ordering (these cause ambiguity)
drop function if exists public.collection_toggle_like(
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
);

drop function if exists public.collection_toggle_watchlist(
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
);

drop function if exists public.collection_mark_watched(
  text,
  text,
  text,
  timestamp with time zone,
  text,
  jsonb,
  text,
  text,
  text,
  uuid
);

drop function if exists public.collection_remove_like(text, uuid);
drop function if exists public.collection_remove_watchlist(text, uuid);
drop function if exists public.collection_remove_watched(text, uuid);

drop function if exists public.collection_toggle_list_item(
  text,
  text,
  text,
  uuid,
  text,
  jsonb,
  integer,
  text,
  text,
  uuid
);

commit;

-- Optional verification: should return 0 rows
select proname, count(*) as overload_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'collection_toggle_like',
    'collection_toggle_watchlist',
    'collection_mark_watched',
    'collection_remove_like',
    'collection_remove_watchlist',
    'collection_remove_watched',
    'collection_toggle_list_item'
  )
group by proname
having count(*) > 1
order by proname;
