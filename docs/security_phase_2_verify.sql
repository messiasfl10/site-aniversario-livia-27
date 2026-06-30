-- ============================================================
-- Verification: security phase 2 preparation
-- ============================================================
--
-- Every row returned by this script should have check_passed = true.

select
  'admin_users exists' as check_name,
  to_regclass('public.admin_users') is not null as check_passed;

select
  'guest_access_sessions exists' as check_name,
  to_regclass('public.guest_access_sessions') is not null as check_passed;

select
  format('%s has RLS enabled', c.relname) as check_name,
  c.relrowsecurity as check_passed
from pg_class as c
inner join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('admin_users', 'guest_access_sessions')
order by c.relname;

select
  format('%s has no direct client grants', table_name) as check_name,
  not (
    has_table_privilege('anon', format('public.%I', table_name), 'select')
    or has_table_privilege('anon', format('public.%I', table_name), 'insert')
    or has_table_privilege('anon', format('public.%I', table_name), 'update')
    or has_table_privilege('anon', format('public.%I', table_name), 'delete')
    or has_table_privilege('authenticated', format('public.%I', table_name), 'select')
    or has_table_privilege('authenticated', format('public.%I', table_name), 'insert')
    or has_table_privilege('authenticated', format('public.%I', table_name), 'update')
    or has_table_privilege('authenticated', format('public.%I', table_name), 'delete')
  ) as check_passed
from (
  values ('admin_users'), ('guest_access_sessions')
) as internal_tables(table_name);

select
  format('%s is authenticated-only', function_name) as check_name,
  not has_function_privilege(
    'anon',
    format('public.%I()', function_name),
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    format('public.%I()', function_name),
    'execute'
  ) as check_passed
from (
  values ('current_guest_id'), ('is_admin')
) as helper_functions(function_name);

select
  'service_role can manage guest access sessions' as check_name,
  has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'select, insert, update, delete'
  ) as check_passed;
