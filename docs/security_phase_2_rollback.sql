-- ============================================================
-- Rollback: security phase 2 preparation
-- ============================================================
--
-- Use only before the new authentication flow starts storing links in these
-- tables. This does not change any of the existing application tables.

begin;

drop function if exists public.is_admin();
drop function if exists public.current_guest_id();
drop table if exists public.guest_access_sessions;
drop table if exists public.admin_users;

commit;
