-- ============================================================
-- Supabase rebuild: final verification
-- ============================================================
--
-- Every row returned by this script should have check_passed = true.

select
  format('%s exists', expected.object_name) as check_name,
  to_regclass(expected.object_name) is not null as check_passed
from (
  values
    ('public.guests'),
    ('public.rsvps'),
    ('public.gifts'),
    ('public.gift_contributions'),
    ('public.settings'),
    ('public.admin_users'),
    ('public.guest_access_sessions'),
    ('public.invite_login_attempts')
) as expected(object_name);

select
  format('%s has RLS enabled', c.relname) as check_name,
  c.relrowsecurity as check_passed
from pg_class as c
inner join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'guests',
    'rsvps',
    'gifts',
    'gift_contributions',
    'settings',
    'admin_users',
    'guest_access_sessions',
    'invite_login_attempts'
  )
order by c.relname;

select
  format('%s exists', expected.function_name) as check_name,
  to_regprocedure(expected.function_name) is not null as check_passed
from (
  values
    ('public.current_guest_id()'),
    ('public.is_admin()'),
    ('public.register_guest_access(uuid)'),
    ('public.get_current_guest_profile()'),
    ('public.get_gift_catalog()'),
    ('public.save_current_rsvp(text,text,text,text,text,jsonb)'),
    ('public.reserve_gift(uuid,text)'),
    ('public.set_gift_purchase_method(uuid,text,jsonb)'),
    ('public.report_gift_payment(uuid)'),
    ('public.reserve_gift_quotas(uuid,text,integer)'),
    ('public.report_gift_contribution_payment(uuid)'),
    ('public.recalculate_quota_gift_status(uuid)')
) as expected(function_name);

select
  format(
    '%s policy exists on %s',
    expected.policy_name,
    expected.table_name
  ) as check_name,
  exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = expected.table_name
      and policy.policyname = expected.policy_name
  ) as check_passed
from (
  values
    ('guests', 'guests_admin_all'),
    ('guests', 'guests_select_own'),
    ('rsvps', 'rsvps_admin_all'),
    ('rsvps', 'rsvps_select_own'),
    ('gifts', 'gifts_admin_all'),
    ('gifts', 'gifts_select_accessible'),
    ('gift_contributions', 'gift_contributions_admin_all'),
    ('gift_contributions', 'gift_contributions_select_own'),
    ('settings', 'settings_admin_all'),
    ('settings', 'settings_select_authenticated')
) as expected(table_name, policy_name);

select
  format(
    '%s trigger exists on %s',
    expected.trigger_name,
    expected.table_name
  ) as check_name,
  exists (
    select 1
    from pg_trigger as trigger
    inner join pg_class as relation
      on relation.oid = trigger.tgrelid
    inner join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where trigger.tgname = expected.trigger_name
      and not trigger.tgisinternal
      and namespace.nspname = 'public'
      and relation.relname = expected.table_name
  ) as check_passed
from (
  values
    ('rsvps', 'sync_guest_confirmation_after_rsvp'),
    ('gift_contributions', 'sync_quota_gift_after_contribution'),
    ('gifts', 'sync_quota_gift_after_definition_change')
) as expected(table_name, trigger_name);

select
  'anon has no direct access to application tables' as check_name,
  not exists (
    select 1
    from (
      values
        ('guests'),
        ('rsvps'),
        ('gifts'),
        ('gift_contributions'),
        ('settings')
    ) as application_tables(table_name)
    where has_table_privilege(
      'anon',
      format('public.%I', table_name),
      'select, insert, update, delete'
    )
  ) as check_passed;

select
  'service_role can operate claim-invite dependencies' as check_name,
  has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'insert'
  )
  and has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'update'
  )
  and has_table_privilege(
    'service_role',
    'public.guest_access_sessions',
    'delete'
  )
  and has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'insert'
  )
  and has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'update'
  )
  and has_table_privilege(
    'service_role',
    'public.invite_login_attempts',
    'delete'
  )
  and has_table_privilege(
    'service_role',
    'public.guests',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'public.guests',
    'update'
  )
  and has_sequence_privilege(
    'service_role',
    'public.invite_login_attempts_id_seq',
    'usage'
  )
  and has_sequence_privilege(
    'service_role',
    'public.invite_login_attempts_id_seq',
    'select'
  )
  and has_function_privilege(
    'service_role',
    'public.register_guest_access(uuid)',
    'execute'
  ) as check_passed;

select
  'admin_users contains an active administrator' as check_name,
  exists (
    select 1
    from public.admin_users
    where active is true
  ) as check_passed;

select
  'settings contains complete payment information' as check_name,
  exists (
    select 1
    from public.settings
    where nullif(btrim(pix_key), '') is not null
      and nullif(btrim(merchant_name), '') is not null
      and nullif(btrim(merchant_city), '') is not null
      and nullif(btrim(whatsapp_number), '') is not null
      and buffet_paying_age between 1 and 18
  ) as check_passed;
