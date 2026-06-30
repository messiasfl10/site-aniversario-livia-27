-- ============================================================
-- Security phase 2: authentication support structures
-- Site de Casamento - Livia & Messias
-- ============================================================
--
-- This migration is intentionally non-disruptive:
-- - it does not enable RLS on the existing application tables;
-- - it does not revoke the permissions currently used by the frontend;
-- - it only creates the structures required by the new authentication flow.
--
-- Apply this file before changing the frontend authentication.

begin;

-- ============================================================
-- Administrator accounts
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid not null,
  guest_id uuid not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),

  constraint admin_users_pkey primary key (user_id),
  constraint admin_users_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade,
  constraint admin_users_guest_id_fkey
    foreign key (guest_id)
    references public.guests(id)
    on delete restrict,
  constraint admin_users_guest_id_key unique (guest_id)
);

comment on table public.admin_users is
  'Links Supabase Auth users to active administrator accounts.';

-- ============================================================
-- Guest access sessions
-- ============================================================

create table if not exists public.guest_access_sessions (
  user_id uuid not null,
  guest_id uuid not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  last_access timestamp with time zone not null default timezone('utc'::text, now()),
  revoked_at timestamp with time zone null,

  constraint guest_access_sessions_pkey primary key (user_id),
  constraint guest_access_sessions_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade,
  constraint guest_access_sessions_guest_id_fkey
    foreign key (guest_id)
    references public.guests(id)
    on delete cascade
);

create index if not exists guest_access_sessions_guest_id_idx
  on public.guest_access_sessions (guest_id);

create index if not exists guest_access_sessions_active_guest_idx
  on public.guest_access_sessions (guest_id)
  where revoked_at is null;

comment on table public.guest_access_sessions is
  'Links an authenticated anonymous Supabase user to one wedding invitation.';

-- ============================================================
-- Authorization helpers
-- ============================================================

create or replace function public.current_guest_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select access_link.guest_id
  from (
    select administrator.guest_id, 0 as priority
    from public.admin_users as administrator
    where administrator.user_id = (select auth.uid())
      and administrator.active is true

    union all

    select session.guest_id, 1 as priority
    from public.guest_access_sessions as session
    where session.user_id = (select auth.uid())
      and session.revoked_at is null
  ) as access_link
  inner join public.guests as guest
    on guest.id = access_link.guest_id
  where guest.active is true
  order by access_link.priority
  limit 1;
$$;

comment on function public.current_guest_id() is
  'Returns the active guest linked to the current Supabase Auth session.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as administrator
    where administrator.user_id = (select auth.uid())
      and administrator.active is true
  );
$$;

comment on function public.is_admin() is
  'Returns whether the current Supabase Auth user is an active administrator.';

-- The helper functions are available only to authenticated sessions.
revoke all on function public.current_guest_id() from public;
revoke all on function public.current_guest_id() from anon;
grant execute on function public.current_guest_id() to authenticated;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- Protect the new internal tables immediately
-- ============================================================

alter table public.admin_users enable row level security;
alter table public.guest_access_sessions enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.guest_access_sessions from anon, authenticated;

grant select, insert, update, delete
  on table public.guest_access_sessions
  to service_role;

-- No direct policies are created here. These tables are managed by trusted
-- SQL/Edge Function operations using the service role. Authenticated clients
-- consume only the authorization helper functions above.

commit;
