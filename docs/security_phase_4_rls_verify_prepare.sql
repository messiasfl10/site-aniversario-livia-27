-- ============================================================
-- Verification: RLS preparation
-- ============================================================
--
-- Every row should have check_passed = true.

select
  format('%s remains with RLS disabled', c.relname) as check_name,
  not c.relrowsecurity as check_passed
from pg_class as c
inner join pg_namespace as n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'guests',
    'rsvps',
    'gifts',
    'gift_contributions',
    'settings'
  )
order by c.relname;

select
  format('%s policy exists', expected.policy_name) as check_name,
  exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.policyname = expected.policy_name
  ) as check_passed
from (
  values
    ('guests_admin_all'),
    ('guests_select_own'),
    ('rsvps_admin_all'),
    ('rsvps_select_own'),
    ('gifts_admin_all'),
    ('gifts_select_accessible'),
    ('gift_contributions_admin_all'),
    ('gift_contributions_select_own'),
    ('settings_admin_all'),
    ('settings_select_authenticated')
) as expected(policy_name);

select
  format('%s exists', expected.function_name) as check_name,
  to_regprocedure(expected.function_name) is not null as check_passed
from (
  values
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
  format('%s is authenticated-only', expected.function_name) as check_name,
  has_function_privilege(
    'authenticated',
    expected.function_name,
    'execute'
  )
  and not has_function_privilege(
    'anon',
    expected.function_name,
    'execute'
  ) as check_passed
from (
  values
    ('public.get_current_guest_profile()'),
    ('public.get_gift_catalog()'),
    ('public.save_current_rsvp(text,text,text,text,text,jsonb)'),
    ('public.reserve_gift(uuid,text)'),
    ('public.set_gift_purchase_method(uuid,text,jsonb)'),
    ('public.report_gift_payment(uuid)'),
    ('public.reserve_gift_quotas(uuid,text,integer)'),
    ('public.report_gift_contribution_payment(uuid)')
) as expected(function_name);

select
  'rsvps has one row at most per guest' as check_name,
  not exists (
    select guest_id
    from public.rsvps
    where guest_id is not null
    group by guest_id
    having count(*) > 1
  ) as check_passed;

select
  format('%s trigger exists', expected.trigger_name) as check_name,
  exists (
    select 1
    from pg_trigger as trigger
    where trigger.tgname = expected.trigger_name
      and not trigger.tgisinternal
  ) as check_passed
from (
  values
    ('sync_guest_confirmation_after_rsvp'),
    ('sync_quota_gift_after_contribution'),
    ('sync_quota_gift_after_definition_change')
) as expected(trigger_name);
