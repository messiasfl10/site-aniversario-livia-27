-- Aniversário da Livia — instalação completa e idempotente
create extension if not exists pgcrypto;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  invite_code text not null unique,
  max_guests integer not null default 0 check (max_guests >= 0),
  confirmed boolean not null default false,
  active boolean not null default true,
  access_count integer not null default 0,
  last_access timestamptz,
  invite_type text not null default 'individual' check (invite_type in ('individual','couple')),
  couple_members jsonb,
  constraint couple_members_array check (couple_members is null or jsonb_typeof(couple_members) = 'array')
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  presence text not null check (presence in ('Sim','Não')),
  food text,
  message text,
  guest_data jsonb not null default '{}'::jsonb,
  email text,
  phone text
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  buffet_paying_age integer not null default 7 check (buffet_paying_age between 1 and 18)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_access_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_access timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.invite_login_attempts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  network_hash text,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists invite_attempts_user_time_idx on public.invite_login_attempts(user_id, attempted_at desc);
create index if not exists invite_attempts_network_time_idx on public.invite_login_attempts(network_hash, attempted_at desc);

insert into public.settings (buffet_paying_age)
select 7 where not exists (select 1 from public.settings);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid() and active); $$;

create or replace function public.register_guest_access(target_guest_id uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin
  update public.guests set access_count = access_count + 1, last_access = now() where id = target_guest_id and active;
  if not found then raise exception 'Convite inválido ou inativo'; end if;
end; $$;

create or replace function public.current_guest_id()
returns uuid language sql stable security definer set search_path = public
as $$ select guest_id from public.guest_access_sessions where user_id = auth.uid() and revoked_at is null; $$;

create or replace function public.get_current_guest_profile()
returns table(id uuid, name text, max_guests integer, confirmed boolean, active boolean, invite_type text, couple_members jsonb)
language sql stable security definer set search_path = public
as $$
  select g.id,g.name,g.max_guests,g.confirmed,g.active,g.invite_type,g.couple_members
  from public.guests g where g.id = public.current_guest_id() and g.active;
$$;

create or replace function public.save_current_rsvp(submitted_email text, submitted_food text, submitted_guest_data jsonb, submitted_message text, submitted_phone text, submitted_presence text)
returns setof public.rsvps language plpgsql security definer set search_path = public
as $$
declare gid uuid := public.current_guest_id();
begin
  if gid is null then raise exception 'Sessão de convite inválida'; end if;
  if submitted_presence not in ('Sim','Não') then raise exception 'Presença inválida'; end if;
  insert into public.rsvps(guest_id,presence,food,message,guest_data,email,phone)
  values(gid,submitted_presence,submitted_food,submitted_message,coalesce(submitted_guest_data,'{}'::jsonb),submitted_email,submitted_phone)
  on conflict(guest_id) do update set presence=excluded.presence,food=excluded.food,message=excluded.message,guest_data=excluded.guest_data,email=excluded.email,phone=excluded.phone,updated_at=now();
  update public.guests set confirmed = true where id = gid;
  return query select * from public.rsvps where guest_id = gid;
end; $$;

alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.guest_access_sessions enable row level security;
alter table public.invite_login_attempts enable row level security;

drop policy if exists guests_admin_all on public.guests;
create policy guests_admin_all on public.guests for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists rsvps_admin_all on public.rsvps;
create policy rsvps_admin_all on public.rsvps for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists rsvps_guest_select on public.rsvps;
create policy rsvps_guest_select on public.rsvps for select to authenticated using(guest_id = public.current_guest_id());
drop policy if exists settings_authenticated_select on public.settings;
create policy settings_authenticated_select on public.settings for select to authenticated using(true);
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all to authenticated using(public.is_admin()) with check(public.is_admin());

revoke all on all tables in schema public from anon;
revoke all on public.guests,public.rsvps,public.admin_users,public.guest_access_sessions,public.invite_login_attempts from authenticated;
grant select,insert,update,delete on public.guests,public.rsvps to authenticated;
grant select,insert,update on public.settings to authenticated;
revoke all on function public.register_guest_access(uuid) from public,anon,authenticated;
grant execute on function public.register_guest_access(uuid) to service_role;
grant execute on function public.is_admin(),public.current_guest_id(),public.get_current_guest_profile(),public.save_current_rsvp(text,text,jsonb,text,text,text) to authenticated;

-- Depois de criar o usuário no Supabase Auth:
-- insert into public.admin_users(user_id) values ('UUID-DO-USUARIO');
