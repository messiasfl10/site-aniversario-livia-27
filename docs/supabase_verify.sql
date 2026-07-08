-- Todas as consultas devem retornar zero linhas, exceto o resumo final.
select tablename from pg_tables where schemaname='public' and tablename in ('gifts','gift_contributions');
select routine_name from information_schema.routines where routine_schema='public' and routine_name ilike '%gift%';
select policyname from pg_policies where schemaname='public' and (tablename ilike '%gift%' or policyname ilike '%gift%');

select
  to_regclass('public.guests') is not null as guests_ok,
  to_regclass('public.rsvps') is not null as rsvps_ok,
  to_regclass('public.admin_users') is not null as admins_ok,
  to_regclass('public.guest_access_sessions') is not null as sessions_ok,
  to_regclass('public.invite_login_attempts') is not null as rate_limit_ok,
  to_regclass('public.rsvp_email_deliveries') is not null as email_delivery_log_ok,
  exists(
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='guests'
      and column_name='invite_sent'
      and data_type='boolean'
  ) as invite_sent_column_ok,
  (select relrowsecurity from pg_class where oid = 'public.rsvp_email_deliveries'::regclass) as email_delivery_rls_ok,
  not has_table_privilege('authenticated', 'public.rsvp_email_deliveries', 'SELECT') as email_delivery_private_ok,
  to_regprocedure('public.get_current_guest_profile()') is not null as profile_rpc_ok,
  to_regprocedure('public.create_guest_with_invite(text,text,jsonb,integer,boolean)') is not null as secure_invite_rpc_ok,
  to_regprocedure('public.update_guest_details(uuid,text,text,jsonb,integer,boolean)') is not null as update_guest_rpc_ok,
  to_regprocedure('public.set_guest_invite_sent(uuid,boolean)') is not null as invite_sent_rpc_ok,
  to_regprocedure('public.set_guest_active(uuid,boolean)') is not null as guest_status_rpc_ok,
  to_regprocedure('public.save_admin_rsvp(uuid,text,text,jsonb,text,text,text)') is not null as admin_rsvp_rpc_ok,
  to_regprocedure('public.delete_admin_rsvp(uuid)') is not null as delete_rsvp_rpc_ok,
  to_regprocedure('public.save_current_rsvp(text,text,jsonb,text,text,text)') is not null as rsvp_rpc_ok;
