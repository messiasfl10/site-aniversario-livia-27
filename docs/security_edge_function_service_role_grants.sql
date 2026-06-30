-- ============================================================
-- Edge Function service role grants
-- ============================================================
--
-- Required because bypassing RLS does not replace PostgreSQL table grants.

begin;

grant usage on schema public to service_role;

grant select, insert, update, delete
  on table public.guest_access_sessions
  to service_role;

grant select, insert, update, delete
  on table public.invite_login_attempts
  to service_role;

grant usage, select
  on sequence public.invite_login_attempts_id_seq
  to service_role;

grant select, update
  on table public.guests
  to service_role;

grant execute
  on function public.register_guest_access(uuid)
  to service_role;

commit;
