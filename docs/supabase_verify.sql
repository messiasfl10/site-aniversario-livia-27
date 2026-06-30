-- Todas as consultas devem retornar zero linhas, exceto o resumo final.
select tablename from pg_tables where schemaname='public' and tablename in ('gifts','gift_contributions');
select routine_name from information_schema.routines where routine_schema='public' and routine_name ilike '%gift%';
select policyname from pg_policies where schemaname='public' and (tablename ilike '%gift%' or policyname ilike '%gift%');

select
  to_regclass('public.guests') is not null as guests_ok,
  to_regclass('public.rsvps') is not null as rsvps_ok,
  to_regclass('public.settings') is not null as settings_ok,
  to_regclass('public.admin_users') is not null as admins_ok,
  to_regclass('public.guest_access_sessions') is not null as sessions_ok,
  to_regclass('public.invite_login_attempts') is not null as rate_limit_ok,
  to_regprocedure('public.get_current_guest_profile()') is not null as profile_rpc_ok,
  to_regprocedure('public.save_current_rsvp(text,text,jsonb,text,text,text)') is not null as rsvp_rpc_ok;
