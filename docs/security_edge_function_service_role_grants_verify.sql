-- ============================================================
-- Verification: Edge Function service role grants
-- ============================================================
--
-- Every row should have check_passed = true.

select
  'service_role can manage guest access sessions' as check_name,
  has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'select, insert, update, delete'
  ) as check_passed;

select
  'service_role can manage invite login attempts' as check_name,
  has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'select, insert, update, delete'
  ) as check_passed;

select
  'service_role can use invite login attempts sequence' as check_name,
  has_sequence_privilege(
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

select
  'service_role can register guest access' as check_name,
  has_function_privilege(
    'service_role',
    'public.register_guest_access(uuid)',
    'execute'
  ) as check_passed;
