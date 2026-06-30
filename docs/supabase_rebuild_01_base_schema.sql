-- ============================================================
-- Supabase rebuild: base application schema
-- Site de Casamento - Livia & Messias
-- ============================================================
--
-- Run this first on a new Supabase project.
-- Security tables, functions, policies and grants are added by later scripts.

begin;

create extension if not exists pgcrypto;

create table if not exists public.guests (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  name text not null,
  invite_code text not null,
  max_guests integer null default 0,
  confirmed boolean null default false,
  active boolean null default true,
  access_count integer null default 0,
  last_access timestamp with time zone null,
  is_admin boolean null default false,
  invite_type text null default 'individual',
  couple_members jsonb null,

  constraint guests_pkey primary key (id),
  constraint guests_invite_code_key unique (invite_code)
);

create table if not exists public.rsvps (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  guest_id uuid null,
  presence text null,
  food text null,
  message text null,
  guest_data jsonb null,
  email text null,
  phone text null,
  updated_at timestamp with time zone null default timezone('utc'::text, now()),

  constraint rsvps_pkey primary key (id),
  constraint rsvps_guest_id_fkey
    foreign key (guest_id)
    references public.guests(id)
    on delete cascade
);

create table if not exists public.gifts (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  category text not null,
  name text not null,
  description text null,
  price numeric null,
  image_url text null,
  status text null default 'Disponível',
  reserved_at timestamp with time zone null,
  reserved_name text null,
  reservation_message text null,
  reserved_guest_id uuid null,
  payment_status text null default 'Pendente',
  payment_reported_at timestamp with time zone null,
  card_payment_url text null,
  card_payment_provider text null,
  card_payment_reference text null,
  purchase_mode text null default 'money',
  external_purchase_options jsonb null default '[]'::jsonb,
  selected_purchase_method text null,
  selected_purchase_details jsonb null,
  gift_type text null default 'single',
  quota_count integer null,
  quota_value numeric null,

  constraint gifts_pkey primary key (id),
  constraint gifts_reserved_guest_id_fkey
    foreign key (reserved_guest_id)
    references public.guests(id)
    on delete set null
);

create table if not exists public.gift_contributions (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  gift_id uuid not null,
  guest_id uuid null,
  contributor_name text null,
  message text null,
  quota_quantity integer not null default 1,
  quota_value numeric not null,
  total_value numeric not null,
  payment_status text null default 'Pendente',
  payment_method text null default 'pix',
  payment_reported_at timestamp with time zone null,
  pix_code text null,
  pix_qr_code_url text null,

  constraint gift_contributions_pkey primary key (id),
  constraint gift_contributions_gift_id_fkey
    foreign key (gift_id)
    references public.gifts(id)
    on delete cascade,
  constraint gift_contributions_guest_id_fkey
    foreign key (guest_id)
    references public.guests(id)
    on delete set null,
  constraint gift_contributions_quota_quantity_check
    check (quota_quantity > 0)
);

create table if not exists public.settings (
  id uuid not null default gen_random_uuid(),
  pix_key text null,
  whatsapp_number text null,
  merchant_name text null,
  merchant_city text null,
  buffet_paying_age integer not null default 7,

  constraint settings_pkey primary key (id),
  constraint settings_buffet_paying_age_check
    check (buffet_paying_age between 1 and 18)
);

-- Do not expose the tables before the final RLS policies are installed.
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_contributions enable row level security;
alter table public.settings enable row level security;

revoke all on table public.guests from anon, authenticated;
revoke all on table public.rsvps from anon, authenticated;
revoke all on table public.gifts from anon, authenticated;
revoke all on table public.gift_contributions from anon, authenticated;
revoke all on table public.settings from anon, authenticated;

commit;
