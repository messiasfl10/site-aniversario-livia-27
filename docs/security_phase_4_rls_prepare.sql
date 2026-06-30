-- ============================================================
-- Security phase 4: RLS policies and safe guest operations
-- ============================================================
--
-- This script creates policies, triggers and RPCs, but intentionally does not
-- enable RLS on the existing application tables. Run the activation script
-- only after the public frontend has been migrated to Supabase Auth.

begin;

-- ============================================================
-- Safe current guest profile
-- ============================================================

create or replace function public.get_current_guest_profile()
returns table (
  id uuid,
  name text,
  max_guests integer,
  confirmed boolean,
  active boolean,
  invite_type text,
  couple_members jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    guest.id,
    guest.name,
    guest.max_guests,
    guest.confirmed,
    guest.active,
    guest.invite_type,
    guest.couple_members
  from public.guests as guest
  where guest.id = public.current_guest_id()
    and guest.active is true
  limit 1;
$$;

revoke all on function public.get_current_guest_profile() from public, anon;
grant execute on function public.get_current_guest_profile() to authenticated;

-- ============================================================
-- Safe gift catalog
-- ============================================================

create or replace function public.get_gift_catalog()
returns table (
  id uuid,
  created_at timestamp with time zone,
  category text,
  name text,
  description text,
  price numeric,
  image_url text,
  status text,
  reserved_at timestamp with time zone,
  reserved_name text,
  reservation_message text,
  reserved_guest_id uuid,
  payment_status text,
  payment_reported_at timestamp with time zone,
  card_payment_url text,
  purchase_mode text,
  external_purchase_options jsonb,
  selected_purchase_method text,
  selected_purchase_details jsonb,
  gift_type text,
  quota_count integer,
  quota_value numeric,
  quota_reserved_count bigint,
  quota_confirmed_count bigint,
  own_contributions jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_access as (
    select public.current_guest_id() as guest_id
  )
  select
    gift.id,
    gift.created_at,
    gift.category,
    gift.name,
    gift.description,
    gift.price,
    gift.image_url,
    gift.status,
    case
      when gift.reserved_guest_id = access.guest_id then gift.reserved_at
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id then gift.reserved_name
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id
        then gift.reservation_message
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id
        then gift.reserved_guest_id
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id
        or gift.gift_type = 'quota'
        then gift.payment_status
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id
        then gift.payment_reported_at
      else null
    end,
    gift.card_payment_url,
    gift.purchase_mode,
    gift.external_purchase_options,
    case
      when gift.reserved_guest_id = access.guest_id
        then gift.selected_purchase_method
      else null
    end,
    case
      when gift.reserved_guest_id = access.guest_id
        then gift.selected_purchase_details
      else null
    end,
    gift.gift_type,
    gift.quota_count,
    gift.quota_value,
    coalesce(contribution_totals.reserved_count, 0),
    coalesce(contribution_totals.confirmed_count, 0),
    coalesce(own_contributions.items, '[]'::jsonb)
  from public.gifts as gift
  cross join current_access as access
  left join lateral (
    select
      coalesce(sum(contribution.quota_quantity), 0)::bigint as reserved_count,
      coalesce(
        sum(contribution.quota_quantity)
          filter (where contribution.payment_status = 'Confirmado'),
        0
      )::bigint as confirmed_count
    from public.gift_contributions as contribution
    where contribution.gift_id = gift.id
  ) as contribution_totals on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', contribution.id,
        'gift_id', contribution.gift_id,
        'guest_id', contribution.guest_id,
        'contributor_name', contribution.contributor_name,
        'message', contribution.message,
        'quota_quantity', contribution.quota_quantity,
        'quota_value', contribution.quota_value,
        'total_value', contribution.total_value,
        'payment_status', contribution.payment_status,
        'payment_method', contribution.payment_method,
        'payment_reported_at', contribution.payment_reported_at,
        'created_at', contribution.created_at
      )
      order by contribution.created_at
    ) as items
    from public.gift_contributions as contribution
    where contribution.gift_id = gift.id
      and contribution.guest_id = access.guest_id
  ) as own_contributions on true
  where access.guest_id is not null
  order by gift.category, gift.name;
$$;

revoke all on function public.get_gift_catalog() from public, anon;
grant execute on function public.get_gift_catalog() to authenticated;

-- ============================================================
-- RSVP synchronization
-- ============================================================

create or replace function public.sync_guest_confirmation_from_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_guest_id uuid;
begin
  if tg_op = 'UPDATE' and old.guest_id is distinct from new.guest_id then
    update public.guests
    set confirmed = exists (
      select 1
      from public.rsvps
      where guest_id = old.guest_id
    )
    where id = old.guest_id;
  end if;

  affected_guest_id := case
    when tg_op = 'DELETE' then old.guest_id
    else new.guest_id
  end;

  update public.guests
  set confirmed = exists (
    select 1
    from public.rsvps
    where guest_id = affected_guest_id
  )
  where id = affected_guest_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_guest_confirmation_after_rsvp
  on public.rsvps;

