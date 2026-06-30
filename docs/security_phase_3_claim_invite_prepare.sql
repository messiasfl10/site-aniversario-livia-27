-- ============================================================
-- Security phase 3: claim-invite support
-- ============================================================
--
-- Creates the internal rate-limit table used by the claim-invite Edge
-- Function. This does not enable RLS on existing application tables.

begin;

create table if not exists public.invite_login_attempts (
  id bigint generated always as identity,
  user_id uuid not null,
  network_hash text not null,
  attempted_at timestamp with time zone not null
    default timezone('utc'::text, now()),
  success boolean not null default false,

  constraint invite_login_attempts_pkey primary key (id),
  constraint invite_login_attempts_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade
);

create index if not exists invite_login_attempts_user_recent_idx
  on public.invite_login_attempts (user_id, attempted_at desc)
  where success is false;

create index if not exists invite_login_attempts_network_recent_idx
  on public.invite_login_attempts (network_hash, attempted_at desc)
  where success is false;

alter table public.invite_login_attempts enable row level security;

revoke all on table public.invite_login_attempts from anon, authenticated;
revoke all on sequence public.invite_login_attempts_id_seq
  from anon, authenticated;

grant select, insert, update, delete
  on table public.invite_login_attempts
  to service_role;

grant usage, select
  on sequence public.invite_login_attempts_id_seq
  to service_role;

grant select, update
  on table public.guests
  to service_role;

comment on table public.invite_login_attempts is
  'Internal audit and rate-limit records for invite code validation.';

create or replace function public.register_guest_access(target_guest_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guests
  set
    access_count = coalesce(access_count, 0) + 1,
    last_access = timezone('utc'::text, now())
  where id = target_guest_id
    and active is true;
$$;

revoke all on function public.register_guest_access(uuid) from public;
revoke all on function public.register_guest_access(uuid) from anon;
revoke all on function public.register_guest_access(uuid) from authenticated;
grant execute on function public.register_guest_access(uuid) to service_role;

commit;
