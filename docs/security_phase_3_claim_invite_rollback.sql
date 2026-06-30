-- ============================================================
-- Rollback: claim-invite support
-- ============================================================

begin;

drop function if exists public.register_guest_access(uuid);
drop table if exists public.invite_login_attempts;

commit;
