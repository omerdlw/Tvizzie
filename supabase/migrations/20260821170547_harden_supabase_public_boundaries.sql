begin;

-- Profiles are served through the application API so private fields and email
-- cannot be selected directly through the public Data API.
revoke all privileges on table public.profiles from anon, authenticated;

-- Server-side profile operations use service_role. Keep that contract explicit.
grant select, insert, update, delete on table public.profiles to service_role;

-- Prevent privileged functions from becoming public RPC endpoints by default.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

-- Browser RPCs with an explicit self-actor assertion remain available only to
-- authenticated users. Anonymous execution previously came through PUBLIC.
do $migration$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'collection_mark_watched',
        'collection_remove_like',
        'collection_remove_watched',
        'collection_remove_watchlist',
        'collection_toggle_like',
        'collection_toggle_list_item',
        'collection_toggle_list_like',
        'collection_toggle_watchlist',
        'list_create_atomic',
        'list_delete_cascade',
        'profile_counter_apply_delta'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_signature
    );
    execute format(
      'grant execute on function %s to authenticated, service_role',
      function_signature
    );
  end loop;
end
$migration$;

-- Internal, trigger-only, and server-authorized functions must not be callable
-- directly with a publishable key or an arbitrary authenticated JWT.
do $migration$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'abort_account_delete',
        'assert_infra_actor',
        'begin_account_delete',
        'claim_username',
        'complete_account_delete',
        'ensure_account_lifecycle',
        'follow_delete',
        'follow_mutate_atomic',
        'follow_upsert',
        'handle_new_user',
        'promote_pending_followers_to_accepted',
        'refresh_profile_counters',
        'review_delete_list',
        'review_toggle_like',
        'review_upsert_list',
        'review_upsert_media',
        'rls_auto_enable'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_signature
    );
    execute format(
      'grant execute on function %s to service_role',
      function_signature
    );
  end loop;
end
$migration$;

alter function public.cleanup_operational_events() set search_path = '';
alter function public.follow_mutate_atomic(text, uuid, uuid) set search_path = '';

-- Restore the repository contract that deletes a media review and its
-- polymorphic likes in one transaction.
create or replace function public.review_delete_media(
  p_user_id uuid,
  p_media_key text
)
returns table(out_deleted boolean, out_media_key text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  deleted_count integer := 0;
begin
  if p_user_id is null or nullif(btrim(p_media_key), '') is null then
    raise exception 'user_id and media_key are required';
  end if;

  perform public.assert_infra_actor(p_user_id);

  delete from public.media_reviews
  where user_id = p_user_id
    and media_key = p_media_key;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    delete from public.review_likes
    where review_user_id = p_user_id
      and media_key = p_media_key;
  end if;

  return query select deleted_count > 0, p_media_key;
end;
$function$;

revoke execute on function public.review_delete_media(uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_delete_media(uuid, text)
  to service_role;

-- A client may receive broadcasts only from its own authenticated topic.
drop policy if exists "authenticated_receive_own_live_updates"
  on realtime.messages;
create policy "authenticated_receive_own_live_updates"
  on realtime.messages
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and extension = 'broadcast'
    and (select realtime.topic()) = 'live-updates:' || (select auth.uid())::text
  );

commit;
