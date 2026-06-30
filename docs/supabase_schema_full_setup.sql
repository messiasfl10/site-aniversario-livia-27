-- ============================================================
-- Supabase schema setup
-- Site de Casamento - Livia & Messias
-- ============================================================
--
-- LEGADO: este arquivo representa o acesso público usado antes da migração
-- de segurança. Não o execute em uma reconstrução da versão 3.0.
-- Use docs/supabase_rebuild_runbook.md.
--
-- Use este arquivo em um projeto Supabase novo para recriar o
-- schema atual usado pelo site, pelo RSVP e pelo painel admin.
--
-- Importante:
-- O projeto atual acessa o Supabase diretamente pelo frontend.
-- Por isso, este script desabilita RLS nas tabelas e concede
-- permissões para anon/authenticated. Isso simplifica o uso do
-- projeto, mas não é o modelo recomendado para produção pública.
-- Antes de expor dados sensíveis, considere implementar Supabase
-- Auth, RLS e/ou Edge Functions.

begin;

-- ============================================================
-- Extensões
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Tabela: guests
-- ============================================================

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

-- ============================================================
-- Tabela: rsvps
-- ============================================================

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

-- ============================================================
-- Tabela: gifts
-- ============================================================

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

-- ============================================================
-- Tabela: gift_contributions
-- ============================================================

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

-- ============================================================
-- Tabela: settings
-- ============================================================

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

-- ============================================================
-- RLS e permissões
-- ============================================================
--
-- O Supabase costuma habilitar RLS por padrão em alguns fluxos.
-- Como este projeto usa a anon key diretamente no frontend, as
-- tabelas precisam estar acessíveis para anon/authenticated.

alter table public.guests disable row level security;
alter table public.rsvps disable row level security;
alter table public.gifts disable row level security;
alter table public.gift_contributions disable row level security;
alter table public.settings disable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.guests to anon, authenticated;
grant select, insert, update, delete on public.rsvps to anon, authenticated;
grant select, insert, update, delete on public.gifts to anon, authenticated;
grant select, insert, update, delete on public.gift_contributions to anon, authenticated;
grant select, insert, update, delete on public.settings to anon, authenticated;

-- Para tabelas com uuid default via gen_random_uuid(), não há sequence
-- própria a liberar. O grant abaixo é mantido como segurança caso novas
-- sequences sejam adicionadas ao schema public no futuro.
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================
-- Registro inicial opcional de settings
-- ============================================================
--
-- Descomente e ajuste se quiser criar uma configuração inicial:
--
-- insert into public.settings (
--   pix_key,
--   whatsapp_number,
--   merchant_name,
--   merchant_city,
--   buffet_paying_age
-- )
-- values (
--   'sua-chave-pix',
--   '5585999999999',
--   'LIVIA MESSIAS',
--   'FORTALEZA',
--   7
-- );

commit;
