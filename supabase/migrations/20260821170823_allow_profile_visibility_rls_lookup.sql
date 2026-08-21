begin;

-- Existing list and collection RLS policies call can_view_private_content(),
-- which evaluates the profile visibility flag as the requesting role. Expose
-- only the owner key and visibility flag; email and private profile payloads
-- remain inaccessible through the Data API.
grant select (id, is_private) on table public.profiles to anon, authenticated;

commit;
