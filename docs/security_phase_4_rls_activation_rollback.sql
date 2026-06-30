-- ============================================================
-- Emergency rollback: disable active RLS and restore legacy access
-- ============================================================
--
-- This restores the old direct frontend access. Use only during the cutover
-- if the authenticated guest frontend cannot operate.

begin;

alter table public.guests disable row level security;
alter table public.rsvps disable row level security;
alter table public.gifts disable row level security;
alter table public.gift_contributions disable row level security;
alter table public.settings disable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.guests
  to anon, authenticated;
grant select, insert, update, delete on table public.rsvps
  to anon, authenticated;
grant select, insert, update, delete on table public.gifts
  to anon, authenticated;
grant select, insert, update, delete on table public.gift_contributions
  to anon, authenticated;
grant select, insert, update, delete on table public.settings
  to anon, authenticated;

commit;
