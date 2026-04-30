do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('match_media_embeddings', 'get_movie_embedding')
  loop
    execute format('drop function if exists %I.%I(%s)', fn.schema_name, fn.function_name, fn.identity_args);
  end loop;
end $$;

drop table if exists public.recommendation_events cascade;
drop table if exists public.user_taste_profiles cascade;
drop table if exists public.media_embeddings cascade;
