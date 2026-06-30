begin;

alter table public.settings
  add column if not exists buffet_paying_age integer not null default 7;

alter table public.settings
  drop constraint if exists settings_buffet_paying_age_check;

alter table public.settings
  add constraint settings_buffet_paying_age_check
  check (buffet_paying_age between 1 and 18);

commit;
