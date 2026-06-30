-- ============================================================
-- Security phase 4: activate final RLS enforcement
-- ============================================================
--
-- DO NOT RUN until:
-- - the public frontend uses Supabase Auth;
-- - login.js calls claim-invite;
-- - RSVP and gift mutations use the safe RPCs;
-- - the complete cutover smoke test is ready.

begin;

alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_contributions enable row level security;
alter table public.settings enable row level security;

revoke all on table public.guests from anon;
revoke all on table public.rsvps from anon;
revoke all on table public.gifts from anon;
revoke all on table public.gift_contributions from anon;
revoke all on table public.settings from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.guests
  to authenticated;
grant select, insert, update, delete on table public.rsvps
  to authenticated;
grant select, insert, update, delete on table public.gifts
  to authenticated;
grant select, insert, update, delete on table public.gift_contributions
  to authenticated;
grant select, insert, update, delete on table public.settings
  to authenticated;

commit;
