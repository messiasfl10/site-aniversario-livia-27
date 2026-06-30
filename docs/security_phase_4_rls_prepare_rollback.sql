-- ============================================================
-- Rollback: remove prepared RLS policies and guest RPCs
-- ============================================================
--
-- Run only while RLS is still disabled and before the new public frontend is
-- using these functions.

begin;

drop policy if exists settings_select_authenticated on public.settings;
drop policy if exists settings_admin_all on public.settings;
drop policy if exists gift_contributions_select_own
  on public.gift_contributions;
drop policy if exists gift_contributions_admin_all
  on public.gift_contributions;
drop policy if exists gifts_select_accessible on public.gifts;
drop policy if exists gifts_admin_all on public.gifts;
drop policy if exists rsvps_update_own on public.rsvps;
drop policy if exists rsvps_insert_own on public.rsvps;
drop policy if exists rsvps_select_own on public.rsvps;
drop policy if exists rsvps_admin_all on public.rsvps;
drop policy if exists guests_select_own on public.guests;
drop policy if exists guests_admin_all on public.guests;

drop trigger if exists sync_quota_gift_after_definition_change
  on public.gifts;
drop trigger if exists sync_quota_gift_after_contribution
  on public.gift_contributions;
drop trigger if exists sync_guest_confirmation_after_rsvp
  on public.rsvps;

drop function if exists public.report_gift_contribution_payment(uuid);
drop function if exists public.reserve_gift_quotas(uuid, text, integer);
drop function if exists public.report_gift_payment(uuid);
drop function if exists public.set_gift_purchase_method(uuid, text, jsonb);
drop function if exists public.reserve_gift(uuid, text);
drop function if exists public.sync_quota_gift_after_definition_change();
drop function if exists public.sync_quota_gift_from_contribution();
drop function if exists public.recalculate_quota_gift_status(uuid);
drop function if exists public.save_current_rsvp(
  text,
  text,
  text,
  text,
  text,
  jsonb
);
drop function if exists public.sync_guest_confirmation_from_rsvp();
drop function if exists public.get_gift_catalog();
drop function if exists public.get_current_guest_profile();

drop index if exists public.rsvps_guest_id_key;

commit;