create trigger sync_guest_confirmation_after_rsvp
after insert or update or delete on public.rsvps
for each row execute function public.sync_guest_confirmation_from_rsvp();

revoke all on function public.sync_guest_confirmation_from_rsvp()
  from public, anon, authenticated;

-- ============================================================
-- Safe RSVP write
-- ============================================================

do $$
begin
  if exists (
    select guest_id
    from public.rsvps
    where guest_id is not null
    group by guest_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate RSVP rows found. Merge duplicates before preparing RLS.';
  end if;
end;
$$;

create unique index if not exists rsvps_guest_id_key
  on public.rsvps (guest_id)
  where guest_id is not null;

create or replace function public.save_current_rsvp(
  submitted_presence text,
  submitted_email text,
  submitted_phone text,
  submitted_food text,
  submitted_message text,
  submitted_guest_data jsonb
)
returns setof public.rsvps
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  guest_record public.guests%rowtype;
  safe_guest_data jsonb;
  requested_guest_count integer;
  companion_count integer;
begin
  current_guest := public.current_guest_id();

  if current_guest is null
    or submitted_presence not in ('Sim', 'Não')
    or jsonb_typeof(coalesce(submitted_guest_data, '{}'::jsonb)) <> 'object'
  then
    return;
  end if;

  select *
  into guest_record
  from public.guests
  where id = current_guest
    and active is true;

  if not found then
    return;
  end if;

  begin
    requested_guest_count := coalesce(
      nullif(submitted_guest_data->>'guest_count', '')::integer,
      0
    );
  exception
    when invalid_text_representation then
      return;
  end;

  companion_count := case
    when jsonb_typeof(submitted_guest_data->'companions') = 'array'
      then jsonb_array_length(submitted_guest_data->'companions')
    else 0
  end;

  if requested_guest_count < 0
    or requested_guest_count > coalesce(guest_record.max_guests, 0)
    or companion_count <> requested_guest_count
    or (submitted_presence = 'Não' and requested_guest_count <> 0)
  then
    return;
  end if;

  safe_guest_data := jsonb_set(
    coalesce(submitted_guest_data, '{}'::jsonb),
    '{name}',
    to_jsonb(guest_record.name),
    true
  );

  return query
  insert into public.rsvps (
    guest_id,
    presence,
    email,
    phone,
    food,
    message,
    guest_data,
    updated_at
  )
  values (
    current_guest,
    submitted_presence,
    left(coalesce(submitted_email, ''), 320),
    left(coalesce(submitted_phone, ''), 40),
    left(coalesce(submitted_food, ''), 1000),
    left(coalesce(submitted_message, ''), 4000),
    safe_guest_data,
    timezone('utc'::text, now())
  )
  on conflict (guest_id) where guest_id is not null
  do update set
    presence = excluded.presence,
    email = excluded.email,
    phone = excluded.phone,
    food = excluded.food,
    message = excluded.message,
    guest_data = excluded.guest_data,
    updated_at = excluded.updated_at
  returning *;
end;
$$;

revoke all on function public.save_current_rsvp(
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon;
grant execute on function public.save_current_rsvp(
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

-- ============================================================
-- Quota status synchronization
-- ============================================================

create or replace function public.recalculate_quota_gift_status(
  target_gift_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_quotas integer;
  reserved_quotas integer;
  confirmed_quotas integer;
  informed_quotas integer;
  next_status text;
  next_payment_status text;
begin
  select quota_count
  into total_quotas
  from public.gifts
  where id = target_gift_id
    and gift_type = 'quota';

  if not found then
    return;
  end if;

  select
    coalesce(sum(quota_quantity), 0)::integer,
    coalesce(
      sum(quota_quantity) filter (where payment_status = 'Confirmado'),
      0
    )::integer,
    coalesce(
      sum(quota_quantity) filter (where payment_status = 'Informado'),
      0
    )::integer
  into reserved_quotas, confirmed_quotas, informed_quotas
  from public.gift_contributions
  where gift_id = target_gift_id;

  next_status := 'Disponível';
  next_payment_status := null;

  if total_quotas > 0 and confirmed_quotas >= total_quotas then
    next_status := 'Comprado';
    next_payment_status := 'Confirmado';
  elsif total_quotas > 0 and reserved_quotas >= total_quotas then
    next_status := 'Reservado';
    next_payment_status := case
      when confirmed_quotas > 0 then 'Parcialmente confirmado'
      when informed_quotas > 0 then 'Parcialmente informado'
      else 'Pendente'
    end;
  elsif reserved_quotas > 0 then
    next_status := 'Parcial';
    next_payment_status := case
      when confirmed_quotas > 0 then 'Parcialmente confirmado'
      when informed_quotas > 0 then 'Parcialmente informado'
      else 'Pendente'
    end;
  end if;

  update public.gifts
  set
    status = next_status,
    payment_status = next_payment_status
  where id = target_gift_id;
end;
$$;

revoke all on function public.recalculate_quota_gift_status(uuid)
  from public, anon, authenticated;
grant execute on function public.recalculate_quota_gift_status(uuid)
  to service_role;

create or replace function public.sync_quota_gift_from_contribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_quota_gift_status(old.gift_id);
    return old;
  end if;

  perform public.recalculate_quota_gift_status(new.gift_id);

  if tg_op = 'UPDATE' and old.gift_id is distinct from new.gift_id then
    perform public.recalculate_quota_gift_status(old.gift_id);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_quota_gift_after_contribution
  on public.gift_contributions;

create trigger sync_quota_gift_after_contribution
after insert or update or delete on public.gift_contributions
for each row execute function public.sync_quota_gift_from_contribution();

revoke all on function public.sync_quota_gift_from_contribution()
  from public, anon, authenticated;

create or replace function public.sync_quota_gift_after_definition_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalculate_quota_gift_status(new.id);
  return new;
end;
$$;

drop trigger if exists sync_quota_gift_after_definition_change
  on public.gifts;

create trigger sync_quota_gift_after_definition_change
after update of quota_count, gift_type on public.gifts
for each row
when (
  old.quota_count is distinct from new.quota_count
  or old.gift_type is distinct from new.gift_type
)
execute function public.sync_quota_gift_after_definition_change();

revoke all on function public.sync_quota_gift_after_definition_change()
  from public, anon, authenticated;

-- ============================================================
-- Guest gift operations
-- ============================================================

create or replace function public.reserve_gift(
  target_gift_id uuid,
  reservation_message text default null
)
returns setof public.gifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  current_guest_name text;
begin
  current_guest := public.current_guest_id();

  if current_guest is null then
    raise exception 'Unauthorized';
  end if;

  select name
  into current_guest_name
  from public.guests
  where id = current_guest
    and active is true;

  if not found then
    return;
  end if;

  return query
  update public.gifts
  set
    status = 'Reservado',
    reserved_guest_id = current_guest,
    reserved_name = current_guest_name,
    reservation_message = left(coalesce($2, ''), 2000),
    reserved_at = timezone('utc'::text, now()),
    payment_status = 'Pendente',
    payment_reported_at = null,
    selected_purchase_method = null,
    selected_purchase_details = null
  where id = target_gift_id
    and coalesce(gift_type, 'single') <> 'quota'
    and reserved_guest_id is null
    and status = 'Disponível'
  returning *;
end;
$$;

revoke all on function public.reserve_gift(uuid, text)
  from public, anon;
grant execute on function public.reserve_gift(uuid, text)
  to authenticated;

create or replace function public.set_gift_purchase_method(
  target_gift_id uuid,
  purchase_method text,
  purchase_details jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  gift_record public.gifts%rowtype;
  safe_purchase_details jsonb;
  updated_count integer;
begin
  current_guest := public.current_guest_id();

  if current_guest is null
    or $2 not in ('pix', 'card', 'online', 'physical') then
    return false;
  end if;

  select *
  into gift_record
  from public.gifts
  where id = target_gift_id
    and reserved_guest_id = current_guest
    and coalesce(gift_type, 'single') <> 'quota'
  for update;

  if not found then
    return false;
  end if;

  if $2 = 'pix' then
    safe_purchase_details := jsonb_build_object('type', 'pix');
  elsif $2 = 'card' then
    if nullif(gift_record.card_payment_url, '') is null then
      return false;
    end if;

    safe_purchase_details := jsonb_build_object(
      'type',
      'card',
      'url',
      gift_record.card_payment_url
    );
  elsif $3 is null then
    safe_purchase_details := null;
  elsif not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(gift_record.external_purchase_options) = 'array'
          then gift_record.external_purchase_options
        else '[]'::jsonb
      end
    ) as option
    where option = $3
      and option->>'type' = $2
  ) then
    return false;
  else
    safe_purchase_details := $3;
  end if;

  update public.gifts
  set
    selected_purchase_method = $2,
    selected_purchase_details = safe_purchase_details
  where id = target_gift_id
    and reserved_guest_id = current_guest
    and coalesce(gift_type, 'single') <> 'quota';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.set_gift_purchase_method(uuid, text, jsonb)
  from public, anon;
grant execute on function public.set_gift_purchase_method(uuid, text, jsonb)
  to authenticated;

create or replace function public.report_gift_payment(target_gift_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  updated_count integer;
begin
  current_guest := public.current_guest_id();

  if current_guest is null then
    return false;
  end if;

  update public.gifts
  set
    payment_status = 'Informado',
    payment_reported_at = timezone('utc'::text, now()),
    selected_purchase_method = coalesce(selected_purchase_method, 'pix')
  where id = target_gift_id
    and reserved_guest_id = current_guest
    and coalesce(gift_type, 'single') <> 'quota'
    and coalesce(payment_status, 'Pendente') <> 'Confirmado';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.report_gift_payment(uuid) from public, anon;
grant execute on function public.report_gift_payment(uuid) to authenticated;

create or replace function public.reserve_gift_quotas(
  target_gift_id uuid,
  contribution_message text,
  requested_quantity integer
)
returns setof public.gift_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  current_guest_name text;
  gift_record public.gifts%rowtype;
  reserved_quantity integer;
  available_quantity integer;
  effective_quota_value numeric;
begin
  current_guest := public.current_guest_id();

  if current_guest is null or requested_quantity <= 0 then
    return;
  end if;

  select name
  into current_guest_name
  from public.guests
  where id = current_guest
    and active is true;

  if not found then
    return;
  end if;

  select *
  into gift_record
  from public.gifts
  where id = target_gift_id
    and gift_type = 'quota'
  for update;

  if not found or coalesce(gift_record.quota_count, 0) <= 0 then
    return;
  end if;

  select coalesce(sum(quota_quantity), 0)::integer
  into reserved_quantity
  from public.gift_contributions
  where gift_id = target_gift_id;

  available_quantity := gift_record.quota_count - reserved_quantity;

  if available_quantity < requested_quantity then
    return;
  end if;

  effective_quota_value := coalesce(
    nullif(gift_record.quota_value, 0),
    gift_record.price / nullif(gift_record.quota_count, 0)
  );

  if effective_quota_value is null or effective_quota_value <= 0 then
    return;
  end if;

  return query
  insert into public.gift_contributions (
    gift_id,
    guest_id,
    contributor_name,
    message,
    quota_quantity,
    quota_value,
    total_value,
    payment_status,
    payment_method
  )
  values (
    target_gift_id,
    current_guest,
    left(current_guest_name, 200),
    left(coalesce(contribution_message, ''), 2000),
    requested_quantity,
    effective_quota_value,
    requested_quantity * effective_quota_value,
    'Pendente',
    'pix'
  )
  returning *;
end;
$$;

revoke all on function public.reserve_gift_quotas(
  uuid,
  text,
  integer
) from public, anon;
grant execute on function public.reserve_gift_quotas(
  uuid,
  text,
  integer
) to authenticated;

create or replace function public.report_gift_contribution_payment(
  target_contribution_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_guest uuid;
  updated_count integer;
begin
  current_guest := public.current_guest_id();

  if current_guest is null then
    return false;
  end if;

  update public.gift_contributions
  set
    payment_status = 'Informado',
    payment_reported_at = timezone('utc'::text, now())
  where id = target_contribution_id
    and guest_id = current_guest
    and coalesce(payment_status, 'Pendente') <> 'Confirmado';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.report_gift_contribution_payment(uuid)
  from public, anon;
grant execute on function public.report_gift_contribution_payment(uuid)
  to authenticated;

-- ============================================================
-- RLS policies (created now, enforced only after activation)
-- ============================================================

drop policy if exists guests_admin_all on public.guests;
create policy guests_admin_all
on public.guests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists guests_select_own on public.guests;
create policy guests_select_own
on public.guests
for select
to authenticated
using (id = public.current_guest_id());

drop policy if exists rsvps_admin_all on public.rsvps;
create policy rsvps_admin_all
on public.rsvps
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists rsvps_select_own on public.rsvps;
create policy rsvps_select_own
on public.rsvps
for select
to authenticated
using (guest_id = public.current_guest_id());

drop policy if exists gifts_admin_all on public.gifts;
create policy gifts_admin_all
on public.gifts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists gifts_select_accessible on public.gifts;
create policy gifts_select_accessible
on public.gifts
for select
to authenticated
using (
  reserved_guest_id = public.current_guest_id()
);

drop policy if exists gift_contributions_admin_all
  on public.gift_contributions;
create policy gift_contributions_admin_all
on public.gift_contributions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists gift_contributions_select_own
  on public.gift_contributions;
create policy gift_contributions_select_own
on public.gift_contributions
for select
to authenticated
using (guest_id = public.current_guest_id());

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all
on public.settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists settings_select_authenticated on public.settings;
create policy settings_select_authenticated
on public.settings
for select
to authenticated
using (public.current_guest_id() is not null or public.is_admin());

commit;
