# Modelagem Do Banco De Dados

O projeto utiliza PostgreSQL no Supabase.

## Relacionamentos

```text
guests 1:N rsvps
guests 1:N gifts
gifts 1:N gift_contributions
settings 1:1 configuração global usada pelo frontend
auth.users 1:0..1 admin_users
guests 1:0..1 admin_users
auth.users 1:0..1 guest_access_sessions
guests 1:N guest_access_sessions
```

## Tabela `guests`

Responsável por convidados, códigos de acesso e permissões administrativas.

```sql
create table public.guests (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc', now()),
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
```

Campos principais:

- `name`: nome principal do convite.
- `invite_code`: código usado no login.
- `max_guests`: limite de acompanhantes.
- `confirmed`: indica se já existe RSVP confirmado/registrado.
- `active`: convidados inativos não acessam e não entram nas métricas.
- `access_count`: quantidade de acessos.
- `last_access`: último acesso.
- `is_admin`: libera acesso ao painel administrativo.
- `invite_type`: `individual` ou `couple`.
- `couple_members`: membros do casal em JSON.

## Tabela `rsvps`

Armazena confirmações de presença.

```sql
create table public.rsvps (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc', now()),
  guest_id uuid null,
  presence text null,
  food text null,
  message text null,
  guest_data jsonb null,
  email text null,
  phone text null,
  updated_at timestamp with time zone null default timezone('utc', now()),

  constraint rsvps_pkey primary key (id),

  constraint rsvps_guest_id_fkey
    foreign key (guest_id)
    references guests (id)
    on delete cascade
);
```

Campos principais:

- `guest_id`: referência `guests.id`.
- `presence`: `Sim` ou `Não`.
- `food`: restrições alimentares.
- `message`: mensagem aos noivos.
- `email`: e-mail informado.
- `phone`: telefone informado.
- `guest_data`: snapshot JSON completo do RSVP.
- `updated_at`: última alteração.

## Tabela `gifts`

Responsável pela lista de presentes, reservas e forma escolhida para presentear.

```sql
create table public.gifts (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc', now()),
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
  external_purchase_options jsonb null default '[]',
  selected_purchase_method text null,
  selected_purchase_details jsonb null,
  gift_type text null default 'single',
  quota_count integer null,
  quota_value numeric null,

  constraint gifts_pkey primary key (id),

  constraint gifts_reserved_guest_id_fkey
    foreign key (reserved_guest_id)
    references guests(id)
    on delete set null
);
```

Campos principais:

- `category`: categoria do presente.
- `name`: nome do presente.
- `description`: descrição.
- `price`: valor de referência. É obrigatório para presentes financeiros (`money`), híbridos (`hybrid`) e por cotas (`quota`). Pode ser `null` em presentes exclusivamente externos (`external`).
- `image_url`: imagem.
- `status`: `Disponível`, `Parcial`, `Reservado` ou `Comprado`.
- `reserved_guest_id`: convidado que reservou.
- `reserved_name`: nome exibido da reserva.
- `reservation_message`: mensagem do convidado.
- `payment_status`: `Pendente`, `Informado`, `Confirmado`, `Parcialmente informado` ou `Parcialmente confirmado`.
- `payment_reported_at`: quando o convidado informou pagamento/compra.
- `card_payment_url`: URL externa para checkout de pagamento por cartão.
- `card_payment_provider`: provedor do link de cartão, quando aplicável.
- `card_payment_reference`: referência externa do pagamento, quando aplicável.
- `purchase_mode`: `money`, `external` ou `hybrid`.
- `external_purchase_options`: opções de compra online/loja física.
- `selected_purchase_method`: `pix`, `card`, `online` ou `physical`.
- `selected_purchase_details`: detalhes da opção escolhida.
- `gift_type`: `single` para presente individual ou `quota` para presente por cotas.
- `quota_count`: quantidade total de cotas do presente.
- `quota_value`: valor unitário calculado para cada cota.

## Tabela `gift_contributions`

Registra contribuições feitas por convidados em presentes por cotas.

