-- Keep account deletion bounded to one database transaction.
-- The application invokes this through the server-only service-role client.
create or replace function public.delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  -- Remove actor-only notifications before deleting the profile. Rows where
  -- the user is the recipient are removed by the profile cascade below.
  delete from public.notifications
  where actor_user_id = p_user_id;

  -- These tables are not owned by profiles and therefore need explicit
  -- cleanup in the same transaction.
  delete from public.auth_challenges where user_id = p_user_id;
  delete from public.auth_audit_logs where user_id = p_user_id;
  delete from public.auth_revocation_state where user_id = p_user_id;
  delete from public.feedback_submissions where user_id = p_user_id;
  delete from public.account_lifecycle where user_id = p_user_id;

  -- The profiles foreign-key cascades remove usernames, lists, collection
  -- rows, reviews, follows, notifications and counters for this user.
  delete from public.profiles where id = p_user_id;
end;
$function$;

revoke all on function public.delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
