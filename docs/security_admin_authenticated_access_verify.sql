-- ============================================================
-- Verification: authenticated admin transitional access
-- ============================================================
--
-- Every row returned by this script should have check_passed = true.

select
  format('authenticated can use %s', table_name) as check_name,
  has_table_privilege(
    'authenticated',
    format('public.%I', table_name),
    'select'
  )
  and has_table_privilege(
    'authenticated',
    format('public.%I', table_name),
    'insert'
  )
  and has_table_privilege(
    'authenticated',
    format('public.%I', table_name),
    'update'
  )
  and has_table_privilege(
    'authenticated',
    format('public.%I', table_name),
    'delete'
  ) as check_passed
from (
  values
    ('guests'),
    ('rsvps'),
    ('gifts'),
    ('gift_contributions'),
    ('settings')
) as application_tables(table_name);