```sql
create table public.gift_contributions (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default timezone('utc', now()),
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
    references gifts(id)
    on delete cascade,

  constraint gift_contributions_guest_id_fkey
    foreign key (guest_id)
    references guests(id)
    on delete set null
);
```

Campos principais:

- `gift_id`: presente por cotas relacionado.
- `guest_id`: convidado que fez a contribuição.
- `contributor_name`: nome exibido da contribuição.
- `message`: mensagem opcional para os noivos.
- `quota_quantity`: quantidade de cotas reservadas.
- `quota_value`: valor de cada cota no momento da contribuição.
- `total_value`: valor total do PIX.
- `payment_status`: `Pendente`, `Informado` ou `Confirmado`.
- `payment_method`: nesta fase, `pix`.
- `payment_reported_at`: quando o convidado informou o pagamento.
- `pix_code` e `pix_qr_code_url`: campos disponíveis no schema, mas atualmente o frontend gera PIX e QR Code em tempo de exibição.

## Tabela `settings`

Configurações globais usadas pelo site.

```sql
create table public.settings (
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
```

Campos principais:

- `pix_key`: chave PIX.
- `whatsapp_number`: número para envio de comprovantes.
- `merchant_name`: nome usado no payload PIX.
- `merchant_city`: cidade usada no payload PIX.
- `buffet_paying_age`: idade mínima em que uma criança entra na contagem de pagantes. O padrão `7` significa que crianças de até 6 anos não pagam.

As métricas do buffet interpretam a idade armazenada em
`rsvps.guest_data.companions[].age`. Crianças sem idade reconhecível ficam em
uma categoria separada e não entram automaticamente como pagantes ou não
pagantes.

## Tabela `admin_users`

Relaciona uma conta do Supabase Auth a um convidado administrador.

```sql
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guest_id uuid not null unique references public.guests(id) on delete restrict,
  active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now())
);
```

O login administrativo usa e-mail e senha pelo Supabase Auth. O código de
convite do mesmo usuário continua concedendo somente acesso de convidado.

## Tabela `guest_access_sessions`

Relaciona uma sessão autenticada anônima ao convite validado pela futura Edge
Function.

```sql
create table public.guest_access_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc', now()),
  last_access timestamp with time zone not null default timezone('utc', now()),
  revoked_at timestamp with time zone null
);
```

Cada sessão pertence a um único convite. Um convite pode possuir sessões em
mais de um dispositivo, e cada uma pode ser revogada individualmente.

## Funções De Autorização

- `current_guest_id()`: retorna o convidado ativo relacionado à sessão atual.
- `is_admin()`: informa se a conta autenticada é um administrador ativo.

As funções serão usadas pelas políticas RLS. As tabelas de vínculo não possuem
acesso direto para `anon` ou `authenticated`.

`current_guest_id()` também reconhece o `guest_id` de `admin_users`. Assim, o
login administrativo concede as permissões de administrador e preserva o
acesso do próprio convidado.

## Regras De Banco

### Exclusão De Convidado Com RSVP

RSVPs são removidos automaticamente:

```sql
on delete cascade
```

### Exclusão De Convidado Com Reserva

Reservas permanecem, mas o convidado é desvinculado:

```sql
on delete set null
```

## Status Usados

RSVP:

```text
Sim
Não
```

Presentes:

```text
Disponível
Parcial
Reservado
Comprado
```

Pagamento:

```text
Pendente
Informado
Confirmado
Parcialmente informado
Parcialmente confirmado
```

Modo de compra:

```text
money
external
hybrid
```

Forma escolhida:

```text
pix
card
online
physical
```

## Observações

- O frontend ainda acessa diretamente o Supabase.
- O painel administrativo depende de `guests.is_admin`.
- RLS deve ser configurada antes de um ambiente público definitivo.
- Enquanto o projeto usa acesso direto pelo frontend, `gift_contributions` precisa estar com RLS desativada ou com políticas equivalentes às demais tabelas públicas do projeto.
- O status `Parcial` é usado em presentes por cotas quando há cotas reservadas, mas o presente ainda não foi totalmente reservado.
- Os status `Parcialmente informado` e `Parcialmente confirmado` são derivados das contribuições por cota e sincronizados em `gifts.payment_status`.
