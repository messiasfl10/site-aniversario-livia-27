-- ============================================================
-- Verification: claim-invite support
-- ============================================================
--
-- Every row returned by this script should have check_passed = true.

select
  'invite_login_attempts exists' as check_name,
  to_regclass('public.invite_login_attempts') is not null as check_passed;

select
  'invite_login_attempts has RLS enabled' as check_name,
  c.relrowsecurity as check_passed
from pg_class as c
inner join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'invite_login_attempts';

select
  'invite_login_attempts has no direct client grants' as check_name,
  not (
    has_table_privilege('anon', 'public.invite_login_attempts', 'select')
    or has_table_privilege('anon', 'public.invite_login_attempts', 'insert')
    or has_table_privilege(
      'authenticated',
      'public.invite_login_attempts',
      'select'
    )
    or has_table_privilege(
      'authenticated',
      'public.invite_login_attempts',
      'insert'
    )
  ) as check_passed;

select
  'register_guest_access is service-role only' as check_name,
  not has_function_privilege(
    'anon',
    'public.register_guest_access(uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.register_guest_access(uuid)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.register_guest_access(uuid)',
    'execute'
  ) as check_passed;

select
  'service_role can manage invite login attempts' as check_name,
  has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'select, insert, update, delete'
  )
  and has_sequence_privilege(
    'service_role',
    'public.invite_login_attempts_id_seq',
    'usage, select'
  ) as check_passed;

select
  'service_role can read and update guests' as check_name,
  has_table_privilege(
    'service_role',
    'public.guests',
    'select, update'
  ) as check_passed;
