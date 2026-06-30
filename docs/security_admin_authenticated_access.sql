-- ============================================================
-- Transitional access for the authenticated admin frontend
-- ============================================================
--
-- Run this after implementing the Supabase Auth admin login and before the
-- final RLS policies are enabled.
--
-- Important:
-- This grant is temporary. Revoke these broad permissions before enabling
-- anonymous Supabase Auth sessions for guests. At that point, RLS policies
-- must distinguish administrators from guests.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.guests
  to authenticated;

grant select, insert, update, delete
  on table public.rsvps
  to authenticated;

grant select, insert, update, delete
  on table public.gifts
  to authenticated;

grant select, insert, update, delete
  on table public.gift_contributions
  to authenticated;

grant select, insert, update, delete
  on table public.settings
  to authenticated;

grant usage, select
  on all sequences in schema public
  to authenticated;

commit;
