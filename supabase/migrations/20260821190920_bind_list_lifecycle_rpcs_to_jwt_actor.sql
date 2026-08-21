begin;

-- Public Data API contracts derive ownership from the verified JWT. Keep
-- the UUID-first procedures as service-role primitives for maintenance jobs and
-- runtime tests, but never let a browser choose the mutation actor.
create or replace function public.list_create_with_items_atomic(
  p_slug text,
  p_title text,
  p_description text,
  p_poster_path text,
  p_payload jsonb,
  p_items jsonb default '[]'::jsonb
)
returns table(
  id uuid,
  user_id uuid,
  slug text,
  title text,
  description text,
  poster_path text,
  likes_count integer,
  reviews_count integer,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select *
  from public.list_create_with_items_atomic(
    p_user_id := auth.uid(),
    p_slug := p_slug,
    p_title := p_title,
    p_description := p_description,
    p_poster_path := p_poster_path,
    p_payload := p_payload,
    p_items := p_items
  );
$function$;

create or replace function public.list_delete_cascade(
  p_list_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $function$
  select public.list_delete_cascade(
    p_user_id := auth.uid(),
    p_list_id := p_list_id
  );
$function$;

revoke execute on function public.list_create_with_items_atomic(uuid, text, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.list_create_with_items_atomic(uuid, text, text, text, text, jsonb, jsonb)
  to service_role;

revoke execute on function public.list_delete_cascade(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_delete_cascade(uuid, uuid)
  to service_role;

revoke execute on function public.list_create_with_items_atomic(text, text, text, text, jsonb, jsonb)
  from public, anon, service_role;
grant execute on function public.list_create_with_items_atomic(text, text, text, text, jsonb, jsonb)
  to authenticated;

revoke execute on function public.list_delete_cascade(uuid)
  from public, anon, service_role;
grant execute on function public.list_delete_cascade(uuid)
  to authenticated;

notify pgrst, 'reload schema';

commit;
